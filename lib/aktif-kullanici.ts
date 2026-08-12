"use client";

import { useEffect, useState } from "react";
import { getKullanici, kullanicilar } from "./kullanicilar";
import { oturumKullaniciAdi } from "./oturum";
import type { Kullanici } from "./kullanicilar";

// ── Aktif hesap ───────────────────────────────────────────────────────
// Önizlemede siteyi iki taraflı (alıcı/satıcı) test edebilmek için
// hesaplar arasında geçiş yapılabilir. Gerçek bir oturum sistemi
// gelene kadar seçim tarayıcıda saklanır.

const ANAHTAR = "bb:aktif-kullanici";
/** Aynı sekmedeki bileşenleri haberdar eden olay. */
const OLAY = "bb:aktif-kullanici-degisti";

export function aktifKullaniciAdiOku(): string {
  if (typeof window === "undefined") return oturumKullaniciAdi();
  try {
    const ad = window.localStorage.getItem(ANAHTAR);
    return ad && getKullanici(ad) ? ad : oturumKullaniciAdi();
  } catch {
    return oturumKullaniciAdi();
  }
}

/** Hesabı değiştirir ve dinleyen bileşenleri tazeler. */
export function hesapDegistir(kullanici: string): void {
  if (typeof window === "undefined" || !getKullanici(kullanici)) return;
  try {
    window.localStorage.setItem(ANAHTAR, kullanici);
  } catch {
    // Kota dolu / gizli mod — sadece bu oturum için geçersiz kalır.
  }
  window.dispatchEvent(new Event(OLAY));
}

/**
 * Aktif hesabın kaydı. İlk render sunucu çıktısıyla aynı olsun diye
 * varsayılan hesapla başlar, ardından kayıtlı seçim uygulanır.
 */
export function useAktifKullanici(): Kullanici {
  const [ad, setAd] = useState(oturumKullaniciAdi);

  useEffect(() => {
    const yenile = () => setAd(aktifKullaniciAdiOku());
    yenile();
    window.addEventListener(OLAY, yenile);
    window.addEventListener("storage", yenile);
    return () => {
      window.removeEventListener(OLAY, yenile);
      window.removeEventListener("storage", yenile);
    };
  }, []);

  return getKullanici(ad) ?? (getKullanici(oturumKullaniciAdi()) as Kullanici);
}

/** Hesap değiştiricide listelenecek kullanıcılar. */
export const secilebilirKullanicilar = kullanicilar;
