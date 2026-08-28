// ── Değerlendirmeler ──────────────────────────────────────────────────
// Alışveriş bittikten sonra iki taraf birbirini puanlar.
//
// Sınır 50 karakterdi ve ÇOK AZDI: "ürün anlatıldığı gibiydi, kargo hızlı"
// bile sığmıyordu; değerlendirme yazan kişi cümlesini kesmek zorunda
// kalıyordu. 300 karakter birkaç cümleye yetiyor ama hâlâ okunacak kadar
// kısa — profildeki liste tek bakışta taranabilir kalsın.

/** Yorum uzunluğu sınırı. */
export const YORUM_SINIR = 300;

export type Degerlendirme = {
  id: string;
  /** Hangi alışverişe ait — anlaşma sunum kimliğiyle anılır. */
  sunumId: string;
  talepId: string;
  /** Değerlendirmeyi yazan kullanıcı. */
  yazan: string;
  /** Değerlendirilen kullanıcı. */
  hakkinda: string;
  /** Yazanın bu alışverişteki rolü. */
  rol: "alici" | "satici";
  /** 1-5 yıldız. */
  puan: number;
  /** En fazla YORUM_SINIR karakter. */
  yorum: string;
  zaman: string;
};

/** Bir kullanıcının aldığı puanların ortalaması (0 = değerlendirme yok). */
export function puanOrtalamasi(liste: Degerlendirme[]): number {
  if (!liste.length) return 0;
  return liste.reduce((t, d) => t + d.puan, 0) / liste.length;
}
