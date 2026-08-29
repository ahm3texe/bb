import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { talepGetir, acikSunumumGetir } from "@/lib/veri";
import { SunumYapClient } from "@/components/SunumYapClient";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

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

  // Kural sunucuda: sonuçlanmamış sunumu olan satıcı formu doğrudan
  // adresten de açamaz.
  if (await acikSunumumGetir(id, await istekKullaniciAdi()))
    redirect(`/ilan/${id}`);

  return <SunumYapClient talep={talep} />;
}
