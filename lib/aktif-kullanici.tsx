"use client";

import { createContext, useContext } from "react";
import type { Kullanici } from "./kullanicilar";

// ── Oturumdaki hesap (istemci tarafı) ─────────────────────────────────
// Bu modül eskiden bir HESAP DEĞİŞTİRİCİYDİ: seçim `localStorage`'a ve
// imzasız bir çereze yazılıyor, sunucu da o çereze bakıp kimliği
// belirliyordu. Yani hesap seçmek, kimlik seçmekle aynı şeydi — tarayıcı
// konsoluna tek satır yazan herkes istediği hesap olabiliyordu.
//
// Artık kimlik yalnızca sunucuda belirlenir: oturum çerezi HMAC ile
// imzalıdır ve `httpOnly` olduğu için JavaScript onu ne okuyabilir ne
// yazabilir (bkz. lib/oturum-imza.ts). Bu modülün tek işi kaldı: sunucunun
// çözdüğü hesabı React ağacına dağıtmak.
//
// Değeri kök yerleşim (`app/layout.tsx`) sunucuda okur ve sağlayıcıya
// prop olarak geçer — projenin "client bileşen veriyi prop olarak alır"
// kuralıyla aynı desen.

const Baglam = createContext<Kullanici | null>(null);

export function OturumSaglayici({
  kullanici,
  children,
}: {
  kullanici: Kullanici | null;
  children: React.ReactNode;
}) {
  return <Baglam.Provider value={kullanici}>{children}</Baglam.Provider>;
}

/**
 * Oturumdaki hesap — giriş yapılmamışsa `null`.
 *
 * `null` gerçek bir durumdur, kaçınılacak bir kenar durum değil: ana sayfa,
 * keşfet, ilan detayı ve ziyaretçi profili oturumsuz ziyaretçiye de açıktır
 * (bkz. lib/korumali-yollar.ts). Bu ekranlar kişiselleştirmeyi atlamalı.
 */
export function useAktifKullanici(): Kullanici | null {
  return useContext(Baglam);
}

/**
 * Oturumdaki hesap — oturum YOKSA hata fırlatır.
 *
 * Yalnızca korumalı sayfalarda render edilen bileşenler içindir: cüzdan,
 * mesajlar, sipariş, profil… Oraya oturumsuz bir isteğin ulaşmaması
 * gerekiyor; kapı `proxy.ts` içinde. Buradaki fırlatma o kapının arkasındaki
 * ikinci savunma katmanı — kapı yanlış yapılandırılırsa ekran boş veriyle
 * sessizce çizilmek yerine gürültülü biçimde durur.
 *
 * Oturumsuzluğun normal olduğu ekranlarda `useAktifKullanici()` kullanın.
 */
export function useOturumSahibi(): Kullanici {
  const kullanici = useContext(Baglam);
  if (!kullanici)
    throw new Error(
      "Bu ekran giriş gerektiriyor ama oturum bulunamadı. Yol korumalı yollar listesinde mi? (bkz. lib/korumali-yollar.ts)",
    );
  return kullanici;
}

/**
 * Bir kullanıcı adının profil adresi.
 *
 * Kendi adına tıklayan kullanıcı, başkasının gördüğü ziyaretçi profiline
 * değil kendi "Profilim" sayfasına gitmeli: orada taleplerini, gelen
 * sunumlarını ve ayarlarını yönetebiliyor.
 */
export function profilYolu(
  kullanici: string,
  aktifKullanici: string | null | undefined,
): string {
  return kullanici === aktifKullanici
    ? "/profil"
    : `/profil/${encodeURIComponent(kullanici)}`;
}
