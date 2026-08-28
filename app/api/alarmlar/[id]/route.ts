import { NextResponse } from "next/server";
import { alarmGuncelle } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function uygula(
  id: string,
  islem: { sil: true } | { aktif: boolean },
) {
  const durum = await alarmGuncelle(id, await istekKullaniciAdi(), islem);
  if (durum === "bulunamadi")
    return NextResponse.json({ hata: "Alarm bulunamadı." }, { status: 404 });
  if (durum === "yetkisiz")
    return NextResponse.json({ hata: "Bu alarm senin değil." }, { status: 403 });
  return NextResponse.json({ guncellendi: id });
}

export async function DELETE(_istek: Request, { params }: Ctx) {
  return uygula((await params).id, { sil: true });
}

/** Alarmı aç/kapa. */
export async function PATCH(istek: Request, { params }: Ctx) {
  const { id } = await params;
  const govde = (await istek.json().catch(() => ({}))) as { aktif?: unknown };
  if (typeof govde.aktif !== "boolean")
    return NextResponse.json({ hata: "'aktif' alanı gerekli." }, { status: 400 });
  return uygula(id, { aktif: govde.aktif });
}
