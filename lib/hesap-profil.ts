"use client";

import { useCallback, useEffect, useState } from "react";
import { getKullanici } from "./kullanicilar";
import { useOturumSahibi } from "./aktif-kullanici";

// ── Oturum sahibinin profil bilgileri ─────────────────────────────────
// Ayarlar > Profil bilgileri formu ile Profilim sayfasındaki kimlik kartı
// aynı kaynağı okur.
//
// ARTIK SUNUCUDA. Bu veri bir dönem yalnızca tarayıcının `localStorage`'ında
// duruyordu ve iki şeyi birden bozuyordu:
//   • başka cihazdan girince kayboluyordu,
//   • herkese açık profildeki "Hakkında" metni `lib/kullanicilar.ts`'teki
//     sabit kayıttan geliyordu — yani kullanıcının yazdığı biyografi
//     YALNIZCA KENDİSİNE görünüyordu.
// Kaynak `app/api/profil`; `localStorage` kullanımı buraya geri EKLENMEMELİ.

export type HesapProfil = {
  ad: string;
  soyad: string;
  /** Kullanıcı adı profilde görünür ama ayarlardan değiştirilmez. */
  kullanici: string;
  /** ISO tarih (YYYY-AA-GG) — <input type="date"> ile aynı biçim. */
  dogumTarihi: string;
  telefon: string;
  bio: string;
};

/**
 * Hesabın varsayılan profil bilgileri — kullanıcı kaydından türetilir.
 * Sunucudan yanıt gelene kadar ekranda bu görünür.
 */
export function varsayilanProfil(kullanici: string): HesapProfil {
  const kayit = getKullanici(kullanici);
  const [ad = "", ...kalan] = (kayit?.ad ?? kullanici).split(" ");
  return {
    ad,
    soyad: kalan.join(" "),
    kullanici,
    dogumTarihi: "",
    telefon: "",
    bio: kayit?.bio ?? "",
  };
}

/** Profili sunucuya yazar. Başarısızsa hata mesajı döner, aksi hâlde `null`. */
export async function hesapProfilYaz(
  profil: HesapProfil,
): Promise<string | null> {
  try {
    const r = await fetch("/api/profil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad: profil.ad,
        soyad: profil.soyad,
        telefon: profil.telefon,
        dogumTarihi: profil.dogumTarihi,
        bio: profil.bio,
      }),
    });
    const v = (await r.json().catch(() => ({}))) as { hata?: string };
    if (!r.ok) return v.hata ?? "Profil kaydedilemedi.";
    return null;
  } catch {
    return "Sunucuya ulaşılamadı.";
  }
}

/**
 * Oturum sahibinin profili. İlk render varsayılanla yapılır (sunucu
 * çıktısıyla birebir aynı olsun diye), ardından sunucudaki kayıt uygulanır.
 */
export function useHesapProfil(): HesapProfil & { yenile: () => void } {
  const oturum = useOturumSahibi();
  const [profil, setProfil] = useState<HesapProfil>(() =>
    varsayilanProfil(oturum.kullanici),
  );

  const yenile = useCallback(() => {
    fetch("/api/profil")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: { profil?: HesapProfil } | null) => {
        if (v?.profil) setProfil(v.profil);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let iptal = false;
    fetch("/api/profil")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: { profil?: HesapProfil } | null) => {
        if (!iptal && v?.profil) setProfil(v.profil);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [oturum.kullanici]);

  return { ...profil, yenile };
}
