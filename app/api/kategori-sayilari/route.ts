import { NextResponse } from "next/server";
import { kategoriSayilariGetir } from "@/lib/veri";

export const dynamic = "force-dynamic";

/**
 * Kategori başına açık talep sayısı.
 *
 * Header her sayfada render edildiği için mega menü veriyi prop olarak
 * alamıyordu ve sabit sayıları gösteriyordu; artık Keşfet ile aynı
 * kaynaktan okuyor.
 */
export async function GET() {
  return NextResponse.json({ sayilar: await kategoriSayilariGetir() });
}
