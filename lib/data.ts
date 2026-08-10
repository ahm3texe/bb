import type { AliciMetrik } from "./alici-kalitesi";

// ── BulBana seed data (ported from the .dc.html design prototype) ──────
// In production these become API/DB reads; here they are typed fixtures.

export type Talep = {
  id: string;
  baslik: string;
  marka: string; // kartta başlığın üstünde küçük marka etiketi
  aciklama: string; // kartta gösterilen kısa açıklama
  fiyatNum: number;
  kategori: string;
  il: string;
  ilce: string;
  sunum: number;
  gun: number; // days left
  durum: string;
  eklendi: number; // "days ago" metric, used for the "En yeni" sort
  acil?: boolean;
  pazarlik?: boolean;
  dogrulanmis?: boolean; // kimliği doğrulanmış talep sahibi → mor rozet
  // İlan Aç formundan gelen ürün detayları — detay sayfasında "Beklentiler".
  model?: string;
  yil?: string;
  renk?: string;
  defoKabul?: boolean; // true → defolu olabilir, false → defosuz olmalı
  muadilKabul?: boolean; // true → muadil/eşdeğer ürün de kabul ediliyor
};

export type Kategori = {
  ad: string;
  harf: string;
  sayi: number;
};

export function fiyatText(n: number): string {
  return n.toLocaleString("tr-TR") + " TL";
}

/** Önizlemede oturum sahibine ait sayılan talep — kendi ilanına sunum yapılamaz. */
export const KENDI_TALEP_ID = "dawn-fm-imzali-cd";

/**
 * Satıcı olarak sunum gönderdiğim talepler (Profil > Sunumlarım).
 * Bu ilanlarda tekrar "Sunum Yap" çıkmaz; gönderilmiş sunum bilgisi gösterilir.
 */
export const SUNUM_YAPTIGIM_TALEPLER = [
  "commodore-64-kutulu",
  "sega-dreamcast-tam-set",
  "nokia-3310-kutulu",
  "daft-punk-discovery-plak",
] as const;

/** İlanın açılış tarihi (gün/ay/yıl) — `eklendi` (kaç gün önce) alanından türetilir. */
export function ilanTarihi(eklendi: number): string {
  const d = new Date();
  d.setDate(d.getDate() - eklendi);
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  return `${gun}/${ay}/${d.getFullYear()}`;
}

// Talep id'sinden sabit (deterministik) referans numarası — TEK KAYNAK.
// Tüm sayfalar (ilan detay, ilan yönetimi, mesajlar, sipariş) bunu kullanır.
export function talepNo(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `BB-${100000 + (h % 900000)}`;
}

// Kategori "açık talep" sayıları seed'den türetilir (aşağıdaki kategoriSayilari
// ile birebir aynı) — anasayfa, mega-menü ve keşfet aynı sayıyı gösterir.
export const kategoriler: Kategori[] = [
  { ad: "Müzik & Plak", harf: "M", sayi: 3 },
  { ad: "Elektronik", harf: "E", sayi: 3 },
  { ad: "Koleksiyon", harf: "K", sayi: 2 },
  { ad: "Oyun & Konsol", harf: "O", sayi: 1 },
  { ad: "Giyim & Aksesuar", harf: "G", sayi: 0 },
  { ad: "Saat", harf: "S", sayi: 2 },
  { ad: "Kitap & Dergi", harf: "K", sayi: 1 },
  { ad: "Ev & Yaşam", harf: "E", sayi: 0 },
];

