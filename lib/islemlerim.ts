// ── Tamamlanmış işlemlerim ────────────────────────────────────────────
// Profil > Aldıklarım / Sattıklarım sayfalarını besler. Buradaki her kayıt
// KAPANMIŞ bir işlemdir: alımda para ödenmiş ve teslimat onaylanmış,
// satışta para tahsil edilip satıcı bakiyesine geçmiştir. Devam eden
// (kargo bekleyen, alıcı onayı bekleyen, itirazlı) işlemler bu listelere
// hiç girmez — sayfaların vaadi budur.

/**
 * Talep ve sunumun ORTAK alanları. İşlem dökümünde iki panel yan yana
 * durur; karşılaştırma ancak iki taraf aynı alanları aynı sırada
 * gösterirse okunur olur — bu yüzden alan listesi tek tiptir.
 * Talepte "beklenen", sunumda "teslim edilen" değeri tutar.
 */
export type UrunBilgisi = {
  /** Talepte belirlenen bütçe, sunumda anlaşılan fiyat (TL). */
  fiyat: number;
  durum: string;
  defo: string;
  marka: string;
  model: string;
  yil: string;
  renk: string;
};

/** İşlemi başlatan talep ilanının özeti — detay ekranının sol sütunu. */
export type IslemTalep = UrunBilgisi & {
  konum: string;
  /** İlanın açıldığı tarih. */
  acilis: string;
  /** İlanda yazan beklenti. */
  aciklama: string;
  /** İlana gelen toplam sunum sayısı. */
  sunumSayisi: number;
};

/** Kazanan sunumun özeti — detay ekranının sağ sütunu. */
export type IslemSunum = UrunBilgisi & {
  /** Sunulan ürünün tam adı. */
  urun: string;
  kutu: boolean;
  fatura: boolean;
  kargo: string;
  teslim: string;
  /** Satıcının sunum notu. */
  not: string;
};

/** İşlemin karşı tarafı — alımda satıcı, satışta alıcı. */
export type KarsiTaraf = {
  kullanici: string;
  harf: string;
  puan: string;
  degerlendirme: number;
  /** Tamamladığı toplam işlem sayısı. */
  islem: number;
  konum: string;
  uyelik: string;
  rozet: string;
};

export type Alim = {
  id: string;
  urun: string;
  /** İşlemin bağlı olduğu talep ilanının başlığı. */
  ilanBaslik: string;
  talep: IslemTalep;
  sunum: IslemSunum;
  /** Ürünü satan taraf — detayda sağ sütunda gösterilir. */
  karsiTaraf: KarsiTaraf;
  /** Satın alınan satıcı. */
  satici: string;
  harf: string;
  tarih: string;
  /** Sıralama için makine okunur tarih. */
  tarihIso: string;
  /** Ürüne ödenen tutar (TL). */
  tutar: number;
  /** Alıcının ödediği kargo bedeli — satıcı karşıladıysa 0. */
  kargo: number;
};

export type Satis = {
  id: string;
  urun: string;
  /** İşlemin bağlı olduğu talep ilanının başlığı. */
  ilanBaslik: string;
  talep: IslemTalep;
  sunum: IslemSunum;
  /** Ürünü alan taraf — detayda sağ sütunda gösterilir. */
  karsiTaraf: KarsiTaraf;
  /** Ürünü alan kişi. */
  alici: string;
  harf: string;
  tarih: string;
  /** Sıralama için makine okunur tarih. */
  tarihIso: string;
  /** Alıcının ödediği tutar (TL). */
  brut: number;
  /** BulBana hizmet bedeli (TL) — brütten düşülür. */
  komisyon: number;
  /** Para nerede: satıcı bakiyesinde mi, IBAN'a aktarıldı mı. */
  durum: "Bakiyede" | "IBAN'a aktarıldı";
};

