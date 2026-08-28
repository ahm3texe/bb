import { NextResponse } from "next/server";
import { tercihlerOku, tercihlerYaz } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/**
 * Bildirim tercihleri.
 *
 * Bu ayarlar bir dönem yalnızca Ayarlar ekranının belleğinde duruyordu:
 * sayfa yenilenince sıfırlanıyor ve onlara bakan hiçbir kod bulunmuyordu.
 * Artık sunucuda saklanıyor ve `bildirimEkle` her bildirimde soruyor.
 *
 * Teklif, kargo ve sistem bildirimleri BURADAN KAPATILAMAZ — paranın ve
 * ürünün yerini söylerler, sipariş akışının parçasıdırlar.
 */
export async function GET() {
  const t = await tercihlerOku(await istekKullaniciAdi());
  return NextResponse.json({
    tercihler: {
      sunum: t.sunum,
      mesaj: t.mesaj,
      kampanya: t.kampanya,
      eposta: t.eposta,
    },
  });
}

export async function PATCH(istek: Request) {
  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;

  // Beyaz liste: yalnızca kapatılabilir alanlar yazılır.
  const veri: Record<string, boolean> = {};
  for (const alan of ["sunum", "mesaj", "kampanya", "eposta"])
    if (typeof g[alan] === "boolean") veri[alan] = g[alan] as boolean;

  if (!Object.keys(veri).length)
    return NextResponse.json(
      { hata: "Değiştirilecek bir tercih gönderilmedi." },
      { status: 400 },
    );

  const t = await tercihlerYaz(await istekKullaniciAdi(), veri);
  return NextResponse.json({
    tercihler: {
      sunum: t.sunum,
      mesaj: t.mesaj,
      kampanya: t.kampanya,
      eposta: t.eposta,
    },
  });
}