export const talepler: Talep[] = [
  {
    id: "dawn-fm-imzali-cd",
    baslik: 'İmzalı "Dawn FM" CD arıyorum',
    marka: "The Weeknd",
    model: "Dawn FM",
    yil: "2022",
    defoKabul: false,
    aciklama: "İmzalı, sertifikalı orijinal baskı; jelatinli olursa tercihim.",
    fiyatNum: 4500,
    kategori: "Müzik & Plak",
    il: "İstanbul",
    ilce: "Kadıköy",
    sunum: 12,
    gun: 21,
    durum: "Yeni / az kullanılmış",
    eklendi: 2,
    pazarlik: true,
    dogrulanmis: true,
  },
  {
    id: "daft-punk-discovery-plak",
    baslik: '"Discovery" ilk baskı plak arıyorum',
    marka: "Daft Punk",
    model: "Discovery (ilk baskı)",
    yil: "2001",
    defoKabul: false,
    aciklama: "İlk baskı, çiziksiz plak; kapak temiz olsun.",
    fiyatNum: 6000,
    kategori: "Müzik & Plak",
    il: "İstanbul",
    ilce: "Beşiktaş",
    sunum: 8,
    gun: 12,
    durum: "Fark etmez",
    eklendi: 5,
    dogrulanmis: true,
    muadilKabul: true,
  },
  {
    id: "nokia-3310-kutulu",
    baslik: "3310 arıyorum — kutulu, çalışır",
    marka: "Nokia",
    model: "3310",
    yil: "2000",
    renk: "Mavi",
    defoKabul: true,
    aciklama: "Kutulu ve çalışır durumda; şarj aleti olursa süper.",
    fiyatNum: 1500,
    kategori: "Elektronik",
    il: "Ankara",
    ilce: "Çankaya",
    sunum: 21,
    gun: 6,
    durum: "İyi durumda",
    eklendi: 9,
    acil: true,
    pazarlik: true,
    muadilKabul: true,
  },
  {
    id: "sega-dreamcast-tam-set",
    baslik: "Dreamcast tam set arıyorum (2 kol)",
    marka: "Sega",
    model: "Dreamcast",
    yil: "1999",
    renk: "Beyaz",
    defoKabul: true,
    aciklama: "2 kollu tam set; kabloları ve hafıza kartıyla olsun.",
    fiyatNum: 4250,
    kategori: "Oyun & Konsol",
    il: "İzmir",
    ilce: "Bornova",
    sunum: 4,
    gun: 18,
    durum: "Çalışır durumda",
    eklendi: 4,
    dogrulanmis: true,
  },
  {
    id: "seiko-5-otomatik",
    baslik: "Vintage 5 otomatik saat arıyorum",
    marka: "Seiko",
    model: "5 Otomatik",
    yil: "1970'ler",
    renk: "Gümüş",
    defoKabul: true,
    aciklama: "Vintage otomatik, orijinal kadran; bakımlı tercih.",
    fiyatNum: 3800,
    kategori: "Saat",
    il: "İzmir",
    ilce: "Konak",
    sunum: 6,
    gun: 14,
    durum: "Az kullanılmış",
    eklendi: 6,
  },
  {
    id: "lego-colosseum-10276",
    baslik: "10276 Colosseum arıyorum — eksiksiz",
    marka: "Lego",
    model: "10276 Colosseum",
    yil: "2020",
    defoKabul: false,
    aciklama: "Eksiksiz parça ve talimat kitapçığıyla; kutulu olsun.",
    fiyatNum: 12000,
    kategori: "Koleksiyon",
    il: "Bursa",
    ilce: "Nilüfer",
    sunum: 3,
    gun: 25,
    durum: "Yeni / etiketli",
    eklendi: 1,
    dogrulanmis: true,
  },
  {
    id: "polaroid-600-film",
    baslik: "600 arıyorum — filmiyle olursa süper",
    marka: "Polaroid",
    model: "600 Serisi",
    yil: "1990'lar",
    renk: "Gri",
    defoKabul: true,
    aciklama: "Çalışır 600 serisi; filmiyle birlikte olması tercihim.",
    fiyatNum: 2200,
    kategori: "Elektronik",
    il: "Antalya",
    ilce: "Muratpaşa",
    sunum: 5,
    gun: 9,
    durum: "Çalışır durumda",
    eklendi: 8,
    acil: true,
  },
  {
    id: "commodore-64-kutulu",
    baslik: "64 arıyorum — çalışır, kutulu",
    marka: "Commodore",
    model: "64 (C64)",
    yil: "1982",
    renk: "Bej",
    defoKabul: true,
    aciklama: "Çalışır C64, kutulu; kabloları tam olsun.",
    fiyatNum: 5500,
    kategori: "Elektronik",
    il: "Adana",
    ilce: "Seyhan",
    sunum: 2,
    gun: 27,
    durum: "Fark etmez",
    eklendi: 0.5,
    acil: true,
    pazarlik: true,
    dogrulanmis: true,
  },
  {
    id: "kraftwerk-man-machine-plak",
    baslik: '"The Man-Machine" plak arıyorum',
    marka: "Kraftwerk",
    model: "The Man-Machine",
    yil: "1978",
    defoKabul: false,
    aciklama: "Az kullanılmış plak; kapağı temiz olması tercihim.",
    fiyatNum: 3200,
    kategori: "Müzik & Plak",
    il: "İstanbul",
    ilce: "Kadıköy",
    sunum: 4,
    gun: 15,
    durum: "Az kullanılmış",
    eklendi: 3,
  },
  {
    id: "tutunamayanlar-ilk-baski",
    baslik: '"Tutunamayanlar" ilk baskı arıyorum',
    marka: "Oğuz Atay",
    model: "Tutunamayanlar (1. baskı)",
    yil: "1972",
    defoKabul: false,
    aciklama: "İlk baskı; sayfaları temiz ve tam olsun.",
    fiyatNum: 7500,
    kategori: "Kitap & Dergi",
    il: "İstanbul",
    ilce: "Beyoğlu",
    sunum: 6,
    gun: 19,
    durum: "Fark etmez",
    eklendi: 7,
    dogrulanmis: true,
  },
  {
    id: "casio-a168-kutulu",
    baslik: "A168 arıyorum — kutulu, sıfır tercih",
    marka: "Casio",
    model: "A168",
    yil: "1980'ler",
    renk: "Gümüş",
    defoKabul: false,
    aciklama: "Retro dijital A168; kutulu ve sıfır tercihim.",
    fiyatNum: 950,
    kategori: "Saat",
    il: "Ankara",
    ilce: "Çankaya",
    sunum: 9,
    gun: 11,
    durum: "Yeni / etiketli",
    eklendi: 2.5,
  },
  {
    id: "beyblade-takimi-2000ler",
    baslik: "2000'ler takımı arıyorum",
    marka: "Beyblade",
    model: "Metal Fusion serisi",
    yil: "2000'ler",
    defoKabul: true,
    aciklama: "Orijinal 2000'ler takım; launcher'larıyla birlikte.",
    fiyatNum: 1200,
    kategori: "Koleksiyon",
    il: "Bursa",
    ilce: "Osmangazi",
    sunum: 7,
    gun: 8,
    durum: "İyi durumda",
    eklendi: 10,
    acil: true,
  },
];

