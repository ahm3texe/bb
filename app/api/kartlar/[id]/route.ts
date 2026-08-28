import { NextResponse } from "next/server";
import { kartSil, kartVarsayilanYap } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_istek: Request, { params }: Ctx) {
  const { id } = await params;
  const durum = await kartSil(id, await istekKullaniciAdi());
  if (durum === "bulunamadi")
    return NextResponse.json({ hata: "Kart bulunamadı." }, { status: 404 });
  if (durum === "yetkisiz")
    return NextResponse.json({ hata: "Bu kart senin değil." }, { status: 403 });
  return NextResponse.json({ silindi: id });
}

/** Varsayılan kartı değiştirir. */
export async function PATCH(_istek: Request, { params }: Ctx) {
  const { id } = await params;
  const durum = await kartVarsayilanYap(id, await istekKullaniciAdi());
  if (durum === "bulunamadi")
    return NextResponse.json({ hata: "Kart bulunamadı." }, { status: 404 });
  if (durum === "yetkisiz")
    return NextResponse.json({ hata: "Bu kart senin değil." }, { status: 403 });
  return NextResponse.json({ varsayilan: id });
}
