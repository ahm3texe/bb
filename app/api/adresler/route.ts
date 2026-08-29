import { NextResponse } from "next/server";
import { adreslerOku, adresEkle, metinKimlik } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { EN_FAZLA_ADRES } from "@/lib/adres";
import type { KayitliAdres } from "@/lib/adres";
import { tekSatir, cokSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ adresler: await adreslerOku(await istekKullaniciAdi()) });
}


export async function POST(istek: Request) {
  let govde: Record<string, unknown>;
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const ad = tekSatir(govde.ad, 30);
  const il = tekSatir(govde.il, 40);
  const ilce = tekSatir(govde.ilce, 40);
  const mahalle = tekSatir(govde.mahalle, 60);

  const hatalar: string[] = [];
  if (!ad) hatalar.push("Adrese bir başlık ver (Ev, İş…).");
  if (!il) hatalar.push("Şehir seç.");
  if (!ilce) hatalar.push("İlçe seç.");
  if (hatalar.length)
    return NextResponse.json({ hata: hatalar[0], hatalar }, { status: 400 });

  const adres: KayitliAdres = {
    id: metinKimlik("adres"),
    kullanici: await istekKullaniciAdi(),
    ad,
    il,
    ilce,
    mahalle,
    cadde: tekSatir(govde.cadde, 80),
    apartman: tekSatir(govde.apartman, 60),
    kat: tekSatir(govde.kat, 10),
    daire: tekSatir(govde.daire, 10),
    // 120'ydi ama form 160'a izin veriyordu: kullanıcının yazdığı son 40
    // karakter sessizce kayboluyordu. Kesilen yer adres tarifinin SONU —
    // "zil çalışmıyor, arayın" gibi kargonun ulaşmasını sağlayan kısım.
    // İkisi hizalandı; sınır formdaki değere yükseltildi.
    tarif: cokSatir(govde.tarif, 160),
    varsayilan: govde.varsayilan === true,
  };

  const sonuc = await adresEkle(adres);
  if (sonuc === "sinir-doldu")
    return NextResponse.json(
      {
        hata: `En fazla ${EN_FAZLA_ADRES} adres kaydedebilirsin. Yeni adres için önce birini kaldır.`,
      },
      { status: 409 },
    );

  return NextResponse.json({ adres: sonuc }, { status: 201 });
}