export const iller = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Adana",
] as const;

export function getTalep(id: string): Talep | undefined {
  return talepler.find((t) => t.id === id);
}

// ── Talep görselleri (public/talepler/) ────────────────────────────────
// Sağlanan görsel adedi. Listede olmayan talepler placeholder gösterir.
// Yeni görsel geldikçe buraya id → adet eklenir.
const GORSEL_ADEDI: Record<string, number> = {
  "dawn-fm-imzali-cd": 4,
  "daft-punk-discovery-plak": 4,
  "nokia-3310-kutulu": 4,
  "sega-dreamcast-tam-set": 4,
  "seiko-5-otomatik": 3,
  "lego-colosseum-10276": 4,
};

/** Bir talebin görsel yollarını döndürür (yoksa boş dizi → placeholder). */
export function talepGorselleri(id: string): string[] {
  const n = GORSEL_ADEDI[id] ?? 0;
  return Array.from({ length: n }, (_, i) => `/talepler/${id}-${i + 1}.jpg`);
}

/**
 * Bir kategoride geçen markalar — muadil sunumda satıcının seçebileceği liste.
 * Seed veriden türetilir; alfabetik ve tekrarsızdır.
 */
export function kategoriMarkalari(kategori: string): string[] {
  const markalar = talepler
    .filter((t) => t.kategori === kategori)
    .map((t) => t.marka);
  return [...new Set(markalar)].sort((a, b) => a.localeCompare(b, "tr"));
}

// Category counts derived from the seed (keeps the filter panel honest).
export function kategoriSayilari(): Record<string, number> {
  return talepler.reduce<Record<string, number>>((acc, t) => {
    acc[t.kategori] = (acc[t.kategori] ?? 0) + 1;
    return acc;
  }, {});
}

/** "4500" → "4.500" — fiyat alanlarında yazarken binlik ayracı gösterir. */
export function binlikAyir(rakamlar: string): string {
  const temiz = rakamlar.replace(/\D/g, "");
  return temiz ? Number(temiz).toLocaleString("tr-TR") : "";
}

/**
 * Kullanıcıların alıcı tarafındaki davranış metrikleri — profil sayfasındaki
 * "Alıcı Kalitesi" kartını besler. Üretimde sipariş/değerlendirme
 * tablolarından toplanır; burada seed fixture.
 */
export const aliciMetrikleri: Record<string, AliciMetrik> = {
  plakdukkani34: {
    puanOrtalamasi: 4.9,
    degerlendirmeSayisi: 41,
    olumluYorum: 39,
    olumsuzYorum: 1,
    tamamlananAlim: 37,
    iptalEdilenAlim: 1,
    sunumYanitOrani: 0.96,
    kimlikDogrulandi: true,
  },
  "emre.k": {
    puanOrtalamasi: 4.4,
    degerlendirmeSayisi: 12,
    olumluYorum: 10,
    olumsuzYorum: 2,
    tamamlananAlim: 9,
    iptalEdilenAlim: 1,
    sunumYanitOrani: 0.72,
    kimlikDogrulandi: true,
  },
  "retro.adana": {
    puanOrtalamasi: 3.4,
    degerlendirmeSayisi: 8,
    olumluYorum: 3,
    olumsuzYorum: 4,
    tamamlananAlim: 5,
    iptalEdilenAlim: 3,
    sunumYanitOrani: 0.38,
    kimlikDogrulandi: false,
  },
};

/** Metriği olmayan kullanıcı için sıfır geçmişli (yeni alıcı) taban. */
export const yeniAliciMetrik: AliciMetrik = {
  puanOrtalamasi: 0,
  degerlendirmeSayisi: 0,
  olumluYorum: 0,
  olumsuzYorum: 0,
  tamamlananAlim: 0,
  iptalEdilenAlim: 0,
  sunumYanitOrani: 0,
  kimlikDogrulandi: false,
};

/** Kullanıcı adından alıcı metriği — kayıt yoksa "yeni alıcı" döner. */
export function getAliciMetrik(kullanici: string): AliciMetrik {
  return aliciMetrikleri[kullanici] ?? yeniAliciMetrik;
}
