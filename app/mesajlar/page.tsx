import type { Metadata } from "next";
import { MesajlarClient } from "@/components/MesajlarClient";

export const metadata: Metadata = {
  title: "Mesajlar",
  description:
    "Satıcılarla sohbet et, teklifleri karşılaştır, pazarlığı yürüt ve anlaşınca ödemeni güvenceye al — hepsi tek ekranda.",
};

export default async function MesajlarPage({
  searchParams,
}: {
  searchParams: Promise<{ satici?: string }>;
}) {
  const { satici } = await searchParams;
  return <MesajlarClient satici={satici} />;
}
