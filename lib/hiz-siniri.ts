// ── Hız sınırı ────────────────────────────────────────────────────────
// Aynı hesabın kısa sürede yüzlerce kayıt açmasını engelleyen basit sayaç.
//
// BACKEND SINIRI: sayaç bellekte tutulur, yani tek sunucu içindir ve
// yeniden başlatınca sıfırlanır. Üretimde Redis/Upstash gibi paylaşımlı bir
// sayaç ya da kenar katmanındaki (WAF/CDN) hız sınırı kullanılmalı;
// `hizSinirla()` imzası aynı kalır, içi değişir.

type Kayit = { adet: number; sifirlanma: number };

const sayaclar = new Map<string, Kayit>();

/**
 * Süresi dolan kayıtlar temizlenmezse `Map` sınırsız büyür.
 *
 * Anahtar kullanıcı adı + işlem içeriyor (`sunum:melih.k`), yani kayıt
 * sayısı hesap sayısıyla doğru orantılı artıyor ve hiçbir zaman azalmıyordu
 * — yavaş ama kesin bir bellek sızıntısı.
 *
 * Temizlik zamanlanmış bir işe bağlanmıyor: her `hizSinirla` çağrısında
 * seyrek olarak yapılıyor. Böylece maliyet dağılıyor ve arka planda
 * çalışan bir servise bağımlılık doğmuyor — projenin başka yerlerindeki
 * (`anlasmalariTazele`) desenle aynı.
 */
const TEMIZLIK_ARALIGI = 500;
let cagriSayaci = 0;

function suresiDolanlariTemizle(simdi: number): void {
  for (const [anahtar, kayit] of sayaclar) {
    if (simdi >= kayit.sifirlanma) sayaclar.delete(anahtar);
  }
}

/** Test ve ölçüm için: bellekte kaç kayıt duruyor? */
export function sayacAdedi(): number {
  return sayaclar.size;
}

export type HizSonuc = { izin: true } | { izin: false; kalanSaniye: number };

/**
 * Belirli bir anahtar (kullanıcı + işlem) için pencere içinde en fazla
 * `limit` isteğe izin verir.
 */
export function hizSinirla(
  anahtar: string,
  limit: number,
  pencereMs: number,
): HizSonuc {
  const simdi = Date.now();

  if (++cagriSayaci >= TEMIZLIK_ARALIGI) {
    cagriSayaci = 0;
    suresiDolanlariTemizle(simdi);
  }

  const kayit = sayaclar.get(anahtar);

  if (!kayit || simdi >= kayit.sifirlanma) {
    sayaclar.set(anahtar, { adet: 1, sifirlanma: simdi + pencereMs });
    return { izin: true };
  }

  if (kayit.adet >= limit) {
    return {
      izin: false,
      kalanSaniye: Math.max(1, Math.ceil((kayit.sifirlanma - simdi) / 1000)),
    };
  }

  kayit.adet += 1;
  return { izin: true };
}

/** Sık kullanılan pencereler. */
export const DAKIKA = 60 * 1000;
export const SAAT = 60 * DAKIKA;
