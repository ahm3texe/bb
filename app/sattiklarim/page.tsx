import type { Metadata } from "next";
import { AlimSatimListesi } from "@/components/AlimSatimListesi";

export const metadata: Metadata = {
  title: "Sattıklarım",
  description:
    "Tamamlanan satışların — bedeli tahsil edilmiş siparişler, brüt ciro, komisyon ve net kazancınla birlikte.",
};

export default function SattiklarimPage() {
  return <AlimSatimListesi tur="satis" />;
}
