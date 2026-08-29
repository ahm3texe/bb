// ── IBAN'a para aktarımı ──────────────────────────────────────────────
// Satış bedeli önce satıcının bakiyesinde birikir; satıcı talep edince
// IBAN'ına gönderilir. Aktarım anında değil, muhasebe onayıyla yapılır —
// bu yüzden ayrı bir kayıt olarak izlenir.
//
// BACKEND SINIRI: gerçek para hareketi bir ödeme kuruluşu üzerinden olur.
// "islemde" → banka talimatı verildi, "tamamlandi" → hesaba geçti.

export type AktarimTalebi = {
  id: string;
  kullanici: string;
  /** Talep edilen net tutar (TL). */
  tutar: number;
  /** Ödemenin gideceği IBAN — maskeli saklanır. */
  ibanMaske: string;
  durum: "islemde" | "tamamlandi" | "reddedildi";
  zaman: string;
  sonucZamani?: string;
  /** Reddedildiyse gerekçe. */
  not?: string;
};

/** Aktarım için gereken en düşük tutar. */
export const MIN_AKTARIM = 100;

/** Bekleyen (henüz sonuçlanmamış) aktarımların toplamı. */
export function bekleyenTutar(liste: AktarimTalebi[]): number {
  return liste
    .filter((a) => a.durum === "islemde")
    .reduce((t, a) => t + a.tutar, 0);
}

/** Hesaba geçmiş, yani kasadan çıkmış aktarımların toplamı. */
export function aktarilanTutar(liste: AktarimTalebi[]): number {
  return liste
    .filter((a) => a.durum === "tamamlandi")
    .reduce((t, a) => t + a.tutar, 0);
}

/**
 * Bakiyeden hem bekleyen hem de TAMAMLANMIŞ aktarımlar düşülünce kalan.
 *
 * BURASI PARANIN TEK KEZ DÜŞÜLDÜĞÜ YERDİR.
 *
 * `bakiyedekiTutar` satıştan kazanılan TOPLAM net geliri verir ve aktarım
 * olup olmadığını bilmez; aktarım defteri de yalnızca çıkan parayı bilir.
 * İki kaynak yalnızca burada, bir kez birleşir.
 *
 * Bir dönem ikinci bir mekanizma daha vardı: aktarım tamamlanınca işlem
 * kayıtları "IBAN'a aktarıldı" olarak damgalanıyor ve `bakiyedekiTutar`
 * onları da eliyordu. Aynı para iki kez düşüldüğü için satıcının
 * bakiyesinin bir kısmı kalıcı olarak çekilemez hale geliyordu
 * (600 + 500 TL'lik iki satışta 500 TL çekildikten sonra kalan 600 TL,
 * ekranda 100 TL görünüyordu). O damga kaldırıldı.
 */
export function cekilebilirTutar(
  bakiye: number,
  liste: AktarimTalebi[],
): number {
  return Math.max(0, bakiye - bekleyenTutar(liste) - aktarilanTutar(liste));
}
