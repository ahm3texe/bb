import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTalep, talepler, KENDI_TALEP_ID } from "@/lib/data";
import { SunumYapClient } from "@/components/SunumYapClient";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const talep = getTalep(id);
  if (!talep) return { title: "Talep bulunamadı" };
  return {
    title: `Sunum yap · ${talep.baslik}`,
    description: `${talep.baslik} talebine sunum hazırla: alıcının beklentilerini yanıtla, fotoğraflarını ve fiyatını ilet.`,
  };
}

export function generateStaticParams() {
  return talepler
    .filter((t) => t.id !== KENDI_TALEP_ID)
    .map((t) => ({ id: t.id }));
}

export default async function SunumYapPage({ params }: Params) {
  const { id } = await params;
  const talep = getTalep(id);
  if (!talep) notFound();

  return <SunumYapClient talep={talep} />;
}
