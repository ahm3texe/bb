import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { talepGetir } from "@/lib/veri";
import { SunumYapClient } from "@/components/SunumYapClient";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const talep = await talepGetir(id);
  if (!talep) return { title: "Talep bulunamadı" };
  return {
    title: `Sunum yap · ${talep.baslik}`,
    description: `${talep.baslik} talebine sunum hazırla: alıcının beklentilerini yanıtla, fotoğraflarını ve fiyatını ilet.`,
  };
}

// Talepler sürekli değiştiği için build anında sabitlenmez; istek anında
// sunucuda render edilir.

export default async function SunumYapPage({ params }: Params) {
  const { id } = await params;
  const talep = await talepGetir(id);
  if (!talep) notFound();

  return <SunumYapClient talep={talep} />;
}
