import type { Metadata } from "next";
import { AyarlarClient } from "@/components/AyarlarClient";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesap Ayarları",
  description:
    "Profil bilgilerini, adreslerini, ödeme yöntemlerini, bildirim ve gizlilik tercihlerini ve güvenlik ayarlarını yönet.",
};

export default function AyarlarPage() {
  return <AyarlarClient />;
}
