import { NextResponse } from "next/server";
import { kimlikDogrula } from "@/lib/kimlik";
import { kimlikYaz } from "@/lib/depo";
import { parolaHashle, parolaKuralHatasi } from "@/lib/parola";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";

export const dynamic = "force-dynamic";

/**
 * Parola değiştirme.
 *
 * BU UÇ YOKTU. Ayarlar › Güvenlik'teki akış tamamen istemcideydi: sözde bir
 * "SMS onay kodu" tarayıcıda üretiliyor, tarayıcıda karşılaştırılıyor ve
 * doğru girilince yalnızca "Şifren güncellendi" bildirimi gösteriliyordu.
 * Parola hiç değişmiyordu.
 *
 * Gerçek parola doğrulaması kurulduktan sonra bu, hayal kırıklığı olmaktan
 * çıkıp güvenlik yanılgısına dönüştü: kullanıcı parolasını değiştirdiğine ve
 * eskisinin artık geçersiz olduğuna inanıyor — eski parola çalışmaya devam
 * ediyor.
 *
 * MEVCUT PAROLA ŞART. Oturum açık olsa bile: çerezi ele geçiren biri
 * parolayı değiştirip hesabı kalıcı olarak devralamamalı.
 */
export async function POST(istek: Request) {
  const ben = await istekKullaniciAdi();

  // Mevcut parolayı deneme yanılma ile bulmaya çalışmak pahalı olsun.
  const hiz = hizSinirla(`parola:${ben}`, 10, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla deneme yaptın. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const mevcut = typeof g.mevcut === "string" ? g.mevcut : "";
  const yeni = typeof g.yeni === "string" ? g.yeni : "";

  const kuralHatasi = parolaKuralHatasi(yeni);
  if (kuralHatasi)
    return NextResponse.json({ hata: kuralHatasi }, { status: 400 });

  if (yeni === mevcut)
    return NextResponse.json(
      { hata: "Yeni parola mevcut parolayla aynı olamaz." },
      { status: 400 },
    );

  if (!(await kimlikDogrula(ben, mevcut)))
    return NextResponse.json({ hata: "Mevcut parolan hatalı." }, { status: 403 });

  await kimlikYaz(ben, await parolaHashle(yeni));

  // NOT: oturumlar geçersiz kılınmıyor. Bugün oturum çerezi imzalıdır ama
  // sunucuda kayıt tutmaz, dolayısıyla "diğer cihazlardan çıkış yap"
  // yapılabilmesi için oturumların da saklanması gerekir (bkz. BACKEND.md).
  return NextResponse.json({ guncellendi: true });
}
