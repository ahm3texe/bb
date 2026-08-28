import { NextResponse } from "next/server";
import { ibanOku, ibanYaz } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { ibanGecerliMi, ibanMaskele, ibanSadelestir } from "@/lib/iban";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * Satış gelirinin aktarılacağı banka hesabı.
 *
 * TAM IBAN İSTEMCİYE DÖNMEZ. Kullanıcının hesabı tanıması için maskeli hâli
 * yeterli; tam numaraya yalnızca parayı gönderen taraf ihtiyaç duyar ve o
 * da sunucuda. Bu yüzden GET maskeli, PUT tam numarayı alır.
 */
export async function GET() {
  const kayit = await ibanOku(await istekKullaniciAdi());
  if (!kayit) return NextResponse.json({ iban: null });
  return NextResponse.json({
    iban: { maske: ibanMaskele(kayit.iban), sahip: kayit.sahip },
  });
}

export async function PUT(istek: Request) {
  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const iban = ibanSadelestir(tekSatir(g.iban, 40));
  const sahip = tekSatir(g.sahip, 80);

  // Doğrulama sunucuda TEKRAR edilir: istemcideki mod-97 kontrolü kullanıcıyı
  // yazım hatasından korumak içindir, güvenlik sınırı değil.
  if (!sahip)
    return NextResponse.json(
      { hata: "Hesap sahibinin adı soyadı gerekli." },
      { status: 400 },
    );
  if (!ibanGecerliMi(iban))
    return NextResponse.json(
      { hata: "Geçerli bir TR IBAN'ı gir." },
      { status: 400 },
    );

  const kayit = await ibanYaz(await istekKullaniciAdi(), iban, sahip);
  return NextResponse.json({
    iban: { maske: ibanMaskele(kayit.iban), sahip: kayit.sahip },
  });
}
