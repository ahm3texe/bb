"use client";

// ── İlan taslağı ──────────────────────────────────────────────────────
// Yarım kalmış ilan formunun saklandığı yer. Tek kapı: taslağı okuyan,
// yazan ve silen başka hiçbir kod olmamalı.
//
// Mantık bir dönem `IlanAcForm` içine gömülüydü ve taslak YALNIZCA İlan Aç
// sayfası açıldığında görünüyordu: kullanıcı başka bir sayfadaysa yarım
// kalmış ilanı olduğunu hiçbir yerden öğrenemiyordu. Profilim ekranındaki
// "Taslaklar" düğmesi de aynı kaydı okuduğu için mantık ortak bir modüle
// alındı.
//
// BACKEND SINIRI — bu veri TARAYICIDA durur:
//
//   • başka cihazdan görünmez,
//   • tarayıcı verisi silinince gider,
//   • aynı anda yalnızca BİR taslak tutulur (anahtar sabit),
//   • fotoğraf ve video taşınmaz (dosyalar `localStorage`'a yazılamaz).
//
// Ekranlar bu kısıtları kullanıcıya açıkça söylemeli; "taslağın kaydedildi"
// deyip cihaz değişince kaybolması, olmayan bir yeteneği vaat etmek olur.
// Kalıcı çözüm taslağı sunucuya taşımaktır (bkz. BACKEND.md → Kalan işler);
// o gün yalnızca bu modülün içi değişir.

import { useMemo, useSyncExternalStore } from "react";
import { gecenSureIso } from "./bildirimler";
import { yerelAnahtar } from "./yerel-depo";

const ANAHTAR = "ilan-taslak";

/**
 * Taslakta saklanan alanlar — İlan Aç formunun metin/seçim durumu.
 *
 * Dosyalar bilerek yok: seçilen görseller tarayıcı belleğinde duruyor ve
 * `localStorage`'a yazılamaz.
 */
export type IlanTaslagi = {
  kategori: string;
  baslik: string;
  aciklama: string;
  fiyat: string;
  acilSecim: boolean;
  pazarlikSecim: boolean;
  muadilSecim: boolean;
  tur: string;
  cesit: string;
  marka: string;
  model: string;
  yil: string;
  renk: string;
  defo: null | boolean;
  durumlar: string[];
  il: string;
  ilce: string;
  mahalle: string;
  cadde: string;
  apartman: string;
  kat: string;
  daire: string;
  konumTarifi: string;
  /**
   * Kaydedilme anı (ISO).
   *
   * Sonradan eklendi: taslak listesi "ne zaman bıraktım?" sorusunu
   * yanıtlayamıyordu. Damgası olmayan eski kayıtlar için `undefined` kalır
   * ve ekran tarih yerine bir şey göstermez — uydurma tarih yazmaktansa
   * boş bırakmak doğrudur.
   */
  kaydedildi?: string;
};

/** Taslağı okur. Yoksa ya da kayıt bozuksa `null`. */
export function taslakOku(): IlanTaslagi | null {
  if (typeof window === "undefined") return null;
  try {
    const ham = window.localStorage.getItem(yerelAnahtar(ANAHTAR));
    if (!ham) return null;
    const veri = JSON.parse(ham) as Partial<IlanTaslagi>;
    // En azından bir alanı dolu olmalı; boş nesne taslak sayılmaz.
    if (!veri || typeof veri !== "object") return null;
    return veri as IlanTaslagi;
  } catch {
    // Bozuk JSON ya da depolama kapalı: taslak yok say.
    return null;
  }
}

/**
 * Taslağı yazar. BAŞARIYI DÖNDÜRÜR.
 *
 * Çağıran taraf "kaydedildi" demeden önce buna bakmalı: gizli sekmede ya
 * da kotası dolu tarayıcıda yazma başarısız olur ve kullanıcı kaydettiğini
 * sanıp formu kapatırsa her şeyi kaybeder.
 */
export function taslakYaz(taslak: Omit<IlanTaslagi, "kaydedildi">): boolean {
  if (typeof window === "undefined") return false;
  try {
    const kayit: IlanTaslagi = {
      ...taslak,
      kaydedildi: new Date().toISOString(),
    };
    window.localStorage.setItem(yerelAnahtar(ANAHTAR), JSON.stringify(kayit));
    taslakDegistiBildir();
    return true;
  } catch {
    return false;
  }
}

