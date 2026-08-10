// ── IBAN yardımcıları ─────────────────────────────────────────────────
// Satış gelirlerinin aktarılacağı hesap için; yalnızca Türkiye (TR) IBAN'ı
// kabul edilir. Doğrulama ISO 13616 mod-97 kuralına göre yapılır.

/** Harf/rakam dışındaki her şeyi atar, büyük harfe çevirir. */
export function ibanSadelestir(deger: string): string {
  return deger.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** "TR330006..." → "TR33 0006 ..." — 4'erli gruplar hâlinde gösterir. */
export function ibanBicimle(deger: string): string {
  return ibanSadelestir(deger).replace(/(.{4})/g, "$1 ").trim();
}

/** TR IBAN uzunluğu: "TR" + 24 karakter. */
export const IBAN_UZUNLUK = 26;

/**
 * mod-97 sağlaması. IBAN'ın ilk 4 karakteri sona alınır, harfler
 * sayıya çevrilir (A=10 … Z=35) ve sayı 97'ye bölünür; kalan 1 olmalıdır.
 */
function mod97(iban: string): number {
  const yeniden = iban.slice(4) + iban.slice(0, 4);
  let kalan = 0;
  for (const ch of yeniden) {
    const kod = ch >= "0" && ch <= "9" ? ch : String(ch.charCodeAt(0) - 55);
    kalan = Number(String(kalan) + kod) % 97;
  }
  return kalan;
}

/** IBAN geçerli bir TR IBAN'ı mı? */
export function ibanGecerliMi(deger: string): boolean {
  const iban = ibanSadelestir(deger);
  if (!/^TR\d{24}$/.test(iban)) return false;
  return mod97(iban) === 1;
}

/**
 * Kayıtlı IBAN'ı kısmen gizler: ülke kodu, sağlama hanesi ve son 4 hane
 * açık kalır — kullanıcı hesabı tanır ama tam numara ekranda durmaz.
 */
export function ibanMaskele(deger: string): string {
  const iban = ibanSadelestir(deger);
  if (iban.length < 8) return ibanBicimle(iban);
  const bas = iban.slice(0, 4);
  const son = iban.slice(-4);
  const gizli = "•".repeat(iban.length - 8);
  // Burada ibanBicimle kullanılamaz — sadeleştirme adımı "•" karakterlerini atar.
  return (bas + gizli + son).replace(/(.{4})/g, "$1 ").trim();
}
