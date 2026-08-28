// ── İşlemler ──────────────────────────────────────────────────────────
// Tamamlanmış her alışveriş TEK bir kayıttır: alıcısı ve satıcısı vardır.
// Aynı kayıt, alıcının "Aldıklarım" listesinde ve satıcının "Sattıklarım"
// listesinde görünür — böylece iki taraf birbiriyle çelişemez.
//
// Buradaki her işlem KAPANMIŞ sayılır: bedeli ödenmiş, teslimatı
// onaylanmış, satıcının hesabına geçmiştir. Devam eden siparişler bu
// listeye hiç girmez.

/** Bulbana hizmet bedeli oranı. */
export const KOMISYON_ORANI = 0.04;

/**
 * Talep ve sunumun ORTAK alanları. İşlem dökümünde iki panel yan yana
 * durur; karşılaştırma ancak iki taraf aynı alanları aynı sırada
 * gösterirse okunur olur — bu yüzden alan listesi tek tiptir.
 */
export type UrunBilgisi = {
  /** Talepte belirlenen fiyat, sunumda anlaşılan fiyat (TL). */
  fiyat: number;
  durum: string;
  defo: string;
  marka: string;
  model: string;
  yil: string;
  renk: string;
};

export type IslemTalep = UrunBilgisi & {
  konum: string;
  acilis: string;
  aciklama: string;
  sunumSayisi: number;
};

export type IslemSunum = UrunBilgisi & {
  urun: string;
  kutu: boolean;
  fatura: boolean;
  kargo: string;
  teslim: string;
  not: string;
};

export type Islem = {
  id: string;
  /** Talebi açan kişinin ilan başlığı. */
  ilanBaslik: string;
  kategori: string;
  /** Talebi açan ve ürünü satın alan kullanıcı. */
  alici: string;
  /** Sunumu kabul edilen, ürünü gönderen kullanıcı. */
  satici: string;
  tarih: string;
  /** Sıralama için makine okunur tarih. */
  tarihIso: string;
  /** Anlaşılan ürün bedeli (TL). */
  fiyat: number;
  /**
   * KARGO BEDELİ BURADA TUTULMAZ. Gönderiyi satıcı yapar ve bedeli
   * Bulbana'nın kasasından geçmez. Sunumda seçilen firma bilgi olarak
   * durur (`IslemSunum.kargo`) ama muhasebeye girmez.
   *
   * Eskiden `kargo: number` alanı vardı ve HER ZAMAN 0 yazılıyordu — hesabı
   * yapması gereken satırın iki dalı da sıfır döndürüyordu. Ortada tahsil
   * edilen bir kargo bedeli olmadığı için alan da kaldırıldı.
   */
  /*
   * PARA DURUMU BURADA TUTULMAZ — türetilir (bkz. paraDurumlari).
   *
   * Eskiden `paraDurumu` alanı kayda yazılıyor ve aktarım tamamlanınca
   * "IBAN'a aktarıldı" olarak güncelleniyordu. Aynı parayı iki ayrı
   * mekanizma birden düşüyordu: bu alan `bakiyedekiTutar`'dan, aktarım
   * kaydı da `cekilebilirTutar`'dan. Sonuç, satıcının parasının bir
   * kısmının kalıcı olarak çekilemez hale gelmesiydi.
   *
   * Tek gerçek kaynak artık aktarım defteri. Etiket ondan hesaplanır.
   */
  talep: IslemTalep;
  sunum: IslemSunum;
};

/** Satıştan kesilen hizmet bedeli. */
export function komisyon(i: Islem): number {
  return Math.round(i.fiyat * KOMISYON_ORANI);
}

const yeniden = (a: Islem, b: Islem) => b.tarihIso.localeCompare(a.tarihIso);

// NOT: Kayıtlar artık depodan (`.veri/islemler.json`) gelir; bu modül
// yalnızca hesaplama yapar. Her fonksiyon işlem listesini dışarıdan alır ki
// sunucu verisi ile ekran arasında ikinci bir gerçek kaynağı oluşmasın.

/** Kullanıcının satın aldığı işlemler — yeniden eskiye. */
export function alimlar(liste: Islem[], kullanici: string): Islem[] {
  return liste.filter((i) => i.alici === kullanici).sort(yeniden);
}

/** Kullanıcının sattığı işlemler — yeniden eskiye. */
export function satislar(liste: Islem[], kullanici: string): Islem[] {
  return liste.filter((i) => i.satici === kullanici).sort(yeniden);
}

/** Alımların toplamı — Bulbana üzerinden ödenen ürün bedelleri. */
export function toplamHarcama(liste: Islem[], kullanici: string): number {
  return alimlar(liste, kullanici).reduce((t, i) => t + i.fiyat, 0);
}

