// ── Sipariş kodu ──────────────────────────────────────────────────────
//
// Kargo şubesinde ADRES YERİNE söylenen numara. Satıcı ürünü getirir,
// kodu söyler, görevli adresi kendi sisteminde görür — gönderen tarafın
// alıcının adresini bilmesi gerekmez (bkz. lib/kargo-gonderi.ts).
//
// `talepNo` gibi başlıktan TÜRETİLMEZ. Türetilmiş bir numara çakışabilir
// ve burada çakışmanın bedeli kozmetik değil: iki sipariş aynı kodu
// alırsa kargo görevlisinin ekranına yanlış adres gelir. Bu yüzden kod,
// `destekNo` ve `slugUret` ile aynı desende — yazma kilidinin içinde,
// mevcutlara bakılarak — üretilir (bkz. lib/depo.ts → anlasmaOlustur).
//
// Önek `SP-`; talep numarası `BB-` ile başlıyor ve ikisinin karışması
// kullanıcının yanlış numarayı söylemesi demek olurdu.

const ONEK = "SP-";

/**
 * Mevcutlarla çakışmayan yeni sipariş kodu.
 *
 * Altı hane bilinçli: telefonda okunacak ve şubede elle yazılacak kadar
 * kısa, tahmin edilemeyecek kadar uzun. Kod tek başına adres bilgisi
 * taşımaz, yani ele geçmesi adresi açığa çıkarmaz — yine de kaba kuvvetle
 * taranabilir bir alan olmaması için basamak, kayıt sayısı arttıkça
 * kendiliğinden büyür.
 */
export function siparisKoduUret(mevcut: string[] = []): string {
  const kullanilan = new Set(mevcut);
  for (let basamak = 6; basamak <= 10; basamak++) {
    const tavan = 10 ** basamak;
    const taban = 10 ** (basamak - 1);
    for (let deneme = 0; deneme < 50; deneme++) {
      const aday = `${ONEK}${Math.floor(taban + Math.random() * (tavan - taban))}`;
      if (!kullanilan.has(aday)) return aday;
    }
  }
  // Buraya düşmek pratikte imkânsız; yine de benzersizlik garanti edilir.
  return `${ONEK}${Date.now()}`;
}

/** Metin bir sipariş kodu biçiminde mi? */
export function siparisKoduMu(deger: string): boolean {
  return /^SP-\d{6,}$/.test(deger);
}
