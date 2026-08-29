import type { Metadata } from "next";
import { DestekClient } from "@/components/DestekClient";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Destek Kaydı",
  description:
    "Sipariş, ödeme, ilan ve hesap konularında destek kaydı oluştur; ekip hafta içi ortalama 2 saat içinde yanıtlar.",
};

/**
 * Sohbetteki "ürün anlatıldığı gibi değil" yanıtı buraya yönlendirir;
 * konu ve sipariş numarası adres satırından gelir ve forma hazır düşer.
 */
export default async function DestekPage({
  searchParams,
}: {
  searchParams: Promise<{ konu?: string; siparis?: string }>;
}) {
  const { konu, siparis } = await searchParams;
  const teslimSorunu = konu === "teslim";

  return (
    <DestekClient
      hazirKonu={teslimSorunu ? "Sipariş & Kargo" : ""}
      hazirRefNo={siparis ?? ""}
      hazirBaslik={
        siparis ? "Teslim edilen ürün ilanda anlatıldığı gibi değil" : ""
      }
    />
  );
}
