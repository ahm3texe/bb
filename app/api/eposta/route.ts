import { NextResponse } from "next/server";
import {
  hesapEpostasiOku,
  hesapEpostasiYaz,
  hesapEpostasiDogrula,
  epostaKuyrukEkle,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * Hesabın bildirim e-postası.
 *
 * Adres bir dönem kullanıcı adından UYDURULUYORDU ve önündeki "doğrulanmış
 * mı?" kapısı hiçbir hesapta açılmadığı için e-posta bildirimi diye bir
 * özellik vardı ama hiç çalışmıyordu. Artık adres kullanıcıdan alınıyor ve
 * doğrulanana kadar oraya posta çıkmıyor.
 */

/** Kabaca bir adres kontrolü — kesin doğrulama zaten gönderilen kodla olur. */
function adresBicimiGecerliMi(adres: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(adres);
}

export async function GET() {
  const kayit = await hesapEpostasiOku(await istekKullaniciAdi());
  if (!kayit) return NextResponse.json({ eposta: null });
  return NextResponse.json({
    eposta: { adres: kayit.adres, dogrulandi: kayit.dogrulandi },
  });
}

/** Adresi kaydeder ve doğrulama kodunu postalar. */
export async function PUT(istek: Request) {
  const ben = await istekKullaniciAdi();

  // Doğrulama postası gönderimi: bir hesap kuyruğu doldurmasın.
  const hiz = hizSinirla(`eposta-dogrulama:${ben}`, 5, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla doğrulama isteği gönderdin. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const adres = tekSatir(g.adres, 120).toLocaleLowerCase("tr");
  if (!adresBicimiGecerliMi(adres))
    return NextResponse.json(
      { hata: "Geçerli bir e-posta adresi gir." },
      { status: 400 },
    );

  const kayit = await hesapEpostasiYaz(ben, adres);

  // Gerçek gönderim servisi bağlanana kadar posta kuyrukta bekler
  // (bkz. lib/eposta.ts). Kuyruğu destek ekibi `/api/eposta-kuyrugu`
  // üzerinden okuyabilir.
  await epostaKuyrukEkle({
    id: `dogrulama-${kayit.token}`,
    kime: adres,
    konu: "Bulbana — e-posta adresini doğrula",
    govde: [
      "Bulbana hesabının bildirim adresini doğrulamak için kodu gir:",
      "",
      kayit.token ?? "",
      "",
      "Kod 24 saat geçerlidir. Bu isteği sen yapmadıysan yok sayabilirsin.",
    ].join("\n"),
    zaman: new Date().toISOString(),
    durum: "kuyrukta",
  }).catch(() => undefined);

  return NextResponse.json({
    eposta: { adres: kayit.adres, dogrulandi: false },
  });
}

/** Doğrulama kodunu işler. */
export async function POST(istek: Request) {
  const ben = await istekKullaniciAdi();

  // Kod tahmin edilebilir olmasın diye deneme tavanı.
  const hiz = hizSinirla(`eposta-kod:${ben}`, 10, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      { hata: "Çok fazla deneme yaptın. Biraz sonra tekrar dene." },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const token = tekSatir(g.token, 80);
  if (!token)
    return NextResponse.json({ hata: "Doğrulama kodu gerekli." }, { status: 400 });

  const sonuc = await hesapEpostasiDogrula(ben, token);
  if (sonuc === "gecersiz")
    return NextResponse.json({ hata: "Kod geçersiz." }, { status: 400 });
  if (sonuc === "suresi-doldu")
    return NextResponse.json(
      { hata: "Kodun süresi doldu. Adresini yeniden kaydedip yeni kod iste." },
      { status: 410 },
    );

  return NextResponse.json({ dogrulandi: true });
}
