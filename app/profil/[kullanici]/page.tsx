import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kullaniciGetir, kullaniciTalepleriGetir } from "@/lib/veri";
import { oturumSahibiMi } from "@/lib/oturum";
import { KullaniciProfili } from "@/components/KullaniciProfili";

type Params = { params: Promise<{ kullanici: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kullanici } = await params;
  const k = await kullaniciGetir(kullanici);
  if (!k) return { title: "Kullanıcı bulunamadı" };
  return {
    title: `${k.kullanici} — Profil`,
    description: `${k.konum} · ${k.tamamlananSatis} tamamlanan satış, ${k.degerlendirme} değerlendirme. ${k.kullanici} kullanıcısının açık talepleri ve geçmiş işlemleri.`,
  };
}

// Profiller de build anında sabitlenmez: yeni üye kaydı build beklemeden
// çalışmalı. İstek anında sunucuda render edilir.

export default async function KullaniciProfilPage({ params }: Params) {
  const { kullanici } = await params;
  const k = await kullaniciGetir(kullanici);
  if (!k) notFound();

  const acikTalepler = await kullaniciTalepleriGetir(k.kullanici);

  return (
    <KullaniciProfili
      k={k}
      acikTalepler={acikTalepler}
      kendiProfilim={oturumSahibiMi(k.kullanici)}
    />
  );
}
