import { NextResponse } from "next/server";
import {
  bildirimlerOku,
  bildirimlerTemizle,
  bildirimlerTumunuOku,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/** Oturumdaki hesabın bildirimleri — başkasının bildirimi okunamaz. */
export async function GET() {
  return NextResponse.json({
    bildirimler: await bildirimlerOku(await istekKullaniciAdi()),
  });
}

/**
 * Hesabın okunmamış tüm bildirimlerini okundu işaretler.
 *
 * "Tümünü okundu işaretle" bir dönem yalnızca bileşenin yerel state'ini
 * değiştiriyordu: sayfa yenilenince hepsi yeniden okunmamış görünüyor,
 * zil rozeti ise hiç sıfırlanmıyordu.
 */
export async function PATCH() {
  const okunan = await bildirimlerTumunuOku(await istekKullaniciAdi());
  return NextResponse.json({ okunan });
}

/**
 * Hesabın TÜM bildirimlerini siler.
 *
 * Kimin bildirimlerinin silineceği gövdeden gelmez, oturumdan okunur:
 * başkasının listesini temizlemek mümkün olmamalı.
 */
export async function DELETE() {
  const silinen = await bildirimlerTemizle(await istekKullaniciAdi());
  return NextResponse.json({ silinen });
}
