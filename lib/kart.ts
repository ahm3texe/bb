// ── Kayıtlı kartlar ───────────────────────────────────────────────────
// ÖNEMLİ: Bulbana kart numarasını ve CVV'yi SAKLAMAZ. Kayıtta yalnızca
// kartı tanımaya yetecek maskeli bilgi durur: marka, son dört hane, son
// kullanma tarihi ve kart üzerindeki isim.
//
// Gerçek sistemde tam numara ödeme kuruluşuna gider; kuruluş geri bir
// "token" döner ve tekrar eden ödemeler o token ile yapılır. O gün için
// burada bir `token?: string` alanı AYRILMIŞTI — hiçbir yerde yazılmıyor
// ve okunmuyordu. Kullanılmayan bir alan, var olmayan bir yeteneği
// varmış gibi gösteriyor; tahsilat bağlandığında eklenmesi zaten tek
// satır (bkz. BACKEND.md).

/** Bir hesapta tutulabilecek en fazla kart sayısı. */
export const EN_FAZLA_KART = 5;

export type KayitliKart = {
  id: string;
  /** Kartın sahibi — başka kullanıcının kartı okunamaz. */
  kullanici: string;
  /** VISA / MASTERCARD / TROY / AMEX / KART (bkz. kartMarkasi) */
  marka: string;
  son4: string;
  /** AA/YYYY */
  skt: string;
  isim: string;
  varsayilan: boolean;
};

/** Numaranın ilk hanelerinden kart markasını çıkarır. */
export function kartMarkasi(numara: string): string {
  const n = numara.replace(/\D/g, "");
  if (/^4/.test(n)) return "VISA";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "MASTERCARD";
  if (/^9792/.test(n)) return "TROY";
  if (/^3[47]/.test(n)) return "AMEX";
  return "KART";
}

/** Kart numarası doğrulaması (Luhn) — yazım hatalarını yakalar. */
export function kartNumarasiGecerli(numara: string): boolean {
  const n = numara.replace(/\D/g, "");
  if (n.length < 15 || n.length > 19) return false;
  let toplam = 0;
  let ikile = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let basamak = Number(n[i]);
    if (ikile) {
      basamak *= 2;
      if (basamak > 9) basamak -= 9;
    }
    toplam += basamak;
    ikile = !ikile;
  }
  return toplam % 10 === 0;
}

/**
 * Son kullanma tarihi geçerli mi? "AA/YYYY" biçimi + gerçek ay + geçmemiş.
 *
 * Biçim kontrolü uçta vardı ama içerik yoktu: "99/1999" gibi olmayan bir ay
 * ya da çoktan geçmiş bir tarih kabul ediliyordu. Ödemeye komşu bir kayıtta
 * bu, kullanıcının ödeme anında sürprizle karşılaşması demektir.
 */
export function sktGecerliMi(skt: string, simdi = new Date()): boolean {
  const eslesme = /^(\d{2})\/(\d{4})$/.exec(skt.trim());
  if (!eslesme) return false;
  const ay = Number(eslesme[1]);
  const yil = Number(eslesme[2]);
  if (ay < 1 || ay > 12) return false;
  // Makul üst sınır: 20 yıldan uzak tarih yazım hatasıdır.
  if (yil > simdi.getFullYear() + 20) return false;
  // Kart, son kullanma ayının SONUNA kadar geçerlidir.
  return new Date(yil, ay, 1) > simdi;
}

// ── Form biçimlendirme ────────────────────────────────────────────────
// Kart alanları hem ödeme ekranında hem ayarlardaki kart formunda var.
// Biçimlendirme iki yerde ayrı ayrı yazılıydı; aynı işi yapan iki kopya,
// biri düzeltilince öteki geride kalır (bkz. BASLIK_SINIR'da çıkan aynı
// sorun). Tek kaynak burası.

/**
 * Kart numarasını dörderli gruplar: `1234 5678 9012 3456`.
 *
 * Sondaki gruptan sonra boşluk bırakılmaz (`trim`): bırakılsaydı dördüncü
 * rakamdan sonra geri silen kullanıcı boşluğu siliyor, biçimlendirici onu
 * geri koyuyor ve silme hiç ilerlemiyordu.
 */
export function kartNoBicimle(ham: string): string {
  return ham
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/**
 * Son kullanma tarihine `/` işaretini KENDİ KOYAR: kullanıcı yalnızca
 * rakam yazar, ay tamamlanınca ayraç kendiliğinden düşer.
 *
 * Silme davranışı ayrıca ele alınmalı, yoksa alan KİLİTLENİR: "12/" yazan
 * kullanıcı geri sildiğinde tarayıcı "/" işaretini kaldırıp "12" bırakır,
 * biçimlendirici de onu görüp yeniden "12/" yapar ve silme hiç ilerlemez.
 * Bu yüzden ayraçtan yapılan silmede ondan önceki RAKAM düşürülür —
 * kullanıcının silmek istediği zaten oydu.
 */
export function sktBicimle(ham: string, onceki: string): string {
  let d = ham.replace(/\D/g, "").slice(0, 4);
  if (onceki.endsWith("/") && ham.length < onceki.length) d = d.slice(0, -1);
  return d.length >= 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
