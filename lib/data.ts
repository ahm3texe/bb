// ── Bulbana seed data (ported from the .dc.html design prototype) ──────
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
  /** Talebi açan kullanıcının kullanıcı adı — lib/kullanicilar ile eşleşir. */
  sahibi: string;
  acil?: boolean;
  pazarlik?: boolean;
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

/**
 * Satıcı olarak sunum gönderdiğim talepler (Profil > Sunumlarım).
 * Bu ilanlarda tekrar "Sunum Yap" çıkmaz; gönderilmiş sunum bilgisi gösterilir.
 */
export const SUNUM_YAPTIGIM_TALEPLER = [] as const;

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

export const talepler: Talep[] = [];


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
const GORSEL_ADEDI: Record<string, number> = {};


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
