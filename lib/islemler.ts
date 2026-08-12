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
  /** Alıcının ayrıca ödediği kargo — satıcı karşıladıysa 0. */
  kargo: number;
  /** Satıcı tarafında paranın durumu. */
  paraDurumu: "Bakiyede" | "IBAN'a aktarıldı";
  talep: IslemTalep;
  sunum: IslemSunum;
};

/** Satıştan kesilen hizmet bedeli. */
export function komisyon(i: Islem): number {
  return Math.round(i.fiyat * KOMISYON_ORANI);
}

export const islemler: Islem[] = [];


const yeniden = (a: Islem, b: Islem) => b.tarihIso.localeCompare(a.tarihIso);

/** Kullanıcının satın aldığı işlemler — yeniden eskiye. */
export function alimlar(kullanici: string): Islem[] {
  return islemler.filter((i) => i.alici === kullanici).sort(yeniden);
}

/** Kullanıcının sattığı işlemler — yeniden eskiye. */
export function satislar(kullanici: string): Islem[] {
  return islemler.filter((i) => i.satici === kullanici).sort(yeniden);
}

/** Alımların toplamı: ürün bedeli + ödenen kargo. */
export function toplamHarcama(kullanici: string): number {
  return alimlar(kullanici).reduce((t, i) => t + i.fiyat + i.kargo, 0);
}

/** Satışların brüt toplamı, kesilen komisyon ve eldeki net kazanç. */
export function satisOzeti(kullanici: string): {
  brut: number;
  komisyon: number;
  net: number;
} {
  const liste = satislar(kullanici);
  const brut = liste.reduce((t, i) => t + i.fiyat, 0);
  const kesinti = liste.reduce((t, i) => t + komisyon(i), 0);
  return { brut, komisyon: kesinti, net: brut - kesinti };
}

/** Henüz IBAN'a aktarılmamış, bakiyede duran net satış geliri. */
export function bakiyedekiTutar(kullanici: string): number {
  return satislar(kullanici)
    .filter((i) => i.paraDurumu === "Bakiyede")
    .reduce((t, i) => t + i.fiyat - komisyon(i), 0);
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
  /** Satışlarda komisyon, alımlarda ödenen kargo. */
  kesinti: number;
  kesintiEtiketi: string;
};

/**
 * Alım ve satışları tek kronolojik listede birleştirir. Tutar işaretlidir:
 * satış geliri artı, alım harcaması eksi.
 */
export function maliHareketler(kullanici: string): MaliHareket[] {
  const a: MaliHareket[] = alimlar(kullanici).map((i) => ({
    slug: `alim-${i.id}`,
    tarih: i.tarih,
    tarihIso: i.tarihIso,
    ilanBaslik: i.ilanBaslik,
    urun: i.sunum.urun,
    kisi: i.satici,
    tur: "alim",
    tutar: -(i.fiyat + i.kargo),
    kesinti: i.kargo,
    kesintiEtiketi: i.kargo ? "kargo" : "—",
  }));
  const s: MaliHareket[] = satislar(kullanici).map((i) => ({
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

/** İşlem dökümü sayfasının kimlikleri: her işlem iki taraf için de açılır. */
export function islemSluglari(): string[] {
  return islemler.flatMap((i) => [`alim-${i.id}`, `satis-${i.id}`]);
}

/** "alim-<id>" / "satis-<id>" → işlem + bakış açısı. */
export function getIslemSlug(
  slug: string,
): { islem: Islem; tur: "alim" | "satis" } | undefined {
  const tur = slug.startsWith("alim-")
    ? ("alim" as const)
    : slug.startsWith("satis-")
      ? ("satis" as const)
      : null;
  if (!tur) return undefined;
  const id = slug.slice(tur.length + 1);
  const islem = islemler.find((i) => i.id === id);
  return islem ? { islem, tur } : undefined;
}
