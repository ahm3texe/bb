import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { talepGetir, taleplerGetir } from "@/lib/veri";
import { IlanDetay } from "@/components/IlanDetay";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const talep = await talepGetir(id);
  if (!talep) return { title: "Talep bulunamadı" };
  return {
    title: talep.baslik,
    description: `${talep.ilce}, ${talep.il} · Alıcının belirlediği fiyat: ${talep.fiyatNum.toLocaleString("tr-TR")} TL. Uygun ürünün varsa sunumunu ilet.`,
  };
}

// NOT: Burada bilerek `generateStaticParams` yok. İlanlar sürekli açılıp
// kapandığı için build anında sabitlemek yanlış olur — sayfa istek anında
// sunucuda render edilir. Trafik arttığında `export const revalidate = 60`
// ekleyerek ISR'ye geçilebilir.

export default async function IlanPage({ params }: Params) {
  const { id } = await params;
  const talep = await talepGetir(id);
  if (!talep) notFound();

  const hepsi = await taleplerGetir();
  const benzer = [
    ...hepsi.filter((t) => t.id !== id && t.kategori === talep.kategori),
    ...hepsi.filter((t) => t.id !== id && t.kategori !== talep.kategori),
  ].slice(0, 4);

  return <IlanDetay talep={talep} benzer={benzer} />;
}
