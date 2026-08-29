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

/**
 * DEĞERLENDİRİLEN kişinin o alışverişteki rolü.
 *
 * Kayıttaki `rol` YAZANIN rolüdür; değerlendirilen her zaman karşı roldedir.
 * Alıcının yazdığı yorum satıcı hakkındadır, satıcının yazdığı alıcı
 * hakkında.
 */
export function degerlendirilenRol(d: Degerlendirme): "alici" | "satici" {
  return d.rol === "alici" ? "satici" : "alici";
}

/**
 * Bir kişi hakkındaki değerlendirmeleri ROLE GÖRE ayırır.
 *
 * Profil hem alıcı hem satıcı kimliğini taşıyor; ikisini tek ortalamada
 * toplamak sayıyı okunamaz hâle getiriyordu. Dahası "Alıcı Kalitesi" skoru
 * bu karışık ortalamadan besleniyordu: kişinin SATICI olarak aldığı
 * yıldızlar alıcı seviyesini yükseltiyordu.
 */
export function rolAyir(liste: Degerlendirme[]): {
  alici: Degerlendirme[];
  satici: Degerlendirme[];
} {
  return {
    alici: liste.filter((d) => degerlendirilenRol(d) === "alici"),
    satici: liste.filter((d) => degerlendirilenRol(d) === "satici"),
  };
}

/** Bir kullanıcının aldığı puanların ortalaması (0 = değerlendirme yok). */
export function puanOrtalamasi(liste: Degerlendirme[]): number {
  if (!liste.length) return 0;
  return liste.reduce((t, d) => t + d.puan, 0) / liste.length;
}
