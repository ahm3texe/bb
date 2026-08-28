// ── Para tutarları ────────────────────────────────────────────────────
// Tutar, komisyon → bakiye → IBAN aktarımı zincirinin başı. Gövdeden gelen
// bir sayıyı doğrudan kullanmak iki ayrı hataya yol açıyordu:
//
//  1. KESİR. `Number(govde.fiyatNum)` ondalık kabul ediyordu. 3333.3333 TL
//     ekranda "3.333,333 TL" diye görünüyor ve kesir komisyondan bakiyeye
//     kadar taşınıyordu. Bir uçta (`talepler` PATCH) `Math.round` vardı,
//     diğerlerinde yoktu — yani aynı alan iki uçta farklı davranıyordu.
//
//  2. TİP ZORLAMASI. `Number([5])` 5, `Number(true)` 1 döndürür. Dizi ya da
//     mantıksal değer gönderen bir istek sessizce geçerli tutara dönüşüyordu.
//
// Bu modül ikisini de kapatır ve üst sınırı tek yerde tutar.

/** Bir tutarın üst sınırı — talep, sunum ve teklif için ortak bant. */
export const MAX_FIYAT = 10_000_000;

/**
 * Gövdeden gelen tutarı doğrular ve tam sayıya yuvarlar.
 *
 * Kabul: `number`, ya da sayıya çevrilebilen `string` (form alanları metin
 * gönderebiliyor).
 * Reddeder: dizi, mantıksal değer, null, nesne, NaN, sonsuz, sıfır ve altı,
 * üst bandı aşan.
 *
 * Geçersizse `null` döner — çağıran taraf hata mesajını kendi seçer.
 */
export function paraTutari(deger: unknown, enFazla = MAX_FIYAT): number | null {
  // Tip zorlamasına izin verilmez: yalnızca sayı ve metin.
  if (typeof deger !== "number" && typeof deger !== "string") return null;
  if (typeof deger === "string" && deger.trim() === "") return null;

  const ham = Number(deger);
  if (!Number.isFinite(ham)) return null;

  const tutar = Math.round(ham);
  if (tutar <= 0 || tutar > enFazla) return null;
  return tutar;
}
