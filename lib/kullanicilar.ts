// ── Kullanıcılar ──────────────────────────────────────────────────────
// Bulbana'da her hesap hem alır hem satar; bu yüzden tek bir kullanıcı
// kaydı vardır, alıcı/satıcı ayrımı sadece o işlemdeki role bakar.
// Profil sayfaları (/profil/[kullanici]) buradan beslenir.

import type { AliciMetrik } from "./alici-kalitesi";
import { oturumKullaniciAdi } from "./oturum";

export type Yorum = {
  /** Yorumu yazan kullanıcı adı. */
  yazan: string;
  harf: string;
  urun: string;
  tarih: string;
  /** 1-5 arası puan. */
  puan: number;
  text: string;
};

export type Kullanici = {
  /** URL'de ve arayüzde görünen benzersiz kullanıcı adı. */
  kullanici: string;
  /** Avatar baş harfleri. */
  harf: string;
  /** Gerçek ad — yalnızca sipariş/fatura akışlarında kullanılır. */
  ad: string;
  konum: string;
  /** Üyelik yılı. */
  uyelik: string;
  bio: string;
  /** Satıcı seviyesi rozeti; yoksa gösterilmez. */
  rozet?: string;
  /** Yıldız ortalaması (0-5). */
  puan: number;
  degerlendirme: number;
  /** Satıcı tarafı metrikleri. */
  tamamlananSatis: number;
  zamanindaKargo: number;
  /** Alıcı tarafı davranış metrikleri — Alıcı Kalitesi hesabını besler. */
  aliciMetrik: AliciMetrik;
  /** Profil kartındaki küçük etiketler. */
  chipler: string[];
  yorumlar: Yorum[];
};

export const kullanicilar: Kullanici[] = [
  {
    kullanici: "plakdukkani34",
    harf: "PD",
    ad: "Deniz Aslan",
    konum: "Beyoğlu, İstanbul",
    uyelik: "2023",
    bio: "Fiziksel dükkanı olan plak/CD satıcısıyım. İmzalı ve koleksiyonluk baskılarda sertifika (COA) sağlarım; tüm sunumlarımda kanıt fotoğrafı bulunur. Aynı gün kargo.",
    rozet: "Güvenilir Satıcı",
    puan: 0,
    degerlendirme: 0,
    tamamlananSatis: 0,
    zamanindaKargo: 0,
    aliciMetrik: {
      puanOrtalamasi: 0,
      degerlendirmeSayisi: 0,
      olumluYorum: 0,
      olumsuzYorum: 0,
      tamamlananAlim: 0,
      iptalEdilenAlim: 0,
      sunumYanitOrani: 0,
    },
    chipler: [
      "Ort. kargolama · 1 gün",
      "Yanıt süresi · ~1 saat",
      "%1 iptal",
      "Uzmanlık: Müzik & Plak",
    ],
    yorumlar: [],
  },
  {
    kullanici: "melih.k",
    harf: "MK",
    ad: "Melih Kurt",
    konum: "Nilüfer, Bursa",
    uyelik: "2023",
    bio: "Konsol ve plak topluyorum. Aradığımı bulunca hızlı hareket ederim.",
    puan: 0,
    degerlendirme: 0,
    tamamlananSatis: 0,
    zamanindaKargo: 0,
    aliciMetrik: {
      puanOrtalamasi: 0,
      degerlendirmeSayisi: 0,
      olumluYorum: 0,
      olumsuzYorum: 0,
      tamamlananAlim: 0,
      iptalEdilenAlim: 0,
      sunumYanitOrani: 0,
    },
    chipler: ["Yanıt süresi · ~6 saat", "İlgi: Oyun & Konsol"],
    yorumlar: [],
  },
];

const kullaniciHaritasi = new Map(kullanicilar.map((k) => [k.kullanici, k]));

/** Kullanıcı adından kayıt — bulunamazsa undefined. */
export function getKullanici(kullanici: string): Kullanici | undefined {
  return kullaniciHaritasi.get(kullanici);
}

/** Oturum sahibinin kaydı. Hesap silinmişse `undefined` döner. */
export function oturumKullanicisi(): Kullanici | undefined {
  return kullaniciHaritasi.get(oturumKullaniciAdi());
}
