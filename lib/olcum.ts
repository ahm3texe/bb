// ── Ölçülen kullanıcı metrikleri ──────────────────────────────────────
// "Yanıt süresi · ~1 saat" ve "Ort. kargolama · 1 gün" bir dönem herkese
// açık profilde yazıyordu ve İKİSİ DE KODA GÖMÜLÜ SABİTTİ; ölçen hiçbir
// kod yoktu. Alıcı satıcı seçerken tam da bu iki sayıya bakıyordu.
//
// Buradaki iki fonksiyon onları gerçekten hesaplar. İkisi de SAF: girdiyi
// dışarıdan alır, depoya dokunmaz — böylece test edilebilirler. Ölçüm
// yapılamıyorsa `null` döner, `0` DEĞİL: "0 saatte yanıtlıyor" ile "hiç
// ölçemedik" aynı şey değildir ve arayüz ikincisinde "—" gösterir
// (bkz. `zamanindaKargo` ile aynı gerekçe).

import type { Anlasma } from "./anlasma";
import type { Mesaj } from "./depo";

const SAAT_MS = 60 * 60 * 1000;

/**
 * Kullanıcının mesajlara ortalama yanıt süresi (saat).
 *
 * Sayım şöyle: her sohbette karşı tarafın yazdığı bir mesaj bloğu ile
 * kullanıcının ona verdiği İLK cevap arasındaki süre bir ölçümdür.
 *
 * "Blok" ayrımı önemli — karşı taraf üst üste üç mesaj yazıp sonra cevap
 * aldıysa bu ÜÇ değil BİR bekleyiştir ve süre ilk mesajdan işler. Her
 * mesajı ayrı saymak, çok mesaj yazan kişinin muhatabını haksız yere
 * yavaş göstermek olurdu.
 *
 * Kullanıcının kendi başlattığı sohbet (ilk mesaj ondaysa) ölçüme girmez:
 * ortada beklenen bir yanıt yoktur.
 *
 * Hiç yanıtlanmış bekleyiş yoksa `null`.
 */
export function ortalamaYanitSaati(
  mesajlar: readonly Mesaj[],
  kullanici: string,
): number | null {
  const sohbetler = new Map<string, Mesaj[]>();
  for (const m of mesajlar) {
    const liste = sohbetler.get(m.sohbetId);
    if (liste) liste.push(m);
    else sohbetler.set(m.sohbetId, [m]);
  }

  const sureler: number[] = [];

  for (const ham of sohbetler.values()) {
    const sirali = [...ham].sort((a, b) => a.zaman.localeCompare(b.zaman));

    // Karşı tarafın bekleyişe geçtiği an; kullanıcı cevaplayınca sıfırlanır.
    let bekleyisBasi: number | null = null;

    for (const m of sirali) {
      const t = new Date(m.zaman).getTime();
      if (!Number.isFinite(t)) continue;

      if (m.gonderen === kullanici) {
        // Bekleyen bir mesaj varsa bu onun cevabıdır.
        if (bekleyisBasi !== null) {
          const fark = t - bekleyisBasi;
          // Geriye giden damga bozuk kayıttır; ölçüme katılmaz.
          if (fark >= 0) sureler.push(fark);
          bekleyisBasi = null;
        }
      } else if (bekleyisBasi === null) {
        // Bloğun İLK mesajı sayacı başlatır; sonrakiler onu ötelemez.
        bekleyisBasi = t;
      }
    }
  }

  if (!sureler.length) return null;
  const ortalama = sureler.reduce((t, s) => t + s, 0) / sureler.length;
  return saateYuvarla(ortalama);
}

/**
 * Satıcının ortalama kargolama süresi (saat): ödeme alındıktan sonra
 * gönderiyi kargoya verene kadar geçen süre.
 *
 * `zamanindaKargo` ile karıştırmayın: o, satıcının VERDİĞİ SÖZÜ tutup
 * tutmadığını söyler (yüzde); bu ise ne kadar hızlı olduğunu (saat). İkisi
 * ayrı sorulardır — 3 gün söz verip 3 günde gönderen sözünde durmuştur ama
 * hızlı değildir.
 *
 * Hiç gönderisi yoksa `null`.
 */
export function ortalamaKargoSaati(
  anlasmalar: readonly Anlasma[],
  satici: string,
): number | null {
  const sureler: number[] = [];

  for (const a of anlasmalar) {
    if (a.satici !== satici) continue;
    if (!a.odemeZamani || !a.kargoZamani) continue;

    const odeme = new Date(a.odemeZamani).getTime();
    const kargo = new Date(a.kargoZamani).getTime();
    if (!Number.isFinite(odeme) || !Number.isFinite(kargo)) continue;

    const fark = kargo - odeme;
    // Kargo ödemeden önce görünüyorsa kayıt bozuktur; sayıma katmayız.
    if (fark >= 0) sureler.push(fark);
  }

  if (!sureler.length) return null;
  const ortalama = sureler.reduce((t, s) => t + s, 0) / sureler.length;
  return saateYuvarla(ortalama);
}

/**
 * Milisaniyeyi okunur bir saat sayısına çevirir.
 *
 * Bir saatin altındaki süreler `0` değil, en az `1` olur: "0 saat" ekranda
 * ölçüm yokmuş gibi durur, oysa ölçüm var ve çok hızlı demektir. Yarım
 * saati aşan kesirler yukarı yuvarlanır.
 */
function saateYuvarla(ms: number): number {
  return Math.max(1, Math.round(ms / SAAT_MS));
}

/** "2 saat" · "1 gün" · "3 gün" — süreyi ekrandaki metne çevirir. */
export function sureMetni(saat: number | null): string {
  if (saat === null) return "—";
  if (saat < 24) return `${saat} saat`;
  const gun = Math.round(saat / 24);
  return `${gun} gün`;
}
