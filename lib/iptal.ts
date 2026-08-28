// ── Düşen siparişler ──────────────────────────────────────────────────
// Kabul edilip sonuçlanmayan siparişler kayıttan siliniyor ya da kapanıyor;
// geriye iz kalmadığı için "kaç kez iptal oldu, kimin yüzünden?" sorusu
// cevapsızdı. Kullanıcı Kalitesi'ndeki `iptalEdilenAlim` sinyali bu yüzden
// herkeste 0 kalıyor ve herkese tam puan veriyordu.
//
// Bu modül iptalin KUSUR bilgisini taşır. Kayıt sipariş başına tektir.

export type IptalKusur = "alici" | "satici";

export type IptalSebep =
  /** Alıcı bir saat içinde ödemeyi yapmadı. */
  | "odeme-yapilmadi"
  /** Satıcı vaat ettiği sürede kargoya vermedi. */
  | "kargolanmadi"
  /** Alıcı itiraz etti, destek haklı buldu, para iade edildi. */
  | "itiraz-alici-hakli"
  /** Alıcı itiraz etti, destek satıcıyı haklı buldu. */
  | "itiraz-satici-hakli"
  /** "Alıcı haklı" kararına rağmen alıcı ürünü süresinde iade etmedi. */
  | "iade-edilmedi";

export type Iptal = {
  /** Sipariş başına tek kayıt — sunum kimliği. */
  sunumId: string;
  talepId: string;
  alici: string;
  satici: string;
  kusur: IptalKusur;
  sebep: IptalSebep;
  zaman: string;
};

/**
 * Hangi sebep kimin kusuru?
 *
 * "Alıcı itiraz etti ve haklı çıktı" → SATICI kusurlu: ürün anlatıldığı gibi
 * değilmiş. Simetrik olarak, itiraz reddedildiyse ya da alıcı kararı alıp
 * ürünü göndermediyse kusur alıcıdadır.
 */
export const KUSUR: Record<IptalSebep, IptalKusur> = {
  "odeme-yapilmadi": "alici",
  kargolanmadi: "satici",
  "itiraz-alici-hakli": "satici",
  "itiraz-satici-hakli": "alici",
  "iade-edilmedi": "alici",
};

/** Ekranda gösterilecek kısa gerekçe. */
export const SEBEP_METNI: Record<IptalSebep, string> = {
  "odeme-yapilmadi": "Ödeme süresinde yapılmadı",
  kargolanmadi: "Söz verilen sürede kargoya verilmedi",
  "itiraz-alici-hakli": "İtiraz alıcı lehine sonuçlandı",
  "itiraz-satici-hakli": "İtiraz satıcı lehine sonuçlandı",
  "iade-edilmedi": "Ürün süresinde iade edilmedi",
};

/** Bir kullanıcının kusurlu bulunduğu iptaller. */
export function kusurluIptaller(liste: Iptal[], kullanici: string): Iptal[] {
  return liste.filter(
    (i) =>
      (i.kusur === "alici" && i.alici === kullanici) ||
      (i.kusur === "satici" && i.satici === kullanici),
  );
}
