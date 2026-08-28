import { NextResponse } from "next/server";
import { destekKayitlariOku, destekKaydiEkle, anlasmalarOku } from "@/lib/depo";
import type { DestekKaydi } from "@/lib/destek";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { tekSatir, cokSatir } from "@/lib/metin";
import { gorselleriSuz } from "@/lib/gorsel";

export const dynamic = "force-dynamic";

/** Bir kayda iliştirilebilecek en fazla ekran görüntüsü. */
const EN_FAZLA_EK = 3;

/**
 * Kullanıcının destek kayıtları; ?siparis=<sunumId> ile tek siparişinkiler.
 *
 * Sipariş bazlı sorguda kaydı AÇAN kadar karşı taraf da görebilir: satıcının
 * "inceleme başladı mı?" bilgisini görmesi gerekir. Kayıt gövdesi değil,
 * yalnızca numarası ve durumu paylaşılır.
 */
export async function GET(istek: Request) {
  const siparis = new URL(istek.url).searchParams.get("siparis");
  const ben = await istekKullaniciAdi();

  if (siparis) {
    const anlasma = (await anlasmalarOku()).find((a) => a.sunumId === siparis);
    if (!anlasma || (ben !== anlasma.alici && ben !== anlasma.satici))
      return NextResponse.json({ kayitlar: [] });

    const kayitlar = (await destekKayitlariOku())
      .filter((k) => k.sunumId === siparis)
      .map((k) => ({ no: k.no, durum: k.durum, zaman: k.zaman, acan: k.acan }));
    return NextResponse.json({ kayitlar });
  }

  return NextResponse.json({ kayitlar: await destekKayitlariOku(ben) });
}

/** Destek kaydı açar. Panel "kayıt açıldı" demeden önce bu uç çağrılmalıdır. */
export async function POST(istek: Request) {
  const ben = await istekKullaniciAdi();

  // Destek kaydı yazma işlemi ve karşı tarafa görünür: saatlik tavan olmadan
  // bir hesap kuyruğu doldurabilirdi.
  const hiz = hizSinirla(`destek:${ben}`, 10, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla destek kaydı açtın. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const konu = tekSatir(g.konu, 60);
  const refNo = tekSatir(g.refNo, 80);
  const baslik = tekSatir(g.baslik, 120);
  const aciklama = cokSatir(g.aciklama, 2000);
  // Ekler gövdeden geliyor, yani uydurulabilir: yalnızca `/api/yukle`'nin
  // ürettiği biçime uyan yollar kayda girer (bkz. lib/gorsel.ts).
  const ekler = gorselleriSuz(g.ekler, EN_FAZLA_EK);

  if (!konu || !refNo || baslik.length < 5 || aciklama.length < 20)
    return NextResponse.json(
      { hata: "Konu, referans, başlık (en az 5) ve açıklama (en az 20) gerekli." },
      { status: 400 },
    );

  // Sipariş bağlanacaksa o siparişin tarafı olmak ŞART. Doğrulanmadığında
  // herhangi biri başkasının sunum kimliğiyle kayıt açabiliyor, kayıt da
  // GET ?siparis= üzerinden gerçek taraflara görünüyordu.
  const sunumId = tekSatir(g.sunumId, 120) || undefined;
  if (sunumId) {
    const anlasma = (await anlasmalarOku()).find((a) => a.sunumId === sunumId);
    if (!anlasma || (ben !== anlasma.alici && ben !== anlasma.satici))
      return NextResponse.json(
        { hata: "Bu siparişin tarafı değilsin." },
        { status: 403 },
      );
  }

  const kayit: DestekKaydi = {
    // Kesin numara `destekKaydiEkle` içinde, yazma kilidinin altında
    // atanır; buradaki yalnızca yer tutucudur.
    no: "",
    acan: ben,
    konu,
    refNo,
    sunumId,
    baslik,
    aciklama,
    ...(ekler.length ? { ekler } : {}),
    durum: "İncelemede",
    zaman: new Date().toISOString(),
  };

  return NextResponse.json({ kayit: await destekKaydiEkle(kayit) }, { status: 201 });
}
