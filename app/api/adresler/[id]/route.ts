import { NextResponse } from "next/server";
import { adresGuncelle, adresSil } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { tekSatir, cokSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_istek: Request, { params }: Ctx) {
  const { id } = await params;
  const durum = await adresSil(id, await istekKullaniciAdi());
  if (durum === "bulunamadi")
    return NextResponse.json({ hata: "Adres bulunamadı." }, { status: 404 });
  if (durum === "yetkisiz")
    return NextResponse.json({ hata: "Bu adres senin değil." }, { status: 403 });
  return NextResponse.json({ silindi: id });
}

/** Adresi günceller ya da varsayılan yapar. */
export async function PATCH(istek: Request, { params }: Ctx) {
  const { id } = await params;
  const govde = (await istek.json().catch(() => ({}))) as Record<string, unknown>;

  // Uzunluk sınırları POST ile AYNI olmalı. Burada yalnızca `trim()`
  // uygulanıyordu: POST'ta 80 karakterle sınırlı `cadde` alanına düzenleme
  // yoluyla megabaytlarca metin yazılabiliyordu.
  const SINIRLAR: Record<string, number> = {
    ad: 30,
    il: 40,
    ilce: 40,
    mahalle: 60,
    cadde: 80,
    apartman: 60,
    kat: 10,
    daire: 10,
    tarif: 120,
  };

  const veri: Record<string, unknown> = {};
  for (const [alan, sinir] of Object.entries(SINIRLAR))
    if (typeof govde[alan] === "string")
      // `tarif` çok satırlı olabilir; kalanlar tek satır.
      veri[alan] =
        alan === "tarif"
          ? cokSatir(govde[alan], sinir)
          : tekSatir(govde[alan], sinir);
  if (typeof govde.varsayilan === "boolean") veri.varsayilan = govde.varsayilan;

  const sonuc = await adresGuncelle(id, await istekKullaniciAdi(), veri);
  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Adres bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json({ hata: "Bu adres senin değil." }, { status: 403 });
  return NextResponse.json({ adres: sonuc });
}
