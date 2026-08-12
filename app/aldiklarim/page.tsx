import type { Metadata } from "next";
import { AlimSatimListesi } from "@/components/AlimSatimListesi";

export const metadata: Metadata = {
  title: "Aldıklarım",
  description:
    "Tamamlanan alımların — ödemesi yapılmış ve teslimatı onaylanmış siparişler, toplam harcamanla birlikte.",
};

export default function AldiklarimPage() {
  return <AlimSatimListesi tur="alim" />;
}
