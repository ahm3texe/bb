import type { Metadata } from "next";
import { BildirimlerClient } from "@/components/BildirimlerClient";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bildirimler",
  description:
    "Taleplerine gelen sunumlar, teklif istekleri, kargo ve sistem bildirimlerini tek yerde takip et.",
};

export default function BildirimlerPage() {
  return <BildirimlerClient />;
}
