// ── Roller ────────────────────────────────────────────────────────────
// BACKEND SINIRI: "Bu kullanıcı destek ekibinden mi?" sorusunun tek cevap
// yeri burasıdır. Bugün ortam değişkeninden okunur; gerçek auth geldiğinde
// yalnızca bu dosyanın içi değişir, çağıran uçlar aynı kalır.
//
// BULBANA_DESTEK="ayse.demir,destek1" gibi virgüllü liste beklenir.

import { timingSafeEqual } from "node:crypto";

function liste(env: string | undefined): string[] {
  return (env ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Destek ekibi: itiraz kararı verir, para iadesini işler. */
export function destekEkibiMi(kullanici: string): boolean {
  return liste(process.env.BULBANA_DESTEK).includes(kullanici);
}

/** Yönetici: her şeyi görebilir. */
export function yoneticiMi(kullanici: string): boolean {
  return liste(process.env.BULBANA_ADMIN).includes(kullanici);
}

/** Destek yetkisi gereken işlemler için tek kontrol noktası. */
export function destekYetkisi(kullanici: string): boolean {
  return destekEkibiMi(kullanici) || yoneticiMi(kullanici);
}

/**
 * Kargo firmasının webhook çağrısını doğrular.
 * `x-bulbana-imza` başlığı BULBANA_KARGO_ANAHTARI ile eşleşmelidir.
 *
 * Anahtar tanımlı değilse çağrı HER ORTAMDA reddedilir.
 *
 * Bir dönem geliştirmede `true` dönülüyordu ("yerel akış denenebilsin"
 * diye). Ama önizleme ve staging dağıtımları da `production` değildir:
 * o ortamlarda teslim bildirimi uydurulabiliyor, böylece 24 saatlik
 * otomatik onay sayacı başlatılıp para satıcıya akıtılabiliyordu.
 * Yerelde denemek için `.env.local`'a bir anahtar yazmak yeterli —
 * bu, bir güvenlik kontrolünü ortama göre gevşetmekten iyidir.
 *
 * Karşılaştırma sabit zamanlıdır: `===` ilk farklı baytta durduğu için
 * anahtar bayt bayt tahmin edilebilirdi.
 */
export function kargoWebhookGecerli(istek: Request): boolean {
  const anahtar = process.env.BULBANA_KARGO_ANAHTARI;
  if (!anahtar) return false;
  return esitMi(istek.headers.get("x-bulbana-imza") ?? "", anahtar);
}

/** Sabit zamanlı dize karşılaştırması. */
function esitMi(gelen: string, beklenen: string): boolean {
  const a = Buffer.from(gelen);
  const b = Buffer.from(beklenen);
  // Uzunluk farkı zaten sızıyor; eşit uzunlukta tampon üzerinden karşılaştır.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
