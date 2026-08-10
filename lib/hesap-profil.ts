"use client";

import { useEffect, useState } from "react";

// ── Oturum sahibinin profil bilgileri ─────────────────────────────────
// Ayarlar > Profil bilgileri formu ile Profilim sayfasındaki kimlik kartı
// aynı kaynağı okur; "Hakkında" alanına yazılan metin kartta birebir çıkar.
// Üretimde bu bir API çağrısı olur — burada localStorage prototipi.

export type HesapProfil = {
  ad: string;
  soyad: string;
  /** Kullanıcı adı profilde görünür ama ayarlardan değiştirilmez. */
  kullanici: string;
  email: string;
  /** ISO tarih (YYYY-AA-GG) — <input type="date"> ile aynı biçim. */
  dogumTarihi: string;
  telefon: string;
  bio: string;
};

export const HESAP_PROFIL_VARSAYILAN: HesapProfil = {
  ad: "Emre",
  soyad: "Kaya",
  kullanici: "emre.k",
  email: "emre.k@eposta.com",
  dogumTarihi: "1994-06-12",
  telefon: "+90 5•• ••• 42 18",
  bio: "Koleksiyoncuyum; plak, CD ve retro elektronik ararım. Sunumları aynı gün incelerim, anlaştığımda ödemeyi bekletmem.",
};

const ANAHTAR = "bb:hesap-profil";
/** Aynı sekmedeki diğer bileşenleri haberdar eden olay ("storage" sekmeler arası çalışır). */
const OLAY = "bb:hesap-profil-degisti";

export function hesapProfilOku(): HesapProfil {
  if (typeof window === "undefined") return HESAP_PROFIL_VARSAYILAN;
  try {
    const ham = window.localStorage.getItem(ANAHTAR);
    if (!ham) return HESAP_PROFIL_VARSAYILAN;
    // Eksik alan gelirse varsayılanla tamamlanır.
    return { ...HESAP_PROFIL_VARSAYILAN, ...(JSON.parse(ham) as HesapProfil) };
  } catch {
    return HESAP_PROFIL_VARSAYILAN;
  }
}

export function hesapProfilYaz(profil: HesapProfil): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANAHTAR, JSON.stringify(profil));
  } catch {
    // Kota dolu / gizli mod — kaydetmeden devam et.
  }
  window.dispatchEvent(new Event(OLAY));
}

/**
 * Kayıtlı profili döndürür. İlk render varsayılanla yapılır (sunucu
 * çıktısıyla birebir aynı olsun diye), ardından localStorage'daki değer
 * uygulanır.
 */
export function useHesapProfil(): HesapProfil {
  const [profil, setProfil] = useState<HesapProfil>(HESAP_PROFIL_VARSAYILAN);

  useEffect(() => {
    const yenile = () => setProfil(hesapProfilOku());
    yenile();
    window.addEventListener(OLAY, yenile);
    window.addEventListener("storage", yenile);
    return () => {
      window.removeEventListener(OLAY, yenile);
      window.removeEventListener("storage", yenile);
    };
  }, []);

  return profil;
}
