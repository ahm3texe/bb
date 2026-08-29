import { NextResponse } from "next/server";
import {
  bildirimEkle,
  destekKaydiDurumGuncelle,
  destekKayitlariOku,
  kimlik,
} from "@/lib/depo";
import type { DestekKaydi } from "@/lib/destek";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { destekYetkisi } from "@/lib/roller";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ no: string }> };

/** Destek ekibinin verebileceği kararlar. Kayıt "İncelemede" doğar. */
const DURUMLAR: DestekKaydi["durum"][] = ["İncelemede", "Yanıtlandı", "Kapandı"];

/**
 * Destek kaydının durumunu değiştirir — YALNIZCA destek/yönetici.
 *
 * Kayıt açan kullanıcı kendi kaydının durumunu değiştiremez: "Kapandı"
 * demek, kaydı işleyen tarafın kararıdır. Yetki kontrolü uçta, kayıt
 * yazımı ise kilidin içinde (bkz. lib/depo.ts → destekKaydiDurumGuncelle).
 */
export async function PATCH(istek: Request, { params }: Ctx) {
  const ben = await istekKullaniciAdi();
  if (!destekYetkisi(ben))
    return NextResponse.json(
      { hata: "Bu işlemi yalnızca destek ekibi yapabilir." },
      { status: 403 },
    );

  const { no } = await params;
  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const durum = g.durum as DestekKaydi["durum"];
  if (!DURUMLAR.includes(durum))
    return NextResponse.json(
      { hata: `Durum şunlardan biri olmalı: ${DURUMLAR.join(", ")}.` },
      { status: 400 },
    );

  // Numara URL'den geliyor; kaydın kendisi depoda aranır.
  const oncekiKayit = (await destekKayitlariOku()).find((k) => k.no === no);
  if (!oncekiKayit)
    return NextResponse.json({ hata: "Kayıt bulunamadı." }, { status: 404 });

  const kayit = await destekKaydiDurumGuncelle(no, durum);
  if (!kayit)
    return NextResponse.json({ hata: "Kayıt bulunamadı." }, { status: 404 });

  // Bildirim yalnızca durum GERÇEKTEN değiştiyse çıkar: panelde aynı
  // düğmeye ikinci kez basmak kullanıcıya ikinci bir bildirim yollamamalı
  // (kargo webhook'unda çıkan hatanın aynısı — bkz. BACKEND.md).
  if (oncekiKayit.durum !== durum) {
    await bildirimEkle({
      id: kimlik(),
      kime: kayit.acan,
      grup: "Bugün",
      tip: "sistem",
      harf: "BB",
      avatar: "bg-primary-soft text-primary-hover",
      text: `Destek kaydın ${no}: ${durum}`,
      sub: kayit.baslik,
      zaman: "az önce",
      href: "/destek",
      yeni: true,
    });
  }

  return NextResponse.json({ kayit });
}
