import type { Sunum } from "@/components/SunumOnizleme";

/**
 * Kendi ilanlarıma gelen sunumlar (birden fazla talep).
 * Profil > Gelen Sunumlar listesi ile karşılaştırma sayfası aynı kaynaktan okur;
 * karşılaştırma her zaman TEK bir talep içinde yapılır.
 */
export type GelenSunum = Sunum & {
  id: string;
  /** Sunumun gönderildiği talep — karşılaştırma yalnızca aynı talep içinde yapılır. */
  talepId: string;
  satici: string;
  harf: string;
  puan: string;
  saticiTipi: "Mağaza" | "Bireysel";
  /** Satıcının Bulbana geçmişi — karşılaştırmada tartılır. */
  satis: number;
  yanitSaat: number;
  zamanindaKargo: number;
  ne: string;
};

export const gelenSunumlar: GelenSunum[] = [];

