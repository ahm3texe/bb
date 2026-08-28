import { NextResponse } from "next/server";
import { gonderiHazirla, bildirimEkle, kimlik } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { harfFor } from "@/lib/sohbetler";
import { KARGO_FIRMALARI } from "@/lib/anlasma";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * Satıcı kargo firmasını seçer; gönderiyi SİSTEM oluşturur.
 *
 * TAKİP NUMARASI ARTIK GÖVDEDEN GELMİYOR. Eskiden satıcı hem firmayı
 * seçiyor hem takip numarasını elle yazıyordu — numara doğrulanmamış bir
 * beyandı ve satıcı ürünü kargolamak için alıcının tam adresini görmek
 * zorundaydı. Yeni akışta adres yalnızca sunucudan firmaya gider, satıcı
 * yalnızca sipariş kodunu görür ve numara firmadan döner
 * (bkz. lib/kargo-gonderi.ts).
 */
export async function POST(
  istek: Request,
  { params }: { params: Promise<{ sunumId: string }> },
) {
  const { sunumId } = await params;

  let govde: { firma?: unknown; takipNo?: unknown };
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const firma = tekSatir(govde.firma, 60);
  if (!KARGO_FIRMALARI.some((k) => k.ad === firma))
    return NextResponse.json(
      { hata: "Listeden bir kargo firması seç." },
      { status: 400 },
    );

  // Takip numarası sağlayıcı bağlı olmadığı sürece gönderenden alınır;
  // bağlandığı gün firmanın döndüğü numara bunu ezer (bkz. gonderiOlustur).
  const takipNo = tekSatir(govde.takipNo, 40);
  if (takipNo && takipNo.length < 6)
    return NextResponse.json(
      { hata: "Takip numarası en az 6 karakter olmalı." },
      { status: 400 },
    );

  const sonuc = await gonderiHazirla(
    sunumId,
    await istekKullaniciAdi(),
    firma,
    "gidis",
    takipNo || undefined,
  );

  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json(
      { hata: "Gönderiyi yalnızca satıcı oluşturabilir." },
      { status: 403 },
    );
  if (sonuc === "odeme-bekleniyor")
    return NextResponse.json(
      { hata: "Ödeme alınmadan gönderi oluşturulamaz." },
      { status: 409 },
    );
  if (sonuc === "zaten-var")
    return NextResponse.json(
      { hata: "Bu sipariş için gönderi zaten oluşturuldu." },
      { status: 409 },
    );
  // "gidis" yönünde sıra dışılık oluşmaz; dal tip bütünlüğü için burada.
  if (sonuc === "sira-disi")
    return NextResponse.json(
      { hata: "Bu adım şu anda işlenemez." },
      { status: 409 },
    );
  if (sonuc === "kod-yok")
    return NextResponse.json(
      { hata: "Siparişin kodu üretilememiş. Destek ekibine bildir." },
      { status: 409 },
    );
  if (sonuc === "adres-yok")
    return NextResponse.json(
      { hata: "Alıcının teslimat adresi kayıtlı değil; gönderi oluşturulamaz." },
      { status: 409 },
    );
  // Sağlayıcı eksikliği ile firmanın reddi AYRI şeyler: birincisi bizim
  // eksiğimiz, ikincisi firmanın yanıtı. Kullanıcıya aynı cümleyi kurmak,
  // düzeltilebilir bir hatayı "sistem bozuk"a çevirirdi.
  if (sonuc === "saglayici-yok")
    return NextResponse.json(
      {
        hata:
          "Kargo firması entegrasyonu bağlı değil; takip numarasını elle gir.",
      },
      { status: 503 },
    );
  if (sonuc === "saglayici-hatasi")
    return NextResponse.json(
      { hata: `${firma} gönderiyi oluşturamadı. Başka bir firma dene.` },
      { status: 502 },
    );

  // Alıcı kargonun yola çıktığını bilmeli.
  await bildirimEkle({
    id: kimlik(),
    kime: sonuc.alici,
    grup: "Bugün",
    tip: "kargo",
    harf: harfFor(sonuc.satici),
    avatar: "bg-accent-soft text-accent-ink",
    text: `${sonuc.satici} ürünü kargoya verdi.`,
    sub: `${firma} · Takip no: ${sonuc.takipNo}`,
    zaman: "Az önce",
    href: "/mesajlar",
    yeni: true,
  });

  return NextResponse.json({ anlasma: sonuc });
}
