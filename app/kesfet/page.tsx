import type { Metadata } from "next";
import { KesfetClient } from "@/components/KesfetClient";
import {
  taleplerGetir,
  kategoriSayilariGetir,
  ilgiliTalepIdleri,
} from "@/lib/veri";
import { istekOturumu } from "@/lib/oturum-sunucu";

export const metadata: Metadata = {
  title: "Talepleri Keşfet",
  description:
    "Gerçek alıcı taleplerini kategori, il ve fiyata göre filtrele; karşılayabileceğin taleplere sunum yap.",
};

export default async function KesfetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string; muadil?: string }>;
}) {
  const { q, kategori, muadil } = await searchParams;
  // ?muadil=1 → yalnızca muadil kabul eden talepler. Muadil ürün getirebilen
  // satıcı filtreyi işaretlediğinde adres de paylaşılabilir olsun.
  const sadeceMuadil = muadil === "1" || muadil === "true";
  const kats = kategori ? [kategori] : [];
  const [talepler, katSayilari, ilgililer] = await Promise.all([
    taleplerGetir(),
    kategoriSayilariGetir(),
    // Oturumsuz ziyaretçinin ilgili talebi olmaz; sorgu hiç yapılmaz.
    istekOturumu().then((ben) => (ben ? ilgiliTalepIdleri(ben) : [])),
  ]);
  // key: aynı rotada q/kategori değişince client'ı remount ederek
  // filtre state'ini yeni parametreyle yeniden başlatır (arama senkronu).
  return (
    <KesfetClient
      key={`${q ?? ""}|${kategori ?? ""}|${sadeceMuadil}`}
      talepler={talepler}
      katSayilari={katSayilari}
      initialQ={q ?? ""}
      initialKats={kats}
      initialMuadil={sadeceMuadil}
      ilgiliTalepler={ilgililer}
    />
  );
}
