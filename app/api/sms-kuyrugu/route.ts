import { NextResponse } from "next/server";
import { smsKuyrukOku } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { destekYetkisi } from "@/lib/roller";

export const dynamic = "force-dynamic";

/**
 * Gönderilmeyi bekleyen SMS'ler — YALNIZCA destek/yönetici.
 *
 * `/api/eposta-kuyrugu` ile aynı gerekçe: sağlayıcı bağlanana kadar
 * mesajlar dosyada bekliyor. Kuyruğu okuyan bir yol olmazsa doğrulama
 * kodları birikir, kimse görmez ve tavan aşılınca sessizce kırpılır —
 * yani "telefon doğrulama" diye bir özellik olur ve hiç çalışmaz.
 */
export async function GET() {
  if (!destekYetkisi(await istekKullaniciAdi()))
    return NextResponse.json(
      { hata: "Bu kaydı yalnızca destek ekibi görebilir." },
      { status: 403 },
    );

  const kuyruk = await smsKuyrukOku();
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
