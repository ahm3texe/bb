import type { Metadata } from "next";
import { MesajlarClient } from "@/components/MesajlarClient";
import { sohbetlerGetir, tumTaleplerGetir } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mesajlar",
  description:
    "Satıcılarla sohbet et, teklifleri karşılaştır, pazarlığı yürüt ve anlaşınca ödemeni güvenceye al — hepsi tek ekranda.",
};

export default async function MesajlarPage({
  searchParams,
}: {
  searchParams: Promise<{ satici?: string; sunum?: string; sohbet?: string }>;
}) {
  // `?sunum=` sohbeti DOĞRUDAN adresler; `?satici=` karşı tarafın adından
  // arar ve kendi sunumuna bakan satıcıda eşleşme bulamıyordu.
  const { satici, sunum, sohbet } = await searchParams;
  const [konusmalar, talepler] = await Promise.all([
    sohbetlerGetir(await istekKullaniciAdi()),
    tumTaleplerGetir(),
  ]);
  return (
    <MesajlarClient
      satici={satici}
      sunumId={sunum}
      sohbetId={sohbet}
      konusmalar={konusmalar}
      talepler={talepler}
    />
  );
}
