import { NextResponse } from "next/server";
import {
  hesapTelefonuOku,
  hesapTelefonuYaz,
  hesapTelefonuDogrula,
  hesapTelefonuSil,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { tekSatir } from "@/lib/metin";
import { smsGonder } from "@/lib/sms";
import {
  telefonBicimle,
  telefonKoduUret,
  telefonMaskele,
  telefonSadelestir,
} from "@/lib/telefon";

export const dynamic = "force-dynamic";

/**
 * Hesabın doğrulanmış telefon numarası.
 *
 * `/api/eposta` ile BİREBİR aynı desen: numara kaydedilir, tek kullanımlık
 * kod gönderilir, kod girilince doğrulanır. Numara doğrulanana kadar
 * "onaylı" sayılmaz ve rozet çıkmaz.
 *
 * Numara profilde DEĞİL, ayrı kayıtta tutulur (bkz. lib/depo.ts →
 * HesapTelefonu): doğrulama gerektiren iletişim bilgisi profil alanlarına
 * karışırsa "hangi numara geçerli?" sorusu belirsizleşir.
 */

/** Numaranın tamamı yalnızca SAHİBİNE gösterilir; başkasına maske iner. */
export async function GET() {
  const kayit = await hesapTelefonuOku(await istekKullaniciAdi());
  if (!kayit) return NextResponse.json({ telefon: null });
  return NextResponse.json({
    telefon: {
      numara: telefonBicimle(kayit.numara),
      maske: telefonMaskele(kayit.numara),
      dogrulandi: kayit.dogrulandi,
    },
  });
}

/** Numarayı kaydeder ve doğrulama kodunu SMS kuyruğuna atar. */
export async function PUT(istek: Request) {
  const ben = await istekKullaniciAdi();

  // Kod gönderimi: bir hesap SMS kuyruğunu doldurmasın. Gerçek sağlayıcıda
  // her mesajın parası olduğu için bu tavan e-postadakinden düşük.
  const hiz = hizSinirla(`telefon-dogrulama:${ben}`, 3, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla doğrulama isteği gönderdin. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const sade = telefonSadelestir(tekSatir(g.numara, 24));
  if (!sade)
    return NextResponse.json(
      { hata: "Geçerli bir cep telefonu numarası gir (05xx xxx xx xx)." },
      { status: 400 },
    );

  // Kod SUNUCUDA üretilir. Tarayıcıda üretilen bir doğrulama kodu, kodu
  // zaten bilen tarafa sorulmuş bir soru demektir — sahte SMS akışında
  // yapılan hata tam buydu (bkz. components/AyarlarClient.tsx).
  const token = telefonKoduUret();
  const kayit = await hesapTelefonuYaz(ben, sade, token);

  // Gerçek sağlayıcı bağlanana kadar mesaj kuyrukta bekler
  // (bkz. lib/sms.ts). Kuyruğu destek ekibi `/api/sms-kuyrugu` üzerinden
  // okuyabilir.
  await smsGonder({
    kime: sade,
    metin: `Bulbana doğrulama kodun: ${token} — 15 dakika geçerli. Bu isteği sen yapmadıysan yok say.`,
  }).catch(() => undefined);

  return NextResponse.json({
    telefon: {
      numara: telefonBicimle(kayit.numara),
      maske: telefonMaskele(kayit.numara),
      dogrulandi: false,
    },
  });
}

/** Doğrulama kodunu işler. */
export async function POST(istek: Request) {
  const ben = await istekKullaniciAdi();

  // Kod yalnızca 6 haneli: deneme tavanı e-postadakinden SIKI olmalı,
  // yoksa kaba kuvvetle bulunabilir.
  const hiz = hizSinirla(`telefon-kod:${ben}`, 5, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      { hata: "Çok fazla deneme yaptın. Biraz sonra tekrar dene." },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const token = tekSatir(g.token, 12);
  if (!token)
    return NextResponse.json(
      { hata: "Doğrulama kodu gerekli." },
      { status: 400 },
    );

  const sonuc = await hesapTelefonuDogrula(ben, token);
  if (sonuc === "gecersiz")
    return NextResponse.json({ hata: "Kod geçersiz." }, { status: 400 });
  if (sonuc === "suresi-doldu")
    return NextResponse.json(
      { hata: "Kodun süresi doldu. Numaranı yeniden kaydedip yeni kod iste." },
      { status: 410 },
    );

  return NextResponse.json({ dogrulandi: true });
}

/** Numarayı kaldırır — doğrulama da düşer. */
export async function DELETE() {
  await hesapTelefonuSil(await istekKullaniciAdi());
  return NextResponse.json({ silindi: true });
}
