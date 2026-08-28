// ── Parola saklama ────────────────────────────────────────────────────
// BACKEND SINIRI: parolanın hash'lendiği ve doğrulandığı tek yer.
//
// KURAL: parolanın kendisi hiçbir yere yazılmaz. Kayda yalnızca scrypt
// türevi girer ve o türevden parola geri hesaplanamaz.
//
// Neden scrypt: Node'un içinde var (bağımlılık yok) ve bellek-zor bir
// fonksiyon — GPU ile toplu deneme saldırısını pahalı kılar. SHA-256 gibi
// hızlı bir özet burada YANLIŞ olurdu: hız, saldırganın işine yarar.
//
// Her parolanın kendi tuzu (salt) vardır: aynı parolayı seçen iki hesabın
// kaydı aynı görünmez, dolayısıyla hazır tablo saldırıları işe yaramaz.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  parola: string,
  tuz: Buffer,
  uzunluk: number,
  secenekler: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt maliyet parametreleri. `N` iki katına çıkarıldığında hem süre hem
 * bellek iki katına çıkar. Kayıt biçimi parametreleri de taşıdığı için
 * bunlar ileride artırılabilir; eski kayıtlar kendi parametreleriyle
 * doğrulanmaya devam eder.
 */
const N = 16384;
const R = 8;
const P = 1;
const ANAHTAR_UZUNLUK = 64;
const TUZ_UZUNLUK = 16;
/** Varsayılan 32 MB sınırı N=16384, r=8 için yetmiyor. */
const MAXMEM = 64 * 1024 * 1024;

/** Parolanın uçtan uca kabul edilebilir sınırları. */
export const EN_AZ_PAROLA = 8;
/**
 * Üst sınır bir güvenlik önlemi: scrypt girdiyi tamamen işlediği için
 * sınırsız uzun bir parola sunucuyu meşgul etmenin ucuz bir yolu olurdu.
 */
export const EN_FAZLA_PAROLA = 200;

/** Parola kurallara uyuyor mu? Uymuyorsa gerekçe, uyuyorsa `null`. */
export function parolaKuralHatasi(parola: unknown): string | null {
  if (typeof parola !== "string") return "Parola gerekli.";
  if (parola.length < EN_AZ_PAROLA)
    return `Parola en az ${EN_AZ_PAROLA} karakter olmalı.`;
  if (parola.length > EN_FAZLA_PAROLA)
    return `Parola en fazla ${EN_FAZLA_PAROLA} karakter olabilir.`;
  return null;
}

/**
 * Parolayı saklanabilir bir kayda çevirir:
 * `scrypt$<N>$<r>$<p>$<tuz>$<türev>`
 *
 * Parametreler kaydın içinde taşınır ki maliyet ileride artırıldığında
 * eski kayıtlar doğrulanabilir kalsın.
 */
export async function parolaHashle(parola: string): Promise<string> {
  const tuz = randomBytes(TUZ_UZUNLUK);
  const turev = await scryptAsync(parola, tuz, ANAHTAR_UZUNLUK, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    tuz.toString("base64url"),
    turev.toString("base64url"),
  ].join("$");
}

/**
 * Parola bu kayda ait mi?
 *
 * Karşılaştırma sabit zamanlıdır: `===` ilk farklı baytta durduğu için
 * türev bayt bayt tahmin edilebilirdi.
 *
 * Kayıt bozuksa ya da tanınmayan bir biçimdeyse `false` döner — hata
 * fırlatmaz, çünkü çağıran taraf için sonuç aynıdır: giriş başarısız.
 */
export async function parolaDogrula(
  parola: string,
  kayit: string,
): Promise<boolean> {
  const parcalar = kayit.split("$");
  if (parcalar.length !== 6 || parcalar[0] !== "scrypt") return false;

  const [, nHam, rHam, pHam, tuzB64, turevB64] = parcalar;
  const n = Number(nHam);
  const r = Number(rHam);
  const p = Number(pHam);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p))
    return false;
  // Kayıttan gelen parametreye körü körüne güvenilmez: uydurulmuş devasa
  // bir `N` sunucuyu kilitleyebilirdi.
  if (n < 1024 || n > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16)
    return false;

  let tuz: Buffer;
  let beklenen: Buffer;
  try {
    tuz = Buffer.from(tuzB64, "base64url");
    beklenen = Buffer.from(turevB64, "base64url");
  } catch {
    return false;
  }
  if (!tuz.length || !beklenen.length) return false;

  try {
    const turev = await scryptAsync(parola, tuz, beklenen.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    });
    if (turev.length !== beklenen.length) return false;
    return timingSafeEqual(turev, beklenen);
  } catch {
    return false;
  }
}
