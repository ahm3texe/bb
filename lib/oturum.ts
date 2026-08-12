// ── Oturum ────────────────────────────────────────────────────────────
// BACKEND SINIRI: "Kim giriş yapmış?" sorusunun tek cevap yeri burasıdır.
// Bugün sabit bir kullanıcı adı döner; gerçek kimlik doğrulama geldiğinde
// yalnızca bu dosyanın içi değişir, çağıran hiçbir bileşen değişmez.
//
// Dikkat: burada İKİ ayrı kavram var, karıştırılmamalı —
//   1. Oturum sahibi  : gerçekten giriş yapmış hesap (auth'tan gelir).
//   2. Aktif hesap    : önizlemede hesap değiştiricinin seçtiği hesap
//                       (lib/aktif-kullanici.ts, localStorage).
// Aktif hesap yalnızca demo içindir; gerçek oturum açıldığında hesap
// değiştirici kaldırılmalı veya yönetici "impersonation" özelliğine
// dönüştürülmelidir. Yetki kontrolü ASLA aktif hesaba bakarak yapılmamalı.

import { talepler } from "./data";
import type { Talep } from "./data";

/** Prototipte oturumu açık sayılan hesap. Auth gelince buradan silinecek. */
const VARSAYILAN_OTURUM = "melih.k";

/**
 * Oturumu açık kullanıcının adı.
 *
 * Backend'e geçişte: sunucu tarafında oturum çerezinden okunacak, bu yüzden
 * imza `Promise<string>` olacak. Çağrı yerlerini şimdiden tek noktaya
 * topladığımız için o değişiklik bu dosyayla sınırlı kalır.
 */
export function oturumKullaniciAdi(): string {
  return VARSAYILAN_OTURUM;
}

/** Verilen kullanıcı adı oturum sahibinin kendisi mi? */
export function oturumSahibiMi(kullanici: string): boolean {
  return kullanici === oturumKullaniciAdi();
}

/** Oturum sahibinin açtığı talepler. */
export function oturumTalepleri(): Talep[] {
  const ben = oturumKullaniciAdi();
  return talepler.filter((t) => t.sahibi === ben);
}

/**
 * Yönetim ve sunum ekranlarının çapası: oturum sahibinin ilk talebi.
 * Talebi yoksa `undefined` döner — çağıran taraf boş durum göstermelidir.
 *
 * Eskiden bu bir sabitti (`KENDI_TALEP_ID`), yani hangi ilanın "benim" olduğu
 * kodda gömülüydü. Artık veriden türüyor; gerçek ilanlar geldiğinde
 * kendiliğinden doğru çalışır.
 */
export function oturumAnaTalepId(): string | undefined {
  return oturumTalepleri()[0]?.id;
}
