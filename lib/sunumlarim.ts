import type { Sunum } from "@/components/SunumOnizleme";

/**
 * Satıcı olarak gönderdiğim sunumlar (Profil > Sunumlarım).
 * Kartlar ve "sunumum" detay sayfası aynı kaynaktan okur; detay sayfası
 * alıcının gördüğü sunum ekranının birebir aynısıdır.
 */
export type Sunumum = {
  id: string;
  talepId: string;
  /** Talep sahibi — sunumu gönderdiğim kişi. */
  sahibi: string;
  harf: string;
  puan: string;
  tarih: string;
  grup: "kargo" | "sohbet" | "inceleme";
  st: string;
  stCls: string;
  aksiyon: { label: string; variant: "lime" | "primary"; href: string } | null;
  not: string;
  fotoAdlari: string[];
  sunum: Sunum;
};

export const sunumlarim: Sunumum[] = [
  {
    id: "commodore-64-kutulu",
    talepId: "commodore-64-kutulu",
    sahibi: "retro.adana",
    harf: "RA",
    puan: "4.9",
    tarih: "5 gün önce",
    grup: "kargo",
    st: "Ödeme alındı · kargo bekliyor",
    stCls: "bg-accent text-ink-900",
    aksiyon: { label: "Kargoya Ver", variant: "lime", href: "/siparis" },
    not: "Alıcı ödemeyi güvenceye aldı — 3 gün içinde kargola.",
    fotoAdlari: ["ön görünüm", "kutu", "klavye", "kablolar"],
    sunum: {
      baslik: "Commodore 64 — kutulu, çalışır durumda",
      fiyatNum: 5300,
      urun: "Commodore 64 (C64)",
      muadil: false,
      yil: "1982",
      renk: "Bej",
      durum: "Az kullanılmış",
      defoVar: false,
      kutu: true,
      fatura: false,
      aksesuar: true,
      teslim: "1–2 gün içinde kargoda",
      kargo: "Kargo satıcıya ait",
      il: "Adana",
      ilce: "Seyhan",
      aciklama:
        "Kutusunda, güç adaptörü ve kablolarıyla birlikte. Açılışta test edildi, tuşların tamamı çalışıyor. Köpüklü paketle kargoluyorum.",
      fotolar: 4,
      video: true,
    },
  },
  {
    id: "sega-dreamcast-tam-set",
    talepId: "sega-dreamcast-tam-set",
    sahibi: "egem.izmir",
    harf: "Eİ",
    puan: "4.6",
    tarih: "2 gün önce",
    grup: "sohbet",
    st: "Pazarlık sürüyor",
    stCls: "bg-primary-soft text-primary-hover",
    aksiyon: { label: "Sohbete Git", variant: "primary", href: "/mesajlar" },
    not: "Sohbette fiyatta anlaşmaya çalışıyorsunuz.",
    fotoAdlari: ["konsol", "kollar", "kutu"],
    sunum: {
      baslik: "Dreamcast tam set — 2 kol, kutulu",
      fiyatNum: 4100,
      urun: "Sega Dreamcast",
      muadil: false,
      yil: "1999",
      durum: "Kullanılmış",
      defoVar: false,
      kutu: true,
      aksesuar: true,
      teslim: "3 gün içinde kargoda",
      kargo: "Kargo alıcıya ait",
      il: "İzmir",
      ilce: "Bornova",
      aciklama:
        "İki orijinal kol, hafıza kartı ve tüm kablolar dahil. Konsol sorunsuz açılıyor, disk okuma testi yapıldı.",
      fotolar: 3,
    },
  },
  {
    id: "nokia-3310-kutulu",
    talepId: "nokia-3310-kutulu",
    sahibi: "aysenur.a",
    harf: "AA",
    puan: "4.8",
    tarih: "Dün",
    grup: "sohbet",
    st: "Teklif istendi · yanıt bekliyor",
    stCls: "bg-accent-soft text-accent-ink",
    aksiyon: { label: "Sohbete Git", variant: "primary", href: "/mesajlar" },
    not: "Alıcı senden teklif istedi — yanıtla.",
    fotoAdlari: ["ön", "arka", "kutu"],
    sunum: {
      baslik: "Nokia 3310 — kutulu, orijinal şarj aleti",
      fiyatNum: 1450,
      urun: "Nokia 3310",
      muadil: false,
      yil: "2000",
      renk: "Mavi",
      durum: "Az kullanılmış",
      defoVar: true,
      defoNot: "ekran çerçevesinde ince çizik",
      kutu: true,
      aksesuar: true,
      teslim: "Bugün kargoda",
      kargo: "Kargo satıcıya ait",
      il: "Ankara",
      ilce: "Çankaya",
      aciklama:
        "Orijinal kutusu ve şarj aletiyle. Batarya değişti, şarj tutuyor. Ekran çerçevesinde küçük bir çizik dışında temiz.",
      fotolar: 3,
    },
  },
  {
    id: "daft-punk-discovery-plak",
    talepId: "daft-punk-discovery-plak",
    sahibi: "berk.plak",
    harf: "BP",
    puan: "4.7",
    tarih: "3 gün önce",
    grup: "inceleme",
    st: "İnceleniyor",
    stCls: "bg-page text-ink-500",
    aksiyon: null,
    not: "Alıcı gönderdiğin sunumu inceliyor.",
    fotoAdlari: ["kapak", "plak", "iç zarf", "etiket"],
    sunum: {
      baslik: "Discovery — 2001 ilk baskı, çift LP",
      fiyatNum: 5800,
      urun: "Daft Punk Discovery",
      muadil: false,
      yil: "2001",
      durum: "Az kullanılmış",
      defoVar: false,
      kutu: false,
      teslim: "1–2 gün içinde kargoda",
      kargo: "Kargo satıcıya ait",
      il: "İstanbul",
      ilce: "Beşiktaş",
      aciklama:
        "2001 ilk baskı, orijinal iç zarflarıyla. Plaklar çiziksiz, kapak köşeleri keskin. Test edildi, cızırtı yok.",
      fotolar: 4,
      video: true,
    },
  },
];

export function getSunumum(id: string) {
  return sunumlarim.find((s) => s.id === id);
}
