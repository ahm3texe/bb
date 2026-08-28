import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { siparisGetir, sunumGetir } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { OdemeClient } from "@/components/OdemeClient";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sunumId: string }> };

export const metadata: Metadata = {
  title: "Ödeme",
  description:
    "Anlaştığın tutarı güvenceye al; ödeme doğrulandığında satıcının kargo süresi başlar.",
};

export default async function OdemePage({ params }: Params) {
  const { sunumId } = await params;
  const anlasma = await siparisGetir(sunumId);
  if (!anlasma) notFound();

  // Ödeme sayfası yalnızca alıcınındır; satıcı ya da üçüncü biri açamaz.
  const kim = await istekKullaniciAdi();
  if (kim !== anlasma.alici) redirect("/mesajlar");
  // Ödenmiş siparişte ödeme ekranının işi yok.
  if (anlasma.odemeZamani) redirect("/mesajlar");

  const sunum = await sunumGetir(sunumId);

  return (
    <OdemeClient
      anlasma={anlasma}
      urun={sunum?.ne ?? sunum?.baslik ?? "Ürün"}
      teslim={sunum?.teslim ?? ""}
    />
  );
}
