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

export const sunumlarim: Sunumum[] = [];


export function getSunumum(id: string) {
  return sunumlarim.find((s) => s.id === id);
}
