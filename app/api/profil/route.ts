import { NextResponse } from "next/server";
import { profilOku, profilYaz } from "@/lib/depo";
import { getKullanici } from "@/lib/kullanicilar";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { tekSatir, cokSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * Hesap profili — ad, soyad, telefon, doğum tarihi ve "Hakkında" metni.
 *
 * Bu bilgiler bir dönem yalnızca tarayıcının `localStorage`'ındaydı: başka
 * cihazdan girince kayboluyordu ve herkese açık profildeki biyografi
 * `lib/kullanicilar.ts`'teki sabit kayıttan geliyordu — yani kullanıcının
 * yazdığı metin yalnızca kendisine görünüyordu.
 */

/** Kayıt yoksa hesabın sabit verisinden makul bir varsayılan üretir. */
function varsayilan(kullanici: string) {
  const kayit = getKullanici(kullanici);
  const [ad = "", ...kalan] = (kayit?.ad ?? kullanici).split(" ");
  return {
    ad,
    soyad: kalan.join(" "),
    telefon: "",
    dogumTarihi: "",
    bio: kayit?.bio ?? "",
  };
}

export async function GET() {
  const ben = await istekKullaniciAdi();
  const kayit = await profilOku(ben);
  const p = kayit
    ? {
        ad: kayit.ad,
        soyad: kayit.soyad,
        telefon: kayit.telefon,
        dogumTarihi: kayit.dogumTarihi,
        bio: kayit.bio,
      }
    : varsayilan(ben);
  return NextResponse.json({ profil: { ...p, kullanici: ben } });
}

export async function PUT(istek: Request) {
  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;

  // Sınırlar Ayarlar formundakiyle aynı; istemcideki kontrole güvenilmez.
  const ad = tekSatir(g.ad, 40);
  const soyad = tekSatir(g.soyad, 40);
  const telefon = tekSatir(g.telefon, 20);
  const dogumTarihi = tekSatir(g.dogumTarihi, 10);
  const bio = cokSatir(g.bio, 300);

  if (!ad)
    return NextResponse.json({ hata: "Ad alanı gerekli." }, { status: 400 });
  // <input type="date"> biçimi; boş bırakılabilir.
  if (dogumTarihi && !/^\d{4}-\d{2}-\d{2}$/.test(dogumTarihi))
    return NextResponse.json(
      { hata: "Doğum tarihi GG.AA.YYYY biçiminde seçilmeli." },
      { status: 400 },
    );

  const ben = await istekKullaniciAdi();
  const kayit = await profilYaz(ben, {
    ad,
    soyad,
    telefon,
    dogumTarihi,
    bio,
  });
  return NextResponse.json({
    profil: {
      kullanici: ben,
      ad: kayit.ad,
      soyad: kayit.soyad,
      telefon: kayit.telefon,
      dogumTarihi: kayit.dogumTarihi,
      bio: kayit.bio,
    },
  });
}
