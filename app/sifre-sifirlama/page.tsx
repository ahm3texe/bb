import type { Metadata } from "next";
import { SifreSifirlamaClient } from "./SifreSifirlamaClient";

/**
 * Sayfa SUNUCU bileşeni, form istemcide.
 *
 * Bu ayrım üstveri için gerekli: `metadata` yalnızca sunucu bileşenlerinden
 * dışa aktarılabiliyor. Sayfa baştan sona `"use client"` olduğu için sekme
 * başlığı ve paylaşım kartı varsayılana düşüyordu.
 */
export const metadata: Metadata = {
  title: "Parolamı Sıfırla",
  description:
    "Kullanıcı adını gir, doğrulanmış e-posta adresine gelen tek kullanımlık kodla yeni parolanı belirle.",
  // Giriş akışı arama sonuçlarında görünmemeli.
  robots: { index: false, follow: false },
};

export default function SifreSifirlamaPage() {
  return <SifreSifirlamaClient />;
}
