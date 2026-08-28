import { NextResponse } from "next/server";
import { favorilerOku, favoriDegistir } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/** Oturumdaki hesabın favori talep kimlikleri. */
export async function GET() {
  return NextResponse.json({ favoriler: await favorilerOku(await istekKullaniciAdi()) });
}

/** Favoriye ekler ya da çıkarır (toggle). */
export async function POST(istek: Request) {
  let govde: { talepId?: unknown };
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  const talepId = typeof govde.talepId === "string" ? govde.talepId : "";
  if (!talepId)
    return NextResponse.json({ hata: "Talep kimliği gerekli." }, { status: 400 });

  const favoride = await favoriDegistir(await istekKullaniciAdi(), talepId);
  if (favoride === "talep-yok")
    return NextResponse.json({ hata: "Talep bulunamadı." }, { status: 404 });

  return NextResponse.json({ favoride });
}
