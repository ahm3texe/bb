// ── Sohbetler ─────────────────────────────────────────────────────────
// Her sohbet bir talep üzerinden iki kişi arasındadır: talebi açan alıcı
// ve sunum yapan satıcı. Tamamlanmış her işlem bir sohbet bırakır; ayrıca
// henüz anlaşmaya varmamış açık pazarlıklar vardır.

import { getKullanici } from "./kullanicilar";

export type Sohbet = {
  id: string;
  /** Talebi açan taraf. */
  alici: string;
  /** Sunumu yapan taraf. */
  satici: string;
  /** Sohbetin konusu olan talep — ilan bağlamı ve bağlantılar buradan çözülür. */
  talepId: string;
  /** Sohbetin konusu olan ilan başlığı. */
  ilan: string;
  /** Listede görünen son durum satırı — son mesajdan türetilir. */
  son: string;
  /** İnsan okuması: "az önce", "3 saat", "2 gün"… */
  saat: string;
  /**
   * Son hareketin ham ISO damgası — sıralama için.
   * `saat` göreli metin olduğu için sıralamada kullanılamaz.
   */
  sonHareket?: string;
  /** Pazarlığı süren sohbet — teklif akışı burada canlıdır. */
  acik: boolean;
  /** Sohbeti başlatan sunum (varsa) — açılışta sunum kartı bundan üretilir. */
  sunumId?: string;
  sunumFoto?: number;
  sunumFiyat?: number;
};

// NOT: Burada sabit bir sohbet dizisi YOK. Sohbet ayrıca üretilmez, her
// sunumdan türer (bkz. lib/veri.ts → sohbetlerGetir). Eskiden hep boş kalan
// bir `sohbetler` dizisi ve onu süzen `sohbetlerimFor` vardı; sonuca hiçbir
// şey eklemedikleri hâlde "başka bir sohbet kaynağı var" izlenimi
// veriyorlardı.

/** Kullanıcının bu sohbetteki rolü. */
export function rolFor(s: Sohbet, kullanici: string): "buyer" | "seller" {
  return s.alici === kullanici ? "buyer" : "seller";
}

/** Sohbetteki karşı taraf. */
export function karsiTarafFor(s: Sohbet, kullanici: string): string {
  return s.alici === kullanici ? s.satici : s.alici;
}

/** Avatar baş harfleri — kullanıcı kaydındaki harfle aynı kalır. */
export function harfFor(kullanici: string): string {
  const kayit = getKullanici(kullanici);
  if (kayit) return kayit.harf;
  const parcalar = kullanici.split(/[.\-_]/).filter(Boolean);
  const harfler =
    parcalar.length > 1
      ? parcalar[0][0] + parcalar[1][0]
      : kullanici.slice(0, 2);
  return harfler.toLocaleUpperCase("tr");
}
