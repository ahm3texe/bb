// ── Bildirimler ───────────────────────────────────────────────────────
// Her bildirim bir kullanıcıya aittir (`kime`). Hesap değiştirildiğinde
// zil ve bildirim sayfası o hesabın kayıtlarını gösterir.

export type BildirimTip = "sunum" | "teklif" | "kargo" | "sistem";
export type BildirimGrup = "Bugün" | "Dün" | "Daha önce";

export type Bildirim = {
  id: number;
  /** Bildirimin sahibi — kullanıcı adı. */
  kime: string;
  grup: BildirimGrup;
  tip: BildirimTip;
  harf: string;
  /** Yuvarlak simgenin tailwind sınıfları. */
  avatar: string;
  text: string;
  sub: string;
  zaman: string;
  href: string;
  yeni: boolean;
};

export const bildirimler: Bildirim[] = [];


/** Bir hesabın bildirimleri. */
export function bildirimlerimFor(kullanici: string): Bildirim[] {
  return bildirimler.filter((b) => b.kime === kullanici);
}

/** Okunmamış bildirim sayısı — zildeki rozet. */
export function okunmamisSayisi(kullanici: string): number {
  return bildirimlerimFor(kullanici).filter((b) => b.yeni).length;
}
