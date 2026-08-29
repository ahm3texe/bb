// ── Destek kayıtları ──────────────────────────────────────────────────
// Sipariş panelindeki "Destek kaydı açıldı" ifadesi ancak GERÇEKTEN kayıt
// açıldığında görünmelidir; alıcının ürünü reddetmesi tek başına kayıt
// açmaz, yalnızca kaydı açma yolunu gösterir.

export type DestekKaydi = {
  /** Kullanıcıya gösterilen numara — "#DT-1234". */
  no: string;
  /** Kaydı açan kullanıcı. */
  acan: string;
  konu: string;
  /** Sipariş/talep referansı; sohbetten gelindiyse sunum kimliği. */
  refNo: string;
  /** Kaydın bağlı olduğu sipariş (varsa) — panel bununla eşleştirir. */
  sunumId?: string;
  baslik: string;
  aciklama: string;
  /**
   * Kullanıcının iliştirdiği ekran görüntüleri — `/api/yukle` yolları.
   *
   * Form bir dönem "Ekler *" diye ZORUNLU bir alan gösteriyordu ama ortada
   * ne dosya seçici ne yükleme vardı: `+` kutusuna tıklamak yalnızca bir
   * sayacı artırıyor, "ek 1 ✓" yazısı çıkıyordu. Kullanıcı ekran
   * görüntüsünü iliştirdiğini sanarak kaydı açıyor, destek ekibine hiçbir
   * şey ulaşmıyordu — üstelik o sahte tıklama gönderim şartıydı.
   */
  ekler?: string[];
  durum: "İncelemede" | "Yanıtlandı" | "Kapandı";
  zaman: string;
};

/**
 * Yeni kayıt numarası — kısa, okunur ve MEVCUTLARLA ÇAKIŞMAZ.
 *
 * Eskiden yalnızca `1000-9999` arası rastgele bir sayıydı: 9000 olası değer
 * demek, 100 kayıtta %42 çakışma demek. Numara hem kullanıcının referansı
 * hem de listede React anahtarı olduğu için çakışma iki kaydı birbirine
 * karıştırıyordu.
 *
 * `slugUret` ile aynı desen: kimlik yazma kilidinin içinde, mevcutlara
 * bakılarak üretilir (bkz. lib/depo.ts → destekKaydiEkle).
 */
export function destekNo(mevcut: string[] = []): string {
  const kullanilan = new Set(mevcut);
  // Rastgele deneme; dolmuşsa basamak artırılır, sonsuz döngü olmaz.
  for (let basamak = 4; basamak <= 8; basamak++) {
    const tavan = 10 ** basamak;
    const taban = 10 ** (basamak - 1);
    for (let deneme = 0; deneme < 50; deneme++) {
      const aday = `#DT-${Math.floor(taban + Math.random() * (tavan - taban))}`;
      if (!kullanilan.has(aday)) return aday;
    }
  }
  // Buraya düşmek pratikte imkânsız; yine de benzersizlik garanti edilir.
  return `#DT-${Date.now()}`;
}
