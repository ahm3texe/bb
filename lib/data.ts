import { ayniMi } from "./metin";
import { sadeceFotograflar, sadeceVideolar } from "./gorsel";
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
  /** Mahalle — ilan kartında ilçeyle birlikte görünür; opsiyonel. */
  mahalle?: string;
  sunum: number;
  gun: number; // days left
  /**
   * Kabul edilen ürün durumlarının okunabilir özeti — "Hepsi", tek seçim
   * ya da "Yenilenmiş / Az kullanılmış" gibi birleşik metin. Karşılaştırma
   * için `durumlar` kullanılır (bkz. talepDurumlari).
   */
  durum: string;
  /** Alıcının işaretlediği durumlar; boş/yoksa hepsi kabul ediliyor demektir. */
  durumlar?: string[];
  /**
   * ESKİ ALAN — "kaç gün önce açıldı". Yazılırken her zaman `0` konur ve
   * bir daha güncellenmez, yani TEK BAŞINA GÜVENİLMEZ. Bir dönem ilan
   * tarihi, keşfet sıralaması ve kart tarihi bunu okuyordu; sonuç olarak
   * her ilan "bugün açılmış" görünüyor ve "En yeni/En eski" sıralaması
   * hiçbir şey yapmıyordu.
   *
   * Gerçek kaynak `olusturuldu`. Gün farkı için `gecenGun(talep)`,
   * sıralama için `yayinZamani(talep)` kullanın (lib/talep-durum.ts);
   * ikisi de damgası olmayan eski kayıtlarda bu alana düşer.
   */
  eklendi: number;
  /** Yayına alındığı an (ISO). Süre bitimi buradan hesaplanır. */
  olusturuldu?: string;
  /** Alıcının talebi dondurduğu an (ISO). Doluysa yayında değildir. */
  donduruldu?: string;
  /**
   * Dondurulurken yayın süresinden kalan gün. Talep geri açıldığında
   * sayaç sıfırdan değil, kaldığı yerden devam eder — dondurmak süre
   * kaybettirmemeli.
   */
  dondurmaKalanGun?: number;
  /**
   * Talebin YAYINDAN KALDIRILDIĞI an (ISO). Kayıt tamamen silinmez —
   * sohbet, sipariş ve sunum geçmişi iki tarafta da durmalı — ama herkese
   * açık listelerden kalkar ve yeniden yayına alınamaz.
   */
  silindi?: string;
  /**
   * Talep neden yayından kalktı?
   *
   *   • `alisveris` — bir siparişe dönüştüğü için,
   *   • `kullanici` — sahibi kendi isteğiyle kaldırdığı için.
   *
   * Kullanıcıya gösterilir: "neden listede yok?" sorusu ekranda
   * yanıtlanmalı. Damgası olmayan eski kayıtlarda `undefined` kalır ve
   * ekran gerekçe yerine bir şey yazmaz — uydurmaktansa boş bırakmak
   * doğrudur.
   */
  kaldirmaSebebi?: "alisveris" | "kullanici";
  /** Talebi açan kullanıcının kullanıcı adı — lib/kullanicilar ile eşleşir. */
  sahibi: string;
  acil?: boolean;
  /**
   * Talebin kapandığı an (ISO). Gelen sunumlardan biri kabul ya da
   * reddedilince dolar: talep artık yeni sunum kabul etmez ve bir gün
   * sonra herkese açık listelerden kalkar.
   */
  kapandi?: string;
  pazarlik?: boolean;
  // İlan Aç formundan gelen ürün detayları — detay sayfasında "Beklentiler".
  /** Kategori altındaki ürün türü (ör. Bilgisayar). */
  tur?: string;
  /** Tür altındaki çeşit (ör. Dizüstü). */
  cesit?: string;
  model?: string;
  yil?: string;
  renk?: string;
  defoKabul?: boolean; // true → defolu olabilir, false → defosuz olmalı
  muadilKabul?: boolean; // true → muadil/eşdeğer ürün de kabul ediliyor
  /** Yüklenen görsel/video yolları (ilki kapak). Kullanıcı talepleri doldurur. */
  gorseller?: string[];
};

export type Kategori = {
  ad: string;
  harf: string;
};

export function fiyatText(n: number): string {
  return n.toLocaleString("tr-TR") + " TL";
}

/** Alıcının kabul edebileceği somut ürün durumları — "Hepsi" bunların tümü. */
export const URUN_DURUMLARI = [
  "Kutusu açılmamış",
  "Yenilenmiş",
  "Az kullanılmış",
  "Kullanılmış",
] as const;


/**
 * İlanın açılış tarihi (gün/ay/yıl) — DAMGADAN.
 *
 * İki hata birden düzeltir:
 *
 * 1. Fonksiyon eskiden `talep.eklendi` (kaç gün önce) alıyordu ve o alan
 *    yazılırken her zaman `0` konup bir daha güncellenmiyordu: her ilan
 *    "bugün açılmış" görünüyordu.
 * 2. Gün sayısına çevirip geri tarihe dönmek bir gün KAYDIRIYORDU: 20
 *    Ağustos 08:16'da açılan ilan, 24 Ağustos öğleden önce bakıldığında
 *    3 tam gün ettiği için 21 Ağustos yazıyordu. Damgayı doğrudan
 *    biçimlendirmek bu gidiş-dönüşü ortadan kaldırır.
 *
 * Damgası olmayan eski kayıtlarda `eklendi` alanına düşülür.
 */
