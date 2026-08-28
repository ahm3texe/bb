import type { Sunum } from "@/components/SunumOnizleme";

/**
 * Satıcı olarak gönderdiğim sunumun EKRAN BİÇİMİ (Profil > Sunumlarım).
 *
 * Yalnızca tip; veri `lib/veri.ts` → `gonderdigimSunumlarGetir` ile gerçek
 * kayıtlardan üretilir.
 *
 * NOT: burada `sunumlarim` diye HER ZAMAN BOŞ bir dizi ve onu arayan
 * `getSunumum(id)` vardı. Fonksiyon hiçbir zaman bir şey bulamıyordu ve
 * `/sunumum/[id]` sayfası TAMAMEN ona bağlıydı — yani o rota her istekte
 * 404 dönüyordu. Sayfaya bağlantı veren de yoktu; satıcı kendi sunumunu
 * profildeki karttan `/sunum-detay?id=<sunum>` ile açıyor ve orası "kendi
 * sunumum" kipinde çalışıyor. Ölü rota ve boş kaynak kaldırıldı.
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
  /** Sunumun akıbeti — geri çekme düğmesi buna bakar. */
  sonuc?:
    | "beklemede"
    | "kabul"
    | "red"
    | "iptal"
    | "suresi-doldu"
    | "arsiv"
    | "kapandi";
};