/** Tamamlanan alımlar — ödemesi yapılmış ve teslimatı onaylanmış. */
export const alimlarim: Alim[] = [
  {
    id: "sony-discman",
    urun: "Sony Discman D-EJ815",
    ilanBaslik: "Sony Discman D-EJ815 arıyorum",
    talep: {
      defo: "Defosuz olmalı",
      marka: "Sony",
      model: "Discman D-EJ815",
      yil: "Fark etmez",
      renk: "Fark etmez",
      fiyat: 3000,
      durum: "Az kullanılmış",
      konum: "Kadıköy, İstanbul",
      acilis: "2 Temmuz 2026",
      aciklama: "Çalışır durumda, kapak menteşesi sağlam olsun; anti-shock özelliği çalışmalı.",
      sunumSayisi: 6,
    },
    sunum: {
      defo: "Defo yok",
      marka: "Sony",
      model: "Discman D-EJ815",
      yil: "2001",
      renk: "Gümüş",
      urun: "Sony Discman D-EJ815 (gümüş)",
      fiyat: 2750,
      durum: "Az kullanılmış",
      kutu: false,
      fatura: false,
      kargo: "Kargo satıcıya ait",
      teslim: "1–2 gün içinde kargoda",
      not: "Kulaklık çıkışı temizlendi, pil kapağı orijinal. Test videosu ektedir.",
    },
    karsiTaraf: {
      kullanici: "retro.adana",
      harf: "RA",
      puan: "4.7",
      degerlendirme: 63,
      islem: 71,
      konum: "Seyhan, Adana",
      uyelik: "2022",
      rozet: "Güvenilir Satıcı",
    },
    satici: "retro.adana",
    harf: "RA",
    tarih: "12 Temmuz 2026",
    tarihIso: "2026-07-12",
    tutar: 2750,
    kargo: 0,
  },
  {
    id: "pink-floyd-dsotm",
    urun: 'Pink Floyd "Dark Side of the Moon" 30th CD',
    ilanBaslik: "Pink Floyd “Dark Side of the Moon” 30th baskı CD arıyorum",
    talep: {
      defo: "Defosuz olmalı",
      marka: "Pink Floyd",
      model: "Dark Side of the Moon — 30th",
      yil: "2003",
      renk: "—",
      fiyat: 2100,
      durum: "Sıfır / jelatininde",
      konum: "Kadıköy, İstanbul",
      acilis: "18 Haziran 2026",
      aciklama: "30. yıl remaster baskı; kitapçık eksiksiz ve disk çiziksiz olmalı.",
      sunumSayisi: 9,
    },
    sunum: {
      defo: "Defo yok",
      marka: "Pink Floyd",
      model: "Dark Side of the Moon — 30th (EU)",
      yil: "2003",
      renk: "—",
      urun: "Pink Floyd — Dark Side of the Moon 30th Anniversary CD",
      fiyat: 1850,
      durum: "Sıfır / jelatininde",
      kutu: true,
      fatura: false,
      kargo: "Kargo alıcıya ait",
      teslim: "Aynı gün kargoda",
      not: "Jelatini açılmamış Avrupa baskısı. Köşe ezilmesi yok, çift katman köpükle gönderiyorum.",
    },
    karsiTaraf: {
      kullanici: "plakdukkani34",
      harf: "PD",
      puan: "4.8",
      degerlendirme: 89,
      islem: 214,
      konum: "Beyoğlu, İstanbul",
      uyelik: "2023",
      rozet: "Güvenilir Satıcı",
    },
    satici: "plakdukkani34",
    harf: "PD",
    tarih: "28 Haziran 2026",
    tarihIso: "2026-06-28",
    tutar: 1850,
    kargo: 120,
  },
  {
    id: "seiko-5-otomatik",
    urun: "Seiko 5 otomatik kol saati",
    ilanBaslik: "Seiko 5 otomatik kol saati arıyorum",
    talep: {
      defo: "Hafif defo kabul",
      marka: "Seiko",
      model: "5 serisi otomatik",
      yil: "Fark etmez",
      renk: "Çelik / lacivert",
      fiyat: 7000,
      durum: "Fark etmez",
      konum: "Kadıköy, İstanbul",
      acilis: "28 Mayıs 2026",
      aciklama: "Otomatik kurulu, servis görmüş olabilir; kayış değişmişse belirtilsin.",
      sunumSayisi: 4,
    },
    sunum: {
      defo: "Kadranda çizik yok",
      marka: "Seiko",
      model: "5 SNKL23",
      yil: "2019",
      renk: "Çelik / lacivert",
      urun: "Seiko 5 SNKL23 otomatik",
      fiyat: 6400,
      durum: "Az kullanılmış",
      kutu: true,
      fatura: true,
      kargo: "Kargo satıcıya ait",
      teslim: "2–3 gün içinde kargoda",
      not: "2025'te bakımı yapıldı, servis fişi kutuda. Orijinal çelik kordon takılı.",
    },
    karsiTaraf: {
      kullanici: "saatcimehmet",
      harf: "SM",
      puan: "4.9",
      degerlendirme: 132,
      islem: 158,
      konum: "Konak, İzmir",
      uyelik: "2021",
      rozet: "Usta Satıcı",
    },
    satici: "saatcimehmet",
    harf: "SM",
    tarih: "9 Haziran 2026",
    tarihIso: "2026-06-09",
    tutar: 6400,
    kargo: 0,
  },
  {
    id: "miles-davis-plak",
    urun: 'Miles Davis "Kind of Blue" plak',
    ilanBaslik: "Miles Davis “Kind of Blue” plak arıyorum",
    talep: {
      defo: "Plak çiziksiz olmalı",
      marka: "Miles Davis",
      model: "Kind of Blue LP",
      yil: "Fark etmez",
      renk: "—",
      fiyat: 2500,
      durum: "Fark etmez",
      konum: "Kadıköy, İstanbul",
      acilis: "12 Mayıs 2026",
      aciklama: "Yeniden basım olabilir; plak yüzeyi çiziksiz, iç zarf sağlam olsun.",
      sunumSayisi: 7,
    },
    sunum: {
      defo: "Plak çiziksiz",
      marka: "Miles Davis",
      model: "Kind of Blue LP (yeniden basım)",
      yil: "2015",
      renk: "—",
      urun: "Miles Davis — Kind of Blue (2015 yeniden basım LP)",
      fiyat: 2300,
      durum: "Az kullanılmış",
      kutu: false,
      fatura: false,
      kargo: "Kargo alıcıya ait",
      teslim: "1–2 gün içinde kargoda",
      not: "Tek kez çalındı, iç zarf yenisiyle değiştirildi. Kapak köşeleri temiz.",
    },
    karsiTaraf: {
      kullanici: "analogsever",
      harf: "AS",
      puan: "4.6",
      degerlendirme: 41,
      islem: 48,
      konum: "Çankaya, Ankara",
      uyelik: "2024",
      rozet: "Bireysel Satıcı",
    },
    satici: "analogsever",
    harf: "AS",
    tarih: "21 Mayıs 2026",
    tarihIso: "2026-05-21",
    tutar: 2300,
    kargo: 150,
  },
];

