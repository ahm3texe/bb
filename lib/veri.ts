// ── Veri erişim sınırı ────────────────────────────────────────────────
// BACKEND SINIRI: Sunucu tarafındaki tüm okuma işlemleri buradan geçer.
// Bugün `lib/*.ts` içindeki sabit dizileri okur; backend bağlandığında
// SADECE bu dosyanın gövdesi değişir (fetch / Supabase / Prisma çağrısına
// dönüşür), çağıran sayfaların hiçbiri değişmez.
//
// Fonksiyonlar bilerek `async` — bugün beklenecek bir şey olmasa da
// çağrı yerleri şimdiden `await` ile yazıldığı için, gerçek ağ çağrısına
// geçildiğinde tek satır bile düzeltme gerekmeyecek.
//
// Kullanım kuralı: bu modülü YALNIZCA Server Component'ler (app/**/page.tsx)
// çağırmalı. Client bileşenler veriyi prop olarak almalı; böylece istemciye
// veri katmanı taşınmaz ve gerçek API anahtarları sızmaz.

import {
  talepler,
  getTalep,
  kategoriler,
  kategoriSayilari,
  talepGorselleri,
} from "./data";
import type { Talep, Kategori } from "./data";
import { kullanicilar, getKullanici } from "./kullanicilar";
import type { Kullanici } from "./kullanicilar";
import { gelenSunumlar } from "./gelen-sunumlar";
import type { GelenSunum } from "./gelen-sunumlar";
import { sunumlarim } from "./sunumlarim";
import { islemler } from "./islemler";
import { bildirimler } from "./bildirimler";
import { sohbetlerimFor } from "./sohbetler";

// ── Talepler ──────────────────────────────────────────────────────────

/** Yayındaki tüm talepler. */
export async function taleplerGetir(): Promise<Talep[]> {
  return talepler;
}

/** Tek talep. Bulunamazsa `undefined` — çağıran `notFound()` çağırmalı. */
export async function talepGetir(id: string): Promise<Talep | undefined> {
  return getTalep(id);
}

/** Bir kullanıcının açtığı talepler. */
export async function kullaniciTalepleriGetir(
  kullanici: string,
): Promise<Talep[]> {
  return talepler.filter((t) => t.sahibi === kullanici);
}

/** En yeni talepler (ana sayfa şeridi). */
export async function sonTaleplerGetir(adet = 10): Promise<Talep[]> {
  return [...talepler].sort((a, b) => a.eklendi - b.eklendi).slice(0, adet);
}

/** Bir talebin görsel yolları. Yükleme geldiğinde depolama URL'leri dönecek. */
export async function talepGorselleriGetir(id: string): Promise<string[]> {
  return talepGorselleri(id);
}

// ── Kategoriler ───────────────────────────────────────────────────────

/** Kategori listesi — referans veri, muhtemelen sabit kalacak. */
export async function kategorilerGetir(): Promise<Kategori[]> {
  return kategoriler;
}

/** Kategori başına açık talep sayısı. Backend'de tek bir COUNT sorgusu olur. */
export async function kategoriSayilariGetir(): Promise<Record<string, number>> {
  return kategoriSayilari();
}

// ── Kullanıcılar ──────────────────────────────────────────────────────

export async function kullanicilarGetir(): Promise<Kullanici[]> {
  return kullanicilar;
}

export async function kullaniciGetir(
  ad: string,
): Promise<Kullanici | undefined> {
  return getKullanici(ad);
}

// ── Sunumlar ──────────────────────────────────────────────────────────

/** Bir kullanıcının kendi taleplerine gelen sunumlar. */
export async function gelenSunumlarGetir(
  kullanici: string,
): Promise<GelenSunum[]> {
  const kendiTalepler = new Set(
    talepler.filter((t) => t.sahibi === kullanici).map((t) => t.id),
  );
  return gelenSunumlar.filter((s) => kendiTalepler.has(s.talepId));
}

/** Belirli bir talebe gelen sunumlar — karşılaştırma ekranı bunu kullanır. */
export async function talebeGelenSunumlarGetir(
  talepId: string,
): Promise<GelenSunum[]> {
  return gelenSunumlar.filter((s) => s.talepId === talepId);
}

/** Oturum sahibinin satıcı olarak gönderdiği sunumlar. */
export async function gonderdigimSunumlarGetir(): Promise<typeof sunumlarim> {
  return sunumlarim;
}

// ── İşlemler, bildirimler, sohbetler ──────────────────────────────────

/** Kullanıcının taraf olduğu tamamlanmış işlemler. */
export async function islemlerGetir(kullanici: string) {
  return islemler.filter(
    (i) => i.alici === kullanici || i.satici === kullanici,
  );
}

/** Kullanıcıya düşen bildirimler. */
export async function bildirimlerGetir(kullanici: string) {
  return bildirimler.filter((b) => b.kime === kullanici);
}

/** Kullanıcının sohbetleri — açık pazarlıklar üstte. */
export async function sohbetlerGetir(kullanici: string) {
  return sohbetlerimFor(kullanici);
}
