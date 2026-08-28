import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { icerikBeyanaUyuyorMu } from "@/lib/dosya-imza";

export const dynamic = "force-dynamic";

// Yükleme sınırları — istemcideki kontrolün aynısı, sunucuda tekrar edilir.
const MAX_FOTO_BYTE = 10 * 1024 * 1024;
const MAX_VIDEO_BYTE = 20 * 1024 * 1024;
const MAX_DOSYA = 6;

/**
 * Tek istekte kabul edilen TOPLAM boyut.
 *
 * Dosya başına sınır tek başına yetmiyordu: 6 × 100 MB = 600 MB'lık bir
 * istek, her dosya kendi sınırının altında olduğu için geçiyordu ve
 * `arrayBuffer()` her birini baştan sona belleğe açıyordu. Saatte 60
 * isteklik hız sınırıyla bu, süreci düşürmenin ucuz bir yoluydu.
 *
 * Tavan `next.config.ts` içindeki `proxyClientMaxBodySize` ile hizalı
 * olmalı: proxy varken Next gövdeyi ayrıca bellekte tamponluyor ve o
 * tavanı aşan gövdeyi SESSİZCE kırpıyor — sonuç, kullanıcının anlamadığı
 * bir "geçersiz form verisi" hatası oluyordu.
 */
const MAX_TOPLAM_BYTE = 24 * 1024 * 1024;

/** İzin verilen MIME → uzantı. Beyaz liste; başka hiçbir tür kabul edilmez. */
const IZINLI: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const HEDEF = path.join(process.cwd(), "public", "yuklemeler");

// ── Görsel normalleştirme ─────────────────────────────────────────────
// Kullanıcı her ölçüde ve yönde fotoğraf yüklüyor: yatay çekim, 4000 px'lik
// telefon fotoğrafı, ters dönmüş EXIF... Arayüzdeki tüm görsel kutuları 3:4
// dikey olduğu için ham dosyalar kırpılıp garip görünüyordu. Bu yüzden her
// görsel yüklenirken tek bir standarda çevrilir:
//   • EXIF yönü uygulanır (yan yatmış fotoğraf düzelir),
//   • 3:4 tuvale sığdırılır — kırpma YOK, kenarlar beyazla tamamlanır,
//   • en fazla 1200×1600 px'e indirilir (küçük görsel büyütülmez),
//   • WEBP'e çevrilir (aynı kalite, çok daha küçük dosya).
const HEDEF_GENISLIK = 1200;
const HEDEF_YUKSEKLIK = 1600;

/** Animasyonlu GIF'e dokunulmaz: kareler kaybolmasın. */
function islenirMi(tip: string): boolean {
  return tip.startsWith("image/") && tip !== "image/gif";
}

async function gorseliNormallestir(ham: Buffer): Promise<Buffer> {
  // sharp'ın döndürdüğü Buffer<ArrayBufferLike> tipini daraltıyoruz.
  return sharp(ham)
    .rotate() // EXIF yönü
    .resize({
      width: HEDEF_GENISLIK,
      height: HEDEF_YUKSEKLIK,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer()
    .then((b) => Buffer.from(b));
}

/**
 * Talep görselleri/videoları için yükleme ucu.
 *
 * Dosyalar `public/yuklemeler/` altına rastgele adla yazılır ve web yolları
 * döner. Dosya adı kullanıcıdan alınmaz — yol geçişi (path traversal) ve ad
 * çakışması riskini tamamen ortadan kaldırmak için sunucu üretir.
 *
 * ÜRETİM NOTU: kalıcı bir nesne deposu (S3 / Supabase Storage / Cloudinary)
 * kullanılmalı. Vercel gibi ortamlarda `public/` yazılabilir değildir ve
 * yazılsa bile her dağıtımda sıfırlanır.
 */
export async function POST(istek: Request) {
  // Yükleme pahalı bir iş: saatte en fazla 60 dosya isteği.
  const kullanici = await istekKullaniciAdi();
  const hiz = hizSinirla(`yukle:${kullanici}`, 60, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla dosya yükledin. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  let form: FormData;
  try {
    form = await istek.formData();
  } catch {
    return NextResponse.json({ hata: "Geçersiz form verisi." }, { status: 400 });
  }

  const dosyalar = form.getAll("dosyalar").filter((d): d is File => d instanceof File);
  if (dosyalar.length === 0) {
    return NextResponse.json({ hata: "Dosya gelmedi." }, { status: 400 });
  }
  if (dosyalar.length > MAX_DOSYA) {
    return NextResponse.json(
      { hata: `En fazla ${MAX_DOSYA} dosya yüklenebilir.` },
      { status: 400 },
    );
  }

  // ── Boyut kontrolleri HİÇBİR DOSYA BELLEĞE ALINMADAN ÖNCE ──
  // `File.size` diskteki boyutu bildirir ve okumayı gerektirmez; sınırı
  // burada uygulamak, reddedilecek bir isteğin belleği hiç tüketmemesini
  // sağlar.
  let toplam = 0;
  for (const dosya of dosyalar) {
    const uzanti = IZINLI[dosya.type];
    if (!uzanti)
      return NextResponse.json(
        { hata: `Desteklenmeyen dosya türü: ${dosya.type || "bilinmiyor"}` },
        { status: 415 },
      );
    const sinir = dosya.type.startsWith("video/")
      ? MAX_VIDEO_BYTE
      : MAX_FOTO_BYTE;
    if (dosya.size > sinir)
      return NextResponse.json(
        { hata: `"${dosya.name}" boyut sınırını aşıyor.` },
        { status: 413 },
      );
    toplam += dosya.size;
  }
  if (toplam > MAX_TOPLAM_BYTE)
    return NextResponse.json(
      {
        hata: `Tek seferde en fazla ${Math.round(MAX_TOPLAM_BYTE / (1024 * 1024))} MB yükleyebilirsin.`,
      },
      { status: 413 },
    );

  await fs.mkdir(HEDEF, { recursive: true });
  const yollar: string[] = [];

  for (const dosya of dosyalar) {
    const uzanti = IZINLI[dosya.type]!;
    const ham = Buffer.from(await dosya.arrayBuffer());

    // İÇERİK BEYANLA UYUŞUYOR MU? `dosya.type` istemcinin beyanıdır;
    // beyaz liste yalnızca beyanı süzer. Dosyanın başındaki imza,
    // içeriğin gerçekten ne olduğunu söyler (bkz. lib/dosya-imza.ts).
    if (!icerikBeyanaUyuyorMu(ham, dosya.type))
      return NextResponse.json(
        {
          hata: `"${dosya.name}" içeriği belirtilen dosya türüyle uyuşmuyor.`,
        },
        { status: 415 },
      );

    // Görseller standarda çevrilir; video ve GIF olduğu gibi kaydedilir.
    // İşleme başarısız olursa (bozuk dosya) orijinal yazılır — yükleme
    // tamamen düşmesin.
    let buffer: Buffer = ham;
    let sonUzanti = uzanti;
    if (islenirMi(dosya.type)) {
      try {
        buffer = await gorseliNormallestir(ham);
        sonUzanti = "webp";
      } catch {
        buffer = ham;
      }
    }

    const ad = `${Date.now()}-${crypto.randomUUID()}.${sonUzanti}`;
    await fs.writeFile(path.join(HEDEF, ad), buffer);
    yollar.push(`/yuklemeler/${ad}`);
  }

  return NextResponse.json({ yollar }, { status: 201 });
}