/** Tamamlanan satışlar — bedeli tahsil edilip bakiyeye geçmiş. */
export const satislarim: Satis[] = [
  {
    id: "radiohead-ok-computer",
    urun: 'Radiohead "OK Computer" CD',
    ilanBaslik: "Radiohead “OK Computer” orijinal baskı CD arıyorum",
    talep: {
      defo: "Kitapçık eksiksiz olmalı",
      marka: "Radiohead",
      model: "OK Computer CD",
      yil: "1997",
      renk: "—",
      fiyat: 3000,
      durum: "Fark etmez",
      konum: "Beşiktaş, İstanbul",
      acilis: "26 Haziran 2026",
      aciklama: "Orijinal baskı arıyorum; kitapçık ve arka kapak yazıları okunur durumda olsun.",
      sunumSayisi: 5,
    },
    sunum: {
      defo: "Kutu çatlağı yok",
      marka: "Radiohead",
      model: "OK Computer CD (orijinal baskı)",
      yil: "1997",
      renk: "—",
      urun: "Radiohead — OK Computer (1997 orijinal baskı CD)",
      fiyat: 2800,
      durum: "Az kullanılmış",
      kutu: true,
      fatura: false,
      kargo: "Kargo satıcıya ait",
      teslim: "Aynı gün kargoda",
      not: "Kutu çatlağı yok, kitapçık eksiksiz. Disk yüzeyi kontrol edilip fotoğraflandı.",
    },
    karsiTaraf: {
      kullanici: "cdkolik",
      harf: "CK",
      puan: "4.9",
      degerlendirme: 57,
      islem: 64,
      konum: "Beşiktaş, İstanbul",
      uyelik: "2022",
      rozet: "Güvenilir Alıcı",
    },
    alici: "cdkolik",
    harf: "CK",
    tarih: "6 Temmuz 2026",
    tarihIso: "2026-07-06",
    brut: 2800,
    komisyon: 112,
    durum: "Bakiyede",
  },
  {
    id: "pioneer-igne",
    urun: "Pioneer pikap iğnesi",
    ilanBaslik: "Pioneer pikap iğnesi arıyorum",
    talep: {
      defo: "Defosuz olmalı",
      marka: "Pioneer",
      model: "PN-110 iğne",
      yil: "Fark etmez",
      renk: "—",
      fiyat: 2200,
      durum: "Sıfır / jelatininde",
      konum: "Çankaya, Ankara",
      acilis: "20 Haziran 2026",
      aciklama: "Pikabıma uyumlu orijinal iğne; muadil değil, kutulu olsun.",
      sunumSayisi: 3,
    },
    sunum: {
      defo: "Defo yok, hiç takılmadı",
      marka: "Pioneer",
      model: "PN-110 iğne",
      yil: "2024",
      renk: "—",
      urun: "Pioneer PN-110 orijinal pikap iğnesi",
      fiyat: 1900,
      durum: "Sıfır / jelatininde",
      kutu: true,
      fatura: true,
      kargo: "Kargo satıcıya ait",
      teslim: "1–2 gün içinde kargoda",
      not: "Orijinal Pioneer kutusunda, hiç takılmadı. Faturası ile birlikte gönderildi.",
    },
    karsiTaraf: {
      kullanici: "analogsever",
      harf: "AS",
      puan: "4.6",
      degerlendirme: 41,
      islem: 48,
      konum: "Çankaya, Ankara",
      uyelik: "2024",
      rozet: "Güvenilir Alıcı",
    },
    alici: "analogsever",
    harf: "AS",
    tarih: "28 Haziran 2026",
    tarihIso: "2026-06-28",
    brut: 1900,
    komisyon: 76,
    durum: "IBAN'a aktarıldı",
  },
  {
    id: "nokia-3310",
    urun: "Nokia 3310 — kutulu",
    ilanBaslik: "Nokia 3310 kutulu arıyorum",
    talep: {
      defo: "Ekran çizilmemiş olmalı",
      marka: "Nokia",
      model: "3310",
      yil: "Fark etmez",
      renk: "Mavi",
      fiyat: 3500,
      durum: "Fark etmez",
      konum: "Karşıyaka, İzmir",
      acilis: "5 Haziran 2026",
      aciklama: "Kutulu ve çalışır olsun; ekran çizilmemiş, tuşlar sağlam olmalı.",
      sunumSayisi: 8,
    },
    sunum: {
      defo: "Ekran çiziksiz, kasada hafif iz",
      marka: "Nokia",
      model: "3310",
      yil: "2000",
      renk: "Mavi",
      urun: "Nokia 3310 — kutulu, orijinal şarj aletiyle",
      fiyat: 3200,
      durum: "Az kullanılmış",
      kutu: true,
      fatura: false,
      kargo: "Kargo alıcıya ait",
      teslim: "2–3 gün içinde kargoda",
      not: "Kutu ve kılavuz orijinal. Batarya yenilendi, açılış testi videoya alındı.",
    },
    karsiTaraf: {
      kullanici: "vinylhunter",
      harf: "VH",
      puan: "4.8",
      degerlendirme: 76,
      islem: 93,
      konum: "Karşıyaka, İzmir",
      uyelik: "2021",
      rozet: "Güvenilir Alıcı",
    },
    alici: "vinylhunter",
    harf: "VH",
    tarih: "14 Haziran 2026",
    tarihIso: "2026-06-14",
    brut: 3200,
    komisyon: 128,
    durum: "IBAN'a aktarıldı",
  },
  {
    id: "kraftwerk-plak",
    urun: 'Kraftwerk "The Man-Machine" plak',
    ilanBaslik: "Kraftwerk “The Man-Machine” plak arıyorum",
    talep: {
      defo: "Kapak solmamış olmalı",
      marka: "Kraftwerk",
      model: "The Man-Machine LP",
      yil: "Fark etmez",
      renk: "Kırmızı basım",
      fiyat: 2600,
      durum: "Az kullanılmış",
      konum: "Nilüfer, Bursa",
      acilis: "19 Mayıs 2026",
      aciklama: "Kırmızı basım tercihimdir; kapak solmamış olsun, iç zarf orijinal kalsın.",
      sunumSayisi: 6,
    },
    sunum: {
      defo: "Kapak ve plak temiz",
      marka: "Kraftwerk",
      model: "The Man-Machine LP",
      yil: "1978",
      renk: "Kırmızı basım",
      urun: "Kraftwerk — The Man-Machine (kırmızı basım LP)",
      fiyat: 2450,
      durum: "Az kullanılmış",
      kutu: false,
      fatura: false,
      kargo: "Kargo satıcıya ait",
      teslim: "Aynı gün kargoda",
      not: "Kapak rengi canlı, plak yüzeyi temizlenip kontrol edildi. Orijinal iç zarf duruyor.",
    },
    karsiTaraf: {
      kullanici: "gozde.ist",
      harf: "Gİ",
      puan: "4.7",
      degerlendirme: 34,
      islem: 39,
      konum: "Nilüfer, Bursa",
      uyelik: "2023",
      rozet: "Güvenilir Alıcı",
    },
    alici: "gozde.ist",
    harf: "Gİ",
    tarih: "30 Mayıs 2026",
    tarihIso: "2026-05-30",
    brut: 2450,
    komisyon: 98,
    durum: "IBAN'a aktarıldı",
  },
];