/** Taslağı siler. */
export function taslakSil(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(yerelAnahtar(ANAHTAR));
    taslakDegistiBildir();
  } catch {
    // Depolama kapalıysa zaten yazılamamıştır.
  }
}

/**
 * Aynı sekmedeki dinleyicilere haber verir.
 *
 * Tarayıcının `storage` olayı yazmayı YAPAN sekmede tetiklenmez; bu olay
 * olmadan kullanıcı taslağı kaydettiği sekmede listeyi eski görürdü.
 */
function taslakDegistiBildir(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OLAY));
}

/** Taslakta gerçekten doldurulmuş bir şey var mı? */
export function taslakDoluMu(t: IlanTaslagi | null): boolean {
  if (!t) return false;
  return Boolean(
    t.baslik?.trim() ||
      t.aciklama?.trim() ||
      t.kategori ||
      t.fiyat?.trim() ||
      t.marka?.trim(),
  );
}

/**
 * "az önce kaydedildi" · "3 saat önce kaydedildi" — taslağın yaşı.
 *
 * `gecenSureIso` yakın zaman için zaten "az önce" döndürüyor; sonuna
 * körlemesine " önce" eklemek "az önce önce kaydedildi" üretiyordu.
 * Damga yoksa boş metin döner ve ekran tarih satırını hiç yazmaz.
 */
export function taslakZamanMetni(kaydedildi?: string): string {
  if (!kaydedildi) return "";
  const sure = gecenSureIso(kaydedildi, "");
  if (!sure) return "";
  return sure === "az önce" ? "az önce kaydedildi" : `${sure} önce kaydedildi`;
}

/**
 * Taslağın listede gösterilecek özeti.
 *
 * Başlık boşsa "İsimsiz taslak" denir — boş bir satır göstermek, kaydın
 * ne olduğunu sormaktan daha kötüdür.
 */
export function taslakOzeti(t: IlanTaslagi): {
  baslik: string;
  kategori: string;
  fiyat: string;
  kaydedildi?: string;
} {
  return {
    baslik: t.baslik?.trim() || "İsimsiz taslak",
    kategori: t.kategori || "Kategori seçilmedi",
    fiyat: t.fiyat?.trim() ? `${t.fiyat} TL` : "Fiyat girilmedi",
    kaydedildi: t.kaydedildi,
  };
}

// ── Ekranların taslağı izlemesi ───────────────────────────────────────

/**
 * `localStorage` değişimini dinler.
 *
 * `storage` olayı yalnızca BAŞKA sekmelerde tetiklenir; aynı sekmedeki
 * yazmalar için modül kendi olayını yayar (`taslakDegisti`). İkisi birden
 * dinlenmezse kullanıcı ilanı kaydettiği sekmede listeyi eski görürdü.
 */
const OLAY = "bulbana:taslak-degisti";

function taslakAboneOl(bildir: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", bildir);
  window.addEventListener(OLAY, bildir);
  return () => {
    window.removeEventListener("storage", bildir);
    window.removeEventListener(OLAY, bildir);
  };
}

/**
 * Ham JSON metni — `useSyncExternalStore` için anlık görüntü.
 *
 * METİN döndürmek şart: her çağrıda yeni bir nesne üretmek referansı
 * değiştirir ve React'i sonsuz döngüye sokar. Ayrıştırma çağıran tarafta,
 * `useMemo` ile yapılır.
 */
function taslakHamOku(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(yerelAnahtar(ANAHTAR));
  } catch {
    return null;
  }
}

/** Sunucuda taslak yoktur; ilk render her zaman boş gelir. */
function sunucuGoruntusu(): string | null {
  return null;
}

/**
 * Kayıtlı taslağı okuyan hook — yoksa `null`.
 *
 * `useEffect` + `setState` yerine `useSyncExternalStore` kullanılır: React
 * 19'da effect içinde senkron `setState` kaskad render uyarısı veriyor ve
 * `localStorage` zaten "harici depo" tanımına giriyor. Yan fayda: taslak
 * başka bir sekmede kaydedilir ya da silinirse bu ekran da kendiliğinden
 * güncellenir.
 */
export function useTaslak(): IlanTaslagi | null {
  const ham = useSyncExternalStore(
    taslakAboneOl,
    taslakHamOku,
    sunucuGoruntusu,
  );

  return useMemo(() => {
    if (!ham) return null;
    try {
      const veri = JSON.parse(ham) as IlanTaslagi;
      return taslakDoluMu(veri) ? veri : null;
    } catch {
      return null;
    }
  }, [ham]);
}
