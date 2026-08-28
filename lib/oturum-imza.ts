// ── Oturum çerezinin imzası ───────────────────────────────────────────
// BACKEND SINIRI: oturum çerezinin üretildiği ve doğrulandığı tek yer.
//
// NEDEN VAR: çerez bir dönem düz metindi (`bb_aktif_kullanici=melih.k`) ve
// istemci tarafından yazılabiliyordu. Yani tarayıcı konsoluna tek satır
// yazan herkes istediği hesap olabiliyordu — sahiplik, taraf olma ve
// destek rolü dâhil BÜTÜN yetki kuralları o değere dayandığı için hepsi
// birden geçersizdi.
//
// Artık çerezin gövdesini sunucu HMAC-SHA256 ile imzalar. İmza anahtarı
// sunucuda kalır, dolayısıyla istemci geçerli bir çerez ÜRETEMEZ; yalnızca
// sunucunun verdiğini taşıyabilir.
//
// DİKKAT — bunun kapsamadığı şey: imza, çerezin sahte OLMADIĞINI söyler,
// çerezi hak edip etmediğini söylemez. Kimliğin gerçekten doğrulanması
// çerezi DAĞITAN uçta olur (bkz. lib/oturum-sunucu.ts → oturumCereziBas).
// İmza tek başına kimlik doğrulaması değildir.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Çerez adı. Eski düz metin çerezle aynı ad kullanılmaz: biçim değişti. */
export const OTURUM_CEREZI = "bb_oturum";

/** Alanları ayıran karakter. Base64url alfabesinde bulunmaz. */
const AYIRAC = "~";

/** Oturumun geçerlilik süresi. */
export const OTURUM_SURESI_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * İmza anahtarı. Yeterince uzun bir değer tanımlı değilse `null` döner ve
 * oturum üretimi/doğrulaması TAMAMEN kapanır.
 *
 * Kasıtlı olarak "başarısızsa kapan": anahtar unutulduğunda oturumun
 * imzasız çalışmaya devam etmesi, düzeltmeye çalıştığımız açığın ta
 * kendisi olurdu. Anahtarsız sunucuda kimse giriş yapamaz — bu görünür
 * bir arıza, sessiz bir açık değil.
 */
function anahtar(): string | null {
  const ham = process.env.BULBANA_OTURUM_ANAHTARI ?? "";
  return ham.length >= 32 ? ham : null;
}

/** İmza anahtarı tanımlı mı? Kurulum hatasını erken bildirmek için. */
export function oturumAnahtariVarMi(): boolean {
  return anahtar() !== null;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const b64Coz = (s: string) => Buffer.from(s, "base64url").toString("utf8");

function imzala(govde: string, gizli: string): string {
  return createHmac("sha256", gizli).update(govde).digest("base64url");
}

/**
 * İmzalı çerez değeri üretir: `<kullanıcı>~<bitiş>~<imza>`.
 *
 * Kullanıcı adı base64url ile kodlanır — kullanıcı adları nokta içeriyor
 * (`melih.k`, `ayse.demir`), ayraçla çakışmaması garanti altına alınmalı.
 *
 * Anahtar yoksa `null` döner; çağıran taraf oturum açmayı reddetmeli.
 */
export function oturumImzala(
  kullanici: string,
  simdi = Date.now(),
): string | null {
  const gizli = anahtar();
  if (!gizli || !kullanici) return null;
  const govde = `${b64(kullanici)}${AYIRAC}${simdi + OTURUM_SURESI_MS}`;
  return `${govde}${AYIRAC}${imzala(govde, gizli)}`;
}

/** Sabit zamanlı karşılaştırma — imza bayt bayt tahmin edilemesin. */
function esitMi(gelen: string, beklenen: string): boolean {
  const a = Buffer.from(gelen);
  const b = Buffer.from(beklenen);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Çerezi doğrular ve kullanıcı adını döndürür.
 *
 * `null` dönen her durum "oturum yok" demektir: imza tutmuyor, süresi
 * dolmuş, biçim bozuk ya da sunucuda anahtar tanımlı değil. Çağıran taraf
 * bu üç durumu AYIRT ETMEMELİ — hepsinin karşılığı aynı: giriş gerekiyor.
 */
export function oturumCoz(
  cerez: string | undefined,
  simdi = Date.now(),
): string | null {
  const gizli = anahtar();
  if (!gizli || !cerez) return null;

  const parcalar = cerez.split(AYIRAC);
  if (parcalar.length !== 3) return null;
  const [kullaniciB64, bitis, imza] = parcalar;

  // İmza ÖNCE doğrulanır: gövdenin içeriğine imza tutmadan güvenilmez.
  if (!esitMi(imza, imzala(`${kullaniciB64}${AYIRAC}${bitis}`, gizli)))
    return null;

  const son = Number(bitis);
  if (!Number.isFinite(son) || simdi >= son) return null;

  try {
    const kullanici = b64Coz(kullaniciB64);
    return kullanici || null;
  } catch {
    return null;
  }
}
