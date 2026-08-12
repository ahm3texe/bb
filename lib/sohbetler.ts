// ── Sohbetler ─────────────────────────────────────────────────────────
// Her sohbet bir talep üzerinden iki kişi arasındadır: talebi açan alıcı
// ve sunum yapan satıcı. Tamamlanmış her işlem bir sohbet bırakır; ayrıca
// henüz anlaşmaya varmamış açık pazarlıklar vardır.

import { islemler } from "./islemler";
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
  /** Listede görünen son durum satırı. */
  son: string;
  saat: string;
  /** Pazarlığı süren sohbet — teklif akışı burada canlıdır. */
  acik: boolean;
};

/** Henüz işleme dönüşmemiş, pazarlığı süren sohbetler. */
const acikSohbetler: Sohbet[] = [];

/** Tamamlanmış işlemlerden doğan sohbetler. */
const islemSohbetleri: Sohbet[] = islemler.map((i) => ({
  id: `islem-${i.id}`,
  alici: i.alici,
  satici: i.satici,
  // Tamamlanmış işlemin ilanı artık yayında değil — açılacak bir talep sayfası yok.
  talepId: "",
  ilan: i.ilanBaslik,
  son: "Anlaşıldı ✓ — teslim edildi",
  saat: i.tarih,
  acik: false,
}));

export const sohbetler: Sohbet[] = [...acikSohbetler, ...islemSohbetleri];

/** Kullanıcının taraf olduğu sohbetler — açık pazarlıklar üstte. */
export function sohbetlerimFor(kullanici: string): Sohbet[] {
  return sohbetler.filter(
    (s) => s.alici === kullanici || s.satici === kullanici,
  );
}

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
