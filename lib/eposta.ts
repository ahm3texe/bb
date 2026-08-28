// ── E-posta gönderimi ─────────────────────────────────────────────────
// Prototipte gerçek bir SMTP/servis bağlantısı yok: gönderilecek postalar
// `.veri/eposta-kuyrugu.json` dosyasına yazılır. Backend yazılırken tek
// değiştirilecek yer `epostaGonder` — çağıran taraflar aynı kalır.

import { epostaKuyrukEkle, metinKimlik } from "./depo";

export type EpostaIsi = {
  id: string;
  /** Alıcının e-posta adresi. */
  kime: string;
  konu: string;
  govde: string;
  /** Kuyruğa alındığı an. */
  zaman: string;
  /** "kuyrukta" → gerçek gönderim bağlanınca "gonderildi" olur. */
  durum: "kuyrukta" | "gonderildi" | "hata";
};

/**
 * Postayı kuyruğa alır. TODO(backend): burada gerçek e-posta servisi
 * (SES/Resend/SMTP) çağrılacak; başarılıysa durum "gonderildi" yazılacak.
 */
export async function epostaGonder(is: {
  kime: string;
  konu: string;
  govde: string;
}): Promise<EpostaIsi | null> {
  const kime = is.kime.trim();
  // Adres yoksa sessizce vazgeçilir: alarm yine uygulama bildirimi olarak düşer.
  if (!kime.includes("@")) return null;
  return epostaKuyrukEkle({
    // Kimlik `metinKimlik` ile üretilir. `Date.now()` KULLANILMAZ: aynı
    // milisaniyede kuyruğa giren iki posta aynı kimliği alabiliyordu
    // (bkz. BACKEND.md → Kimlikler kilidin içinde üretilir).
    id: metinKimlik("eposta"),
    kime,
    konu: is.konu.slice(0, 160),
    govde: is.govde.slice(0, 2000),
    zaman: new Date().toISOString(),
    durum: "kuyrukta",
  });
}
