import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTalep } from "@/lib/data";
import { getSunumum, sunumlarim } from "@/lib/sunumlarim";
import { SunumDetayClient } from "@/components/SunumDetayClient";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const kayit = getSunumum(id);
  if (!kayit) return { title: "Sunum bulunamadı" };
  return {
    title: `Sunumum · ${kayit.sunum.baslik}`,
    description: `${getTalep(kayit.talepId)?.baslik ?? "Talep"} talebine gönderdiğin sunum: fotoğraflar, künye ve kriter uyumu.`,
  };
}

export function generateStaticParams() {
  return sunumlarim.map((s) => ({ id: s.id }));
}

export default async function SunumumPage({ params }: Params) {
  const { id } = await params;
  const kayit = getSunumum(id);
  if (!kayit) notFound();

  return (
    <SunumDetayClient
      sahip
      sunum={kayit.sunum}
      talepId={kayit.talepId}
      fotoAdlari={kayit.fotoAdlari}
      talepSahibi={kayit.sahibi}
      talepSahibiHarf={kayit.harf}
      talepSahibiPuan={kayit.puan}
    />
  );
}
