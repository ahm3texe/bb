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
  /**
   * Eski kayıtlardaki sabit metin ("az önce"). Yeni bildirimlerde
   * `olusturuldu` üzerinden hesaplandığı için yalnızca yedek olarak durur.
   */
  zaman: string;
  /** Bildirimin oluşturulma anı (ISO). Sayaç buradan işler. */
  olusturuldu?: string;
  href: string;
  yeni: boolean;
};

// NOT: burada `bildirimler` diye HER ZAMAN BOŞ bir dizi ve onu süzen
// `bildirimlerimFor` vardı. İkisi de hiçbir yerden çağrılmıyordu ama
// "ikinci bir bildirim kaynağı var" izlenimi veriyorlardı. Gerçek kaynak
// `.veri/bildirimler.json` (bkz. lib/depo.ts → bildirimlerOku).

/**
 * Bildirimin üstünden geçen süre: "az önce" → "1 dk" → "1 saat" → "1 gün".
 * Damgası olmayan eski kayıtlarda yazılı metin ne ise o gösterilir.
 */
export function gecenSure(b: Pick<Bildirim, "zaman" | "olusturuldu">): string {
  if (!b.olusturuldu) return b.zaman;
  return gecenSureIso(b.olusturuldu, b.zaman);
}

/**
 * Bir ISO damgadan bu yana geçen süre — "az önce", "3 saat", "2 gün"…
 * Damga okunamazsa `yedek` metni döner.
 *
 * Bildirim listesi dışında sohbet listesi de bunu kullanır: orada her
 * sohbetin saati sabit "Az önce" yazıyordu (bkz. lib/veri.ts).
 */
export function gecenSureIso(iso: string, yedek = "az önce"): string {
  const fark = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(fark) || fark < 0) return yedek;

  const dk = Math.floor(fark / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk`;

  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} saat`;

  const gun = Math.floor(saat / 24);
  if (gun < 7) return `${gun} gün`;

  const hafta = Math.floor(gun / 7);
  if (hafta < 5) return `${hafta} hafta`;

  const ay = Math.floor(gun / 30);
  if (ay < 12) return `${ay} ay`;
  return `${Math.floor(gun / 365)} yıl`;
}

/** Bildirimin ait olduğu gün grubu — damgadan hesaplanır. */
export function bildirimGrubu(b: Bildirim): BildirimGrup {
  if (!b.olusturuldu) return b.grup;
  const gun = new Date(b.olusturuldu);
  const bugun = new Date();
  const gunBasi = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fark = (gunBasi(bugun) - gunBasi(gun)) / 86400000;
  if (fark <= 0) return "Bugün";
  if (fark === 1) return "Dün";
  return "Daha önce";
}
