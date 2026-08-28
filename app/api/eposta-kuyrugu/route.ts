import { NextResponse } from "next/server";
import { epostaKuyrukOku } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { destekYetkisi } from "@/lib/roller";

export const dynamic = "force-dynamic";

/**
 * Gönderilmeyi bekleyen postalar — YALNIZCA destek/yönetici.
 *
 * `lib/eposta.ts` gerçek servis bağlanana kadar postaları dosyaya yazıyor.
 * Bu kuyruğu okuyan hiçbir şey yoktu: postalar birikiyor, kimse görmüyor ve
 * tavan aşılınca sessizce kırpılıyordu. Bildirimlerin gerçekten çıkıp
 * çıkmadığını görebilmek için en azından bir okuma yolu olmalı.
 */
export async function GET() {
  if (!destekYetkisi(await istekKullaniciAdi()))
    return NextResponse.json(
      { hata: "Bu kaydı yalnızca destek ekibi görebilir." },
      { status: 403 },
    );

  const kuyruk = await epostaKuyrukOku();
  return NextResponse.json({
    kuyruk,
    ozet: {
      toplam: kuyruk.length,
      kuyrukta: kuyruk.filter((i) => i.durum === "kuyrukta").length,
      gonderildi: kuyruk.filter((i) => i.durum === "gonderildi").length,
      hata: kuyruk.filter((i) => i.durum === "hata").length,
    },
  });
}
