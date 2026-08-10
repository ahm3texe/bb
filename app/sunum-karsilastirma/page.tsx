import type { Metadata } from "next";
import { SunumKarsilastirmaClient } from "@/components/SunumKarsilastirmaClient";

export const metadata: Metadata = {
  title: "Sunum Karşılaştırma",
  description:
    "İlanına gelen sunumlardan üçünü seç, yan yana karşılaştır: fiyat, ilanınla eşleşme, ürün durumu, kargo ve satıcı geçmişi tek ekranda.",
};

export default function SunumKarsilastirmaPage() {
  return <SunumKarsilastirmaClient />;
}
