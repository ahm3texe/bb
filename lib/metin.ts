// ── Metin temizliği ───────────────────────────────────────────────────
// Uçlar gövdeden gelen metni `trim().slice()` ile alıyordu. İkisi de bazı
// bozulma ve gizleme biçimlerine karşı yetersiz:
//
//  1. GÖRÜNMEZ KARAKTERLER. `trim()` yalnızca boşluk sayılan karakterleri
//     siler; sıfır genişlikli boşluk (U+200B) boşluk SAYILMAZ. Beş tanesi
//     "en az 5 karakter" kontrolünü geçer ve ilan bomboş görünür.
//  2. YÖN DEĞİŞTİRİCİLER. U+202E gibi karakterler metni ekranda ters
//     çevirir; içeriği olduğundan farklı göstermek için kullanılır.
//  3. SATIR SONLARI. Kart başlığı, marka, ad gibi TEK SATIRLIK alanlarda
//     satır sonu düzeni bozar.
//
// Bu modül üçünü de kapatır. Uçlar `tekSatir` / `cokSatir` kullanır.

/**
 * Görünmez ve yön değiştirici karakterler:
 * - U+200B‥U+200F sıfır genişlikli boşluk/birleştirici + yön işaretleri
 * - U+202A‥U+202E gömme ve geçersiz kılma yön denetimleri
 * - U+2066‥U+2069 yalıtım yön denetimleri
 * - U+2060‥U+2064 kelime birleştirici ve görünmez işleçler
 * - U+FEFF bayt sırası işareti
 * - C0/C1 denetim karakterleri (satır sonu ve sekme hariç tutulur)
 */
const GORUNMEZ =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

/** Ortak ilk adım: görünmezleri at. */
function ayikla(deger: unknown): string {
  if (typeof deger !== "string") return "";
  return deger.replace(GORUNMEZ, "");
}

/**
 * Tek satırlık alan: başlık, ad, marka, model, il, ilçe…
 * Tüm boşluk dizileri (satır sonu dâhil) tek boşluğa iner.
 */
export function tekSatir(deger: unknown, maks: number): string {
  return ayikla(deger).replace(/\s+/g, " ").trim().slice(0, maks);
}

/**
 * Çok satırlık alan: açıklama, not, mesaj metni.
 * Satır sonları korunur ama üst üste boş satırlar en fazla ikiye iner ve
 * satır içi boşluk dizileri tek boşluğa çekilir.
 */
export function cokSatir(deger: unknown, maks: number): string {
  return ayikla(deger)
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((s) => s.trim())
    .join("\n")
    .trim()
    .slice(0, maks);
}

// ── Karşılaştırma anahtarı ────────────────────────────────────────────
// Türkçe küçük harf dönüşümü bir tuzak taşır: `I` → `ı`, `İ` → `i`. Yani
// `toLocaleLowerCase("tr")` ile yapılan karşılaştırmalar, aynı kelimenin
// farklı yazımlarını EŞLEŞTİRMEZ:
//
//   "IPHONE"   → "ıphone"    "iPhone"    → "iphone"    ✗
//   "Istanbul" → "ıstanbul"  "İstanbul"  → "istanbul"  ✗
//   "NIKE"     → "nıke"      "Nike"      → "nike"      ✗
//
// Sonuç sessiz: alarm kurulur ama hiç ateşlenmez, arama sonuç döndürmez.
// Kullanıcı neden çalışmadığını asla anlayamaz.
//
// Çözüm: karşılaştırmadan önce Türkçe harfleri ASCII karşılıklarına katla.
// Böylece "IPHONE", "iPhone" ve "İPHONE" aynı anahtara iner. `slugUret`
// (lib/depo.ts) zaten aynı katlamayı adres üretirken yapıyor.
//
// DİKKAT: bu yalnızca KARŞILAŞTIRMA içindir. Ekranda gösterilecek metni
// asla bundan üretmeyin — "Şişli" burada "sisli" olur.

/** Büyük harfler önce katlanır; `toLowerCase` sonrası İ/I ayrımı kaybolur. */
const KATLAMA: Record<string, string> = {
  İ: "i", I: "i", ı: "i",
  Ş: "s", ş: "s",
  Ğ: "g", ğ: "g",
  Ü: "u", ü: "u",
  Ö: "o", ö: "o",
  Ç: "c", ç: "c",
  Â: "a", â: "a",
  Î: "i", î: "i",
  Û: "u", û: "u",
};

/**
 * İki metnin "aynı şeyi" gösterip göstermediğini karşılaştırmak için
 * kullanılan anahtar. Büyük/küçük harf, Türkçe karakter ve boşluk farkları
 * silinir.
 */
export function karsilastirmaAnahtari(deger: unknown): string {
  return tekSatir(deger, 200)
    .replace(/[İIıŞşĞğÜüÖöÇçÂâÎîÛû]/g, (c) => KATLAMA[c] ?? c)
    .toLowerCase();
}

/** İki metin aynı şeyi mi gösteriyor? (Türkçe yazım farkları göz ardı edilir.) */
export function ayniMi(a: unknown, b: unknown): boolean {
  return karsilastirmaAnahtari(a) === karsilastirmaAnahtari(b);
}

// ── Başlık sınırı ─────────────────────────────────────────────────────

/**
 * Talep ve sunum başlıklarının ortak üst sınırı.
 *
 * TEK SABİTTEN OKUNUR. Üç yerde üç farklı sayı vardı: talep ucu 70, sunum
 * ucu 90, sunum formu ise 80'de kesiyordu. Formun uçtan DAR olması veri
 * kaybettirmez ama sayılar birbirinden bağımsız yaşadığı sürece ters
 * yönde kayması an meselesiydi — ve o yön, kullanıcının yazdığının
 * sessizce kırpılması demek (bkz. BACKEND.md → sunum açıklamasında ve
 * adres tarifinde çıkan aynı hata). `YORUM_SINIR` ile aynı desen: form da
 * uç da bu sabiti okur.
 */
export const BASLIK_SINIR = 105;

/** Başlığın anlamlı sayılması için en az karakter. */
export const BASLIK_EN_AZ = 5;