export function ilanTarihi(talep: Pick<Talep, "olusturuldu" | "eklendi">): string {
  const d = talep.olusturuldu ? new Date(talep.olusturuldu) : new Date();
  if (!talep.olusturuldu || !Number.isFinite(d.getTime()))
    d.setDate(d.getDate() - (talep.eklendi ?? 0));
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

// Kategori listesi — referans veri. Sıra bilinçli: en çok talep alan
// kategoriler önde. Kategori şeridi, mega-menü ve keşfet filtresi bu diziyi
// olduğu gibi kullanır.
//
// AÇIK TALEP SAYISI BURADA TUTULMAZ. `Kategori.sayi` diye sabit bir alan
// vardı (3 / 2 / 0 / 2) ve gerçek taleplerle ilgisi yoktu: site boşken bile
// "3 açık talep" yazıyordu. Gerçek sayılar `/api/kategori-sayilari`
// ucundan gelir (bkz. lib/kategori-sayilari.ts) ve ölçüm alınamazsa sayı
// hiç gösterilmez.
export const kategoriler: Kategori[] = [
  { ad: "Elektronik", harf: "E" },
  { ad: "Saat", harf: "S" },
  { ad: "Giyim & Aksesuar", harf: "G" },
  { ad: "Koleksiyon & Değerli Eşyalar", harf: "K" },
];


export const iller = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Adana",
] as const;

// `getTalep(id)` de kaldırıldı: aynı boş `talepler` dizisinde arıyordu,
// yani her zaman `undefined` dönüyordu. Sunucuda `talepGetir` (lib/veri.ts),
// istemcide prop olarak gelen listede arama kullanılır — bileşenler zaten
// kendi yerel `getTalep` yardımcılarını böyle kuruyor.

/**
 * Talebin kabul ettiği ürün durumları. Boş dizi = "Hepsi" (her durum uyar).
 * Eski kayıtlarda yalnızca `durum` metni var; o da tek elemanlı listeye
 * çevrilir.
 */
export function talepDurumlari(talep: Pick<Talep, "durum" | "durumlar">): string[] {
  if (talep.durumlar?.length) return talep.durumlar;
  if (!talep.durum || talep.durum === "Hepsi") return [];
  // Birleşik metin ("A / B") de listeye açılır.
  return talep.durum.split("/").map((d) => d.trim()).filter(Boolean);
}

/** Verilen ürün durumu talebin kabul listesine uyuyor mu? */
export function talepDurumUyar(
  talep: Pick<Talep, "durum" | "durumlar">,
  durum: string,
): boolean {
  const liste = talepDurumlari(talep);
  if (liste.length === 0) return true;
  // Türkçe I/İ tuzağına düşmemek için ortak anahtar (bkz. lib/metin.ts).
  return liste.some((d) => ayniMi(d, durum));
}

export function talepGorselleri(talep: Talep): string[] {
  // YALNIZCA FOTOĞRAFLAR. Ham `gorseller` dizisi videoları da taşıyor ve
  // bu fonksiyonun çıktısı doğrudan `<Image>` içine gidiyor: video yolu
  // karışınca kart kapağı ve detay galerisi kırık görsel gösteriyordu.
  return sadeceFotograflar(talep.gorseller);
}

/** Talebe yüklenmiş videolar — oynatıcıya verilir. */
export function talepVideolari(talep: Talep): string[] {
  return sadeceVideolar(talep.gorseller);
}

// BOŞ TOHUM DİZİSİNDEN OKUYAN İKİ FONKSİYON KALDIRILDI.
//
// `kategoriMarkalari(kategori)` ve `kategoriSayilari()` — ikisi de bu
// dosyadaki `talepler` dizisini tarıyordu, o dizi ise HER ZAMAN BOŞTU
// (gerçek talepler `.veri/talepler.json` içinde).
//
//   • `kategoriMarkalari` sunum formunda çağrılıyordu: muadil sunum yapan
//     satıcı marka açılır kutusunda hiçbir zaman marka göremiyor, yalnızca
//     "Diğer" çıkıyordu. Doğru kaynak ürün ağacı — `markalarFor` (İlan Aç
//     formu zaten onu kullanıyordu).
//   • `kategoriSayilari` hiçbir yerden çağrılmıyordu; gerçek sayılar
//     `/api/kategori-sayilari` ucundan geliyor.

/** "4500" → "4.500" — fiyat alanlarında yazarken binlik ayracı gösterir. */
export function binlikAyir(rakamlar: string): string {
  const temiz = rakamlar.replace(/\D/g, "");
  return temiz ? Number(temiz).toLocaleString("tr-TR") : "";
}

/**
 * İlan kartındaki görsel alanının en-boy oranı.
 *
 * TEK SABİTTEN OKUNUR: kartın kendisi (`TalepCard`) ve İlan Aç formundaki
 * CANLI ÖNİZLEMESİ (`IlanAcForm`) aynı kutuyu çiziyor. İkisi ayrı ayrı
 * yazıldığı sürece biri değişince öteki geride kalır ve önizleme, kartın
 * gerçekte nasıl görüneceği hakkında yanlış söz vermiş olur.
 *
 * Oran 3/4 idi; kart ızgarada gereğinden uzun duruyordu. 4/5 hem dikey
 * kalır (ürün fotoğrafları çoğunlukla dikey) hem de kartı yaklaşık bir
 * satır boyu kısaltır.
 */
export const KART_GORSEL_ORANI = "aspect-[4/5]";
