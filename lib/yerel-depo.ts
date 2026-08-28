// ── Tarayıcı deposu (localStorage) ────────────────────────────────────
// Önizleme kalıntıları: hesap seçimi, ayarlardan girilen profil ve ilan
// taslağı bugün tarayıcıda tutuluyor. Bunlar DEMO verisidir; gerçek profil
// API'den gelmeye başlayınca aynı anahtarlar hâlâ okunuyorsa kullanıcı
// kendi eski verisini görür ve sunucudan geleni gölgeler.
//
// Çözüm: her anahtara SÜRÜM öneki. Veri şekli değiştiğinde `YEREL_SURUM`
// artırılır; eski önekli her kayıt geçersiz olur ve ilk okumada silinir.
// Böylece "eski veri yeni ekranı bozdu" hatası tek satırla kapanır.

/**
 * Tarayıcıda tutulan verinin sürümü.
 *
 * ARTIRMA ZAMANI: profil/taslak alanlarının şekli değiştiğinde ya da bu
 * veriler sunucudan gelmeye başladığında. Artırınca eski kayıtlar
 * kendiliğinden düşer — ayrıca göç kodu yazmak gerekmez.
 */
export const YEREL_SURUM = "v1";

const ONEK = `bb:${YEREL_SURUM}:`;

/** Sürümlü anahtar üretir: `ad` → `bb:v1:ad`. */
export function yerelAnahtar(ad: string): string {
  return `${ONEK}${ad}`;
}

/**
 * Bu sürüme ait olmayan tüm Bulbana anahtarlarını siler.
 *
 * Sürüm önekinden önce yazılmış anahtarlar (`bb:aktif-kullanici`,
 * `bb:hesap-profil:*`, `bb_ilan_taslak`) ve eski sürüm önekleri temizlenir.
 * Idempotenttir; her çağrıda güvenle çalışır.
 */
export function eskiYerelKayitlariTemizle(): void {
  if (typeof window === "undefined") return;
  try {
    const silinecek: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const anahtar = window.localStorage.key(i);
      if (!anahtar) continue;
      const bizim = anahtar.startsWith("bb:") || anahtar.startsWith("bb_");
      if (bizim && !anahtar.startsWith(ONEK)) silinecek.push(anahtar);
    }
    for (const a of silinecek) window.localStorage.removeItem(a);
  } catch {
    // Kota / gizli mod — temizlik yapılamazsa akış bozulmamalı.
  }
}
