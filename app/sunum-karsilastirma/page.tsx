import type { Metadata } from "next";
import { SunumKarsilastirmaClient } from "@/components/SunumKarsilastirmaClient";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import {
  gelenSunumlarGetir,
  tumTaleplerGetir,
  anaTalepIdGetir,
} from "@/lib/veri";

export const metadata: Metadata = {
  title: "Sunum Karşılaştırma",
  description:
    "İlanına gelen sunumlardan üçünü seç, yan yana karşılaştır: fiyat, ilanınla eşleşme, ürün durumu, kargo ve satıcı geçmişi tek ekranda.",
};

// Gelen sunumlar sürekli değişiyor; sayfa her istekte taze okunur.
export const dynamic = "force-dynamic";

export default async function SunumKarsilastirmaPage() {
  const ben = await istekKullaniciAdi();
  const [gelenSunumlar, talepler, anaTalepId] = await Promise.all([
    gelenSunumlarGetir(ben),
    tumTaleplerGetir(),
    anaTalepIdGetir(ben),
  ]);

  return (
    <SunumKarsilastirmaClient
      gelenSunumlar={gelenSunumlar}
      talepler={talepler}
      anaTalepId={anaTalepId}
    />
  );
}
