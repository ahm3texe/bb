// ── Telefon numarası ──────────────────────────────────────────────────
// Numaranın tek doğru biçimi burada tanımlanır. Uçlar ve ekranlar aynı
// fonksiyonu kullanır; yoksa "0555…" ile "+90555…" aynı hesapta iki farklı
// kayıt gibi görünür ve doğrulanmış numara eşleşmez.
//
// Yalnızca Türkiye cep numarası kabul edilir: doğrulama kodu SMS ile
// gidiyor ve sabit hatta SMS ulaşmaz.

/**
 * Numarayı sade biçime çevirir: `+905551234567`.
 *
 * Kabul edilen girişler — hepsi aynı sonuca varır:
 *   0555 123 45 67 · 05551234567 · +90 555 123 45 67 · 905551234567 ·
 *   555 123 45 67
 *
 * Çevrilemezse `null`. Çağıran taraf bunu "geçersiz numara" sayar.
 */
export function telefonSadelestir(ham: unknown): string | null {
  if (typeof ham !== "string") return null;

  // Görünmeyen karakterler ve ayraçlar atılır; yalnızca rakam kalır.
  let rakam = ham.replace(/\D/g, "");

  // Ülke kodu varyasyonları tek biçime indirilir.
  if (rakam.startsWith("90")) rakam = rakam.slice(2);
  else if (rakam.startsWith("0")) rakam = rakam.slice(1);

  // Türkiye cep numarası: 5 ile başlayan 10 hane.
  if (!/^5\d{9}$/.test(rakam)) return null;
  return `+90${rakam}`;
}

/** Numara geçerli bir Türkiye cep numarası mı? */
export function telefonGecerliMi(ham: unknown): boolean {
  return telefonSadelestir(ham) !== null;
}

/**
 * Ekranda gösterilecek maskeli biçim: `+90 5•• ••• •• 67`.
 *
 * Numaranın tamamı arayüze inmez — kayıtlı numarayı DOĞRULAMAK için son
 * iki hane yeter, tamamını göstermek gereksiz bir sızıntıdır (IBAN'da da
 * aynı kural: bkz. lib/iban.ts).
 */
export function telefonMaskele(sade: string): string {
  const m = /^\+90(\d{10})$/.exec(sade);
  if (!m) return "";
  const h = m[1];
  return `+90 ${h[0]}•• ••• •• ${h.slice(8)}`;
}

/** İnsan okur biçim: `+90 555 123 45 67`. Yalnızca sahibine gösterilir. */
export function telefonBicimle(sade: string): string {
  const m = /^\+90(\d{10})$/.exec(sade);
  if (!m) return sade;
  const h = m[1];
  return `+90 ${h.slice(0, 3)} ${h.slice(3, 6)} ${h.slice(6, 8)} ${h.slice(8)}`;
}

/**
 * Kullanıcı YAZARKEN uygulanan biçim: `0555 123 45 67` (4-3-2-2).
 *
 * `telefonBicimle` ile karıştırılmamalı: o, kayıtlı ve sadeleştirilmiş
 * `+90…` numarayı GÖSTERMEK için. Bu ise henüz yarım olabilecek bir
 * girdiyi yazılırken gruplar, yani her tuşta çalışır.
 *
 * Ayraç sondaki gruptan sonra bırakılmaz (boş gruplar elenir): bırakılsaydı
 * dördüncü rakamdan sonra geri silen kullanıcı boşluğu siliyor,
 * biçimlendirici onu geri koyuyor ve silme hiç ilerlemiyordu.
 *
 * `telefonSadelestir` boşlukları zaten atıyor, yani biçimli değer kayda
 * olduğu gibi verilebilir.
 */
export function telefonYazarkenBicimle(ham: string): string {
  const d = ham.replace(/\D/g, "").slice(0, 11);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)]
    .filter(Boolean)
    .join(" ");
}

/**
 * Doğrulama kodu: 6 haneli sayı.
 *
 * E-postada UUID kullanılıyor çünkü kod bağlantıyla gidiyor; SMS'te
 * kullanıcı kodu ELLE yazacak, o yüzden kısa ve rakamsal olmalı. Kısalığın
 * bedeli tahmin edilebilirlik: uçtaki deneme tavanı (bkz. /api/telefon)
 * bu yüzden e-postadakinden daha sıkı tutulur.
 */
export function telefonKoduUret(rastgele: () => number = Math.random): string {
  return String(Math.floor(100000 + rastgele() * 900000));
}
