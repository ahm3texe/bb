import { NextResponse } from "next/server";
import { bildirimOkundu, bildirimSil } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Kimliği sayıya çevirir; çevrilemezse aramaya bile gerek yok. */
function kimlikCoz(id: string): number | undefined {
  const sayi = Number(id);
  return Number.isFinite(sayi) ? sayi : undefined;
}

/**
 * Tek bir bildirimi okundu işaretler.
 *
 * Sahiplik kontrolü silmedeki gibi depo katmanında; başkasının bildirimi
 * okundu işaretlenemez.
 */
export async function PATCH(_istek: Request, { params }: Ctx) {
  const { id } = await params;
  const sayi = kimlikCoz(id);
  if (sayi === undefined)
    return NextResponse.json({ hata: "Bildirim bulunamadı." }, { status: 404 });

  const durum = await bildirimOkundu(sayi, await istekKullaniciAdi());
  if (durum === "bulunamadi")
    return NextResponse.json({ hata: "Bildirim bulunamadı." }, { status: 404 });
  if (durum === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu bildirim senin değil." },
      { status: 403 },
    );

  return NextResponse.json({ okundu: sayi });
}

/**
 * Tek bir bildirimi siler.
 *
 * Sahiplik kontrolü depo katmanındadır (bkz. lib/depo.ts → bildirimSil):
 * başkasının bildirimi silinemez ve bu kural hiçbir çağrı yolundan
 * atlanamaz.
 */
export async function DELETE(_istek: Request, { params }: Ctx) {
  const { id } = await params;

  // Bildirim kimliği sayıdır (bkz. lib/depo.ts → kimlik).
  const sayi = kimlikCoz(id);
  if (sayi === undefined)
    return NextResponse.json({ hata: "Bildirim bulunamadı." }, { status: 404 });

  const durum = await bildirimSil(sayi, await istekKullaniciAdi());
  if (durum === "bulunamadi")
    return NextResponse.json({ hata: "Bildirim bulunamadı." }, { status: 404 });
  if (durum === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu bildirim senin değil." },
      { status: 403 },
    );

  return NextResponse.json({ silindi: sayi });
}
