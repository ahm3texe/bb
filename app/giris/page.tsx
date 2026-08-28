import type { Metadata } from "next";
import { GirisClient } from "./GirisClient";

/**
 * Sayfa SUNUCU bileşeni, içerik istemcide.
 *
 * Bu ayrım üstveri için gerekli: `metadata` yalnızca sunucu bileşenlerinden
 * dışa aktarılabiliyor. Sayfa baştan sona `"use client"` olduğu için sekme
 * başlığı ve paylaşım kartı varsayılana düşüyordu.
 */
export const metadata: Metadata = {
  title: "Giriş Yap",
  description:
    "Bulbana hesabına giriş yap; taleplerini, sunumlarını ve siparişlerini yönet.",
  // Giriş akışı arama sonuçlarında görünmemeli.
  robots: { index: false, follow: false },
};

export default function Sayfa() {
  return <GirisClient />;
}
