import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  kullaniciProfilGetir,
  kullaniciTalepleriGetir,
  islemlerGetir,
} from "@/lib/veri";
import { istekOturumu } from "@/lib/oturum-sunucu";
import { KullaniciProfili } from "@/components/KullaniciProfili";

type Params = { params: Promise<{ kullanici: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kullanici } = await params;
  const k = await kullaniciProfilGetir(kullanici);
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
  const k = await kullaniciProfilGetir(kullanici);
  if (!k) notFound();

  // Kendi adresine gelen kullanıcı ziyaretçi görünümünde kalmasın:
  // "Profilim" sayfası taleplerini ve gelen sunumlarını yönetebildiği yer.
  if (k.kullanici === (await istekOturumu())) redirect("/profil");

  const [acikTalepler, islemler] = await Promise.all([
    kullaniciTalepleriGetir(k.kullanici),
    islemlerGetir(k.kullanici),
  ]);

  return (
    <KullaniciProfili
      k={k}
      acikTalepler={acikTalepler}
      kendiProfilim={false}
      islemler={islemler}
    />
  );
}
