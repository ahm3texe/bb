// ── SMS gönderimi ─────────────────────────────────────────────────────
// Prototipte gerçek bir SMS sağlayıcısı yok: gönderilecek mesajlar
// `.veri/sms-kuyrugu.json` dosyasına yazılır. Backend yazılırken tek
// değiştirilecek yer `smsGonder` — çağıran taraflar aynı kalır.
//
// `lib/eposta.ts` ile bilinçli olarak AYNI desende: ikisi de "kod üret,
// gönder, doğrula" iskeletini paylaşıyor. Sağlayıcı (Netgsm, İleti
// Merkezi, Twilio…) bağlanınca burada yalnızca `smsGonder` gövdesi
// değişir; doğrulama akışının geri kalanına dokunulmaz.

import { metinKimlik, smsKuyrukEkle } from "./depo";

export type SmsIsi = {
  id: string;
  /** Alıcının telefon numarası — E.164'e yakın sade biçim (+90…). */
  kime: string;
  metin: string;
  /** Kuyruğa alındığı an. */
  zaman: string;
  /** "kuyrukta" → gerçek gönderim bağlanınca "gonderildi" olur. */
  durum: "kuyrukta" | "gonderildi" | "hata";
};

/**
 * Mesajı kuyruğa alır. TODO(backend): burada gerçek SMS sağlayıcısı
 * çağrılacak; başarılıysa durum "gonderildi" yazılacak.
 *
 * Numara boşsa sessizce vazgeçilir — doğrulanmamış bir hesaba mesaj
 * çıkmamalı.
 */
export async function smsGonder(is: {
  kime: string;
  metin: string;
}): Promise<SmsIsi | null> {
  const kime = is.kime.trim();
  if (!kime) return null;
  return smsKuyrukEkle({
    // Kimlik `metinKimlik` ile üretilir; `Date.now()` KULLANILMAZ (aynı
    // milisaniyedeki iki mesaj aynı kimliği alabiliyordu).
    id: metinKimlik("sms"),
    kime,
    metin: is.metin.slice(0, 480),
    zaman: new Date().toISOString(),
    durum: "kuyrukta",
  });
}
