import type { Metadata } from "next";
import { ItirazClient } from "@/components/ItirazClient";

export const metadata: Metadata = {
  title: "İtiraz Başlat",
  description:
    "Sorun yaşadığın siparişe itiraz aç; nedenini seç, kanıt ekle. Ödemen inceleme sonuçlanana kadar Bulbana güvencesinde dondurulur.",
};

export default function ItirazPage() {
  return <ItirazClient />;
}