/**
 * Detay ekranının tek tipi — alım ve satış aynı şablonu kullanır, fark
 * yalnızca paranın yönü ve karşı tarafın rolüdür.
 */
export type IslemDetay = {
  /** URL'de kullanılan kimlik: "alim-<id>" ya da "satis-<id>". */
  slug: string;
  tur: "alim" | "satis";
  ilanBaslik: string;
  tarih: string;
  talep: IslemTalep;
  sunum: IslemSunum;
  karsiTaraf: KarsiTaraf;
  /** Karşı tarafın bu işlemdeki rolü. */
  karsiRol: "Satıcı" | "Alıcı";
  /** Ödeme dökümü satırları — sırayla gösterilir. */
  odeme: { ad: string; tutar: number; vurgu?: boolean }[];
  /** Kullanıcının kasasına giren (+) / çıkan (−) net tutar. */
  netTutar: number;
};

/** Tüm işlemlerin detay biçimi — alımlar ve satışlar birlikte. */
export function islemDetaylari(): IslemDetay[] {
  const alimlar: IslemDetay[] = alimlarim.map((a) => ({
    slug: `alim-${a.id}`,
    tur: "alim",
    ilanBaslik: a.ilanBaslik,
    tarih: a.tarih,
    talep: a.talep,
    sunum: a.sunum,
    karsiTaraf: a.karsiTaraf,
    karsiRol: "Satıcı",
    odeme: [
      { ad: "Ürün bedeli", tutar: a.tutar },
      { ad: "Kargo", tutar: a.kargo },
      { ad: "Ödediğin toplam", tutar: a.tutar + a.kargo, vurgu: true },
    ],
    netTutar: -(a.tutar + a.kargo),
  }));
  const satislar: IslemDetay[] = satislarim.map((s) => ({
    slug: `satis-${s.id}`,
    tur: "satis",
    ilanBaslik: s.ilanBaslik,
    tarih: s.tarih,
    talep: s.talep,
    sunum: s.sunum,
    karsiTaraf: s.karsiTaraf,
    karsiRol: "Alıcı",
    odeme: [
      { ad: "Alıcının ödediği", tutar: s.brut },
      { ad: "BulBana komisyonu (%4)", tutar: -s.komisyon },
      { ad: "Hesabına geçen", tutar: s.brut - s.komisyon, vurgu: true },
    ],
    netTutar: s.brut - s.komisyon,
  }));
  return [...alimlar, ...satislar];
}

