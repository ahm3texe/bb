import { NextResponse } from "next/server";
import { okunmamisMesajSayisi } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/** Başlıktaki mesaj rozetinin sayısı. */
export async function GET() {
  return NextResponse.json({
    okunmamis: await okunmamisMesajSayisi(await istekKullaniciAdi()),
  });
}
