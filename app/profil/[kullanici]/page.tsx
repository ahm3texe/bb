import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  kullaniciProfilGetir,
  kullaniciTalepleriGetir,
  islemlerGetir,
  sohbetlerGetir,
} from "@/lib/veri";
import { karsiTarafFor } from "@/lib/sohbetler";
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

  const ben = await istekOturumu();
  const [acikTalepler, islemler, sohbetlerim] = await Promise.all([
    kullaniciTalepleriGetir(k.kullanici),
    islemlerGetir(k.kullanici),
    ben ? sohbetlerGetir(ben) : Promise.resolve([]),
  ]);

  /*
   * "Mesaj Gönder" HEDEFLİ olmalı.
   *
   * Düğme düz `/mesajlar`a gidiyordu: mesajlar ekranı parametresiz gelince
   * listenin İLK sohbetini açar, yani başkasının profilinden mesaj atmaya
   * çalışan kişi alakasız birinin konuşmasına düşüyordu.
   *
   * Sohbetler yalnızca sunumdan doğar (bkz. lib/veri.ts → sohbetlerGetir);
   * aramızda sunum yoksa açılacak bir sohbet de yoktur. O durumda düğme
   * "gider gibi yapmak" yerine niye açılamadığını söylüyor.
   */
  const ortakSohbet = sohbetlerim.find(
    (s) => ben && karsiTarafFor(s, ben) === k.kullanici,
  );

  return (
    <KullaniciProfili
      k={k}
      acikTalepler={acikTalepler}
      kendiProfilim={false}
      islemler={islemler}
      sohbetYolu={
        ortakSohbet
          ? `/mesajlar?sohbet=${encodeURIComponent(ortakSohbet.id)}`
          : ""
      }
    />
  );
}