/** Slug'dan tek bir işlem detayı — bulunamazsa undefined. */
export function getIslem(slug: string): IslemDetay | undefined {
  return islemDetaylari().find((i) => i.slug === slug);
}

/** Alımların toplamı: ürün bedeli + ödenen kargo. */
export function toplamHarcama(): number {
  return alimlarim.reduce((t, a) => t + a.tutar + a.kargo, 0);
}

/** Satışların brüt toplamı, kesilen komisyon ve eldeki net kazanç. */
export function satisOzeti(): {
  brut: number;
  komisyon: number;
  net: number;
} {
  const brut = satislarim.reduce((t, s) => t + s.brut, 0);
  const komisyon = satislarim.reduce((t, s) => t + s.komisyon, 0);
  return { brut, komisyon, net: brut - komisyon };
}

/** Henüz IBAN'a aktarılmamış, bakiyede duran net satış geliri. */
export function bakiyedekiTutar(): number {
  return satislarim
    .filter((s) => s.durum === "Bakiyede")
    .reduce((t, s) => t + (s.brut - s.komisyon), 0);
}

export type MaliHareket = {
  id: string;
  tarih: string;
  tarihIso: string;
  baslik: string;
  /** İşlemin bağlı olduğu talep ilanının başlığı. */
  ilanBaslik: string;
  /** Karşı taraf — satıcı ya da alıcı. */
  kisi: string;
  tur: "alim" | "satis";
  /** Kasaya giren (+) ya da çıkan (−) net tutar. */
  tutar: number;
  /** Satışlarda kesilen komisyon; alımlarda ödenen kargo. */
  kesinti: number;
  kesintiEtiketi: string;
};

