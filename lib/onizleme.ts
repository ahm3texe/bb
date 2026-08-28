// ── Önizleme hesap geçişi ─────────────────────────────────────────────
// Prototipi alıcı ve satıcı gözünden hızlıca denemek için, parola sormadan
// demo hesapları arasında geçiş yapmayı sağlayan GEÇİCİ kolaylık.
//
// NEDEN TEHLİKELİ OLABİLİRDİ: sitede bir dönem tam olarak böyle bir hesap
// değiştirici vardı ve seçim imzasız bir çereze yazılıyordu. Sunucu kimliği
// o çerezden okuduğu için "hesap seçmek" ile "kimlik seçmek" aynı şeydi —
// tarayıcı konsoluna tek satır yazan herkes istediği hesap olabiliyordu.
//
// BU SÜRÜM FARKLI. Çerezi yine SUNUCU imzalıyor (bkz. lib/oturum-imza.ts) ve
// `httpOnly` basılıyor; istemci hâlâ kendi kimliğini yazamıyor. Atlanan tek
// şey parola sorusu. Yani bu bir kimlik doğrulama BYPASS'ı değil, yetkili
// bir kısayol.
//
// YİNE DE ÜRETİMDE AÇILMAMALI: parola sormadan oturum veren bir uç, adresi
// bilen herkesin demo hesaplarına girmesi demektir.
//
// Kapatmak için `.env.local` içindeki `BULBANA_ONIZLEME_GECISI` satırını sil
// ya da "0" yap. Kalıcı çözüm gerçek kayıt akışıdır (bkz. BACKEND.md →
// Kalan işler).

/**
 * Geçiş açık mı?
 *
 * Varsayılan KAPALI: değişken tanımlı değilse özellik yok sayılır. Bir
 * kolaylığın "unutulunca açık kalması" değil, "unutulunca kapalı kalması"
 * gerekir.
 */
export function onizlemeGecisiAcikMi(): boolean {
  return process.env.BULBANA_ONIZLEME_GECISI === "1";
}
