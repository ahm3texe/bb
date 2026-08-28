import type { Metadata } from "next";
import { TalepAlarmlariClient } from "@/components/TalepAlarmlariClient";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Talep Alarmı",
  description:
    "Kayıtlı aramalarını yönet; kategori, anahtar kelime, fiyat ve il kriterlerine uyan talep açıldığında anında bildirim al.",
};

export default function TalepAlarmlariPage() {
  return <TalepAlarmlariClient />;
}