/**
 * Alım ve satışları tek bir kronolojik listede birleştirir — Mali Tablom
 * sayfasındaki hareket tablosu buradan beslenir. Tutar işaretlidir:
 * satış geliri artı, alım harcaması eksi.
 */
export function maliHareketler(): MaliHareket[] {
  const alimlar: MaliHareket[] = alimlarim.map((a) => ({
    id: `alim-${a.id}`,
    tarih: a.tarih,
    tarihIso: a.tarihIso,
    baslik: a.urun,
    ilanBaslik: a.ilanBaslik,
    kisi: a.satici,
    tur: "alim",
    tutar: -(a.tutar + a.kargo),
    kesinti: a.kargo,
    kesintiEtiketi: a.kargo ? "kargo" : "—",
  }));
  const satislar: MaliHareket[] = satislarim.map((s) => ({
    id: `satis-${s.id}`,
    tarih: s.tarih,
    tarihIso: s.tarihIso,
    baslik: s.urun,
    ilanBaslik: s.ilanBaslik,
    kisi: s.alici,
    tur: "satis",
    tutar: s.brut - s.komisyon,
    kesinti: s.komisyon,
    kesintiEtiketi: "komisyon",
  }));
  return [...alimlar, ...satislar].sort((a, b) =>
    b.tarihIso.localeCompare(a.tarihIso),
  );
}
