import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminClient } from "@/components/AdminClient";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { destekYetkisi } from "@/lib/roller";

/**
 * ÜSTVERİ BİLEREK GENERİK.
 *
 * Burada `title: "Moderasyon Paneli"` yazıyordu. `metadata` sayfanın
 * gövdesinden BAĞIMSIZ üretildiği için yetkisiz ziyaretçi `notFound()`
 * gövdesini görse bile sekme başlığında "Moderasyon Paneli · Bulbana"
 * okuyordu — yani panelin varlığı doğrulanıyordu. Aşağıdaki yorumun
 * kendisi tam da bunu önlemeyi hedefliyordu.
 *
 * Panelin adı yalnızca ekranda, yetki kontrolünden SONRA görünür.
 */
export const metadata: Metadata = {
  // `absolute`: kök yerleşimin "%s · Bulbana" şablonu uygulanmasın,
  // yoksa başlık "Bulbana · Bulbana" oluyor.
  title: { absolute: "Bulbana" },
  robots: { index: false, follow: false },
};

// Yetki her istekte kontrol edilir; sayfa önbelleğe alınmamalı.
export const dynamic = "force-dynamic";

/**
 * Moderasyon paneli. Yetkisi olmayana `notFound()` döner — 403 yerine 404,
 * çünkü panelin varlığını doğrulamak da bilgi vermektir.
 *
 * Bu kapı eksikti: sayfa doğrudan `<AdminClient />` render ediyordu, yani
 * adresi bilen herkes paneli açabiliyordu. `robots.ts` disallow listesi
 * erişimi engellemez, yalnızca dizine girmesini engeller.
 */
export default async function AdminPage() {
  if (!destekYetkisi(await istekKullaniciAdi())) notFound();
  return <AdminClient />;
}