/** Satışların brüt toplamı, kesilen komisyon ve eldeki net kazanç. */
export function satisOzeti(
  liste: Islem[],
  kullanici: string,
): { brut: number; komisyon: number; net: number } {
  const kendi = satislar(liste, kullanici);
  const brut = kendi.reduce((t, i) => t + i.fiyat, 0);
  const kesinti = kendi.reduce((t, i) => t + komisyon(i), 0);
  return { brut, komisyon: kesinti, net: brut - kesinti };
}

/**
 * Satıştan kazanılan toplam net gelir (komisyon düşülmüş).
 *
 * Aktarılan tutar BURADAN düşülmez; aktarım defteri ayrı tutulur ve
 * `cekilebilirTutar` iki kaynağı bir kez birleştirir. İkisinde birden
 * düşmek, aynı parayı iki kez saymak olurdu.
 */
export function bakiyedekiTutar(liste: Islem[], kullanici: string): number {
  return satislar(liste, kullanici).reduce(
    (t, i) => t + i.fiyat - komisyon(i),
    0,
  );
}

/** Satıcı tarafında bir işlemin parasının nerede olduğu. */
export type ParaDurumu = "Bakiyede" | "IBAN'a aktarıldı";

/**
 * Her satışın parası nerede? Aktarım defterinden TÜRETİLİR.
 *
 * Etiket kaçınılmaz olarak yaklaşıktır: aktarımlar TUTAR olarak yapılır,
 * satış başına değil. Bu yüzden eşleştirme şöyle: en eski satıştan başlanır,
 * aktarılan tutara SIĞAN her satış "aktarıldı" sayılır, sığmayan atlanır ve
 * sıradakine bakılır. Tutarın ortasında kalan satış bakiyede görünür —
 * parasının tamamı henüz çıkmamıştır.
 *
 * Kayda yazılmadığı için çifte düşüm yapısal olarak imkânsız: bu fonksiyon
 * yalnızca ETİKET üretir, hiçbir tutarı değiştirmez. Paranın gerçek hesabı
 * `bakiyedekiTutar` + `cekilebilirTutar` ikilisindedir.
 */
export function paraDurumlari(
  liste: Islem[],
  kullanici: string,
  aktarilanToplam: number,
): Map<string, ParaDurumu> {
  const eskiden = [...satislar(liste, kullanici)].reverse();
  const harita = new Map<string, ParaDurumu>();
  let kalan = aktarilanToplam;
  for (const i of eskiden) {
    const net = i.fiyat - komisyon(i);
    if (net <= kalan) {
      harita.set(i.id, "IBAN'a aktarıldı");
      kalan -= net;
    } else {
      harita.set(i.id, "Bakiyede");
    }
  }
  return harita;
}

export type MaliHareket = {
  slug: string;
  tarih: string;
  tarihIso: string;
  ilanBaslik: string;
  urun: string;
  /** Karşı taraf — alımda satıcı, satışta alıcı. */
  kisi: string;
  tur: "alim" | "satis";
  /** Kasaya giren (+) ya da çıkan (−) net tutar. */
  tutar: number;
  /** Satışlarda komisyon; alımlarda kesinti yoktur. */
  kesinti: number;
  kesintiEtiketi: string;
};

/**
 * Alım ve satışları tek kronolojik listede birleştirir. Tutar işaretlidir:
 * satış geliri artı, alım harcaması eksi.
 */
export function maliHareketler(
  liste: Islem[],
  kullanici: string,
): MaliHareket[] {
  const a: MaliHareket[] = alimlar(liste, kullanici).map((i) => ({
    slug: `alim-${i.id}`,
    tarih: i.tarih,
    tarihIso: i.tarihIso,
    ilanBaslik: i.ilanBaslik,
    urun: i.sunum.urun,
    kisi: i.satici,
    tur: "alim",
    tutar: -i.fiyat,
    kesinti: 0,
    kesintiEtiketi: "—",
  }));
  const s: MaliHareket[] = satislar(liste, kullanici).map((i) => ({
    slug: `satis-${i.id}`,
    tarih: i.tarih,
    tarihIso: i.tarihIso,
    ilanBaslik: i.ilanBaslik,
    urun: i.sunum.urun,
    kisi: i.alici,
    tur: "satis",
    tutar: i.fiyat - komisyon(i),
    kesinti: komisyon(i),
    kesintiEtiketi: "komisyon",
  }));
  return [...a, ...s].sort((x, y) => y.tarihIso.localeCompare(x.tarihIso));
}

/** "alim-<id>" / "satis-<id>" → işlem + bakış açısı. */
export function getIslemSlug(
  liste: Islem[],
  slug: string,
): { islem: Islem; tur: "alim" | "satis" } | undefined {
  const tur = slug.startsWith("alim-")
    ? ("alim" as const)
    : slug.startsWith("satis-")
      ? ("satis" as const)
      : null;
  if (!tur) return undefined;
  const id = slug.slice(tur.length + 1);
  const islem = liste.find((i) => i.id === id);
  return islem ? { islem, tur } : undefined;
}
