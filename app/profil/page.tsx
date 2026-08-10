import type { Metadata } from "next";
import { ProfilClient } from "@/components/ProfilClient";

export const metadata: Metadata = {
  title: "Profilim",
  description:
    "emre.k profili — talepler, gönderilen sunumlar, takip edilenler ve değerlendirmeler tek yerde.",
};

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  // key: ?tab= değişince panel state'i yeniden kurulur (kimlik kartındaki
  // "15 değerlendirme" bağlantısı aynı sayfadayken de paneli açar).
  return <ProfilClient key={tab ?? "talepler"} baslangicTab={tab} />;
}
