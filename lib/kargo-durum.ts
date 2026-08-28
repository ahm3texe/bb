// ── Kargo durumu sorgulama ────────────────────────────────────────────
// BACKEND SINIRI. "Gönderi teslim edildi mi?" sorusunun tek cevap yeri.
//
// BUGÜN GERÇEK BİR BAĞLANTI YOK ve olamaz: kargo firmalarının teslim
// bilgisi ancak kendi API'lerinden alınır, bunun için her firmayla
// kurumsal sözleşme ve API anahtarı gerekir. Firmaların takip sayfalarını
// kazımak ise hem kullanım şartlarına aykırı hem de bot korumaları ve
// değişen sayfa yapısı yüzünden güvenilmez — o yola girilmemeli.
//
// TESLİM BİLGİSİ YALNIZCA TAŞIYICIDAN GELİR. İki yol var, ikisi de firma
// bağlantısı ister:
//
// 1) WEBHOOK (tercih edilen): firma teslim anında Bulbana'yı arar.
//    `POST /api/anlasmalar/<sunumId>/teslim` ucu bunun için hazır.
//    Üretimde bu ucun firma imzasını doğrulaması şart.
//
// 2) SORGULAMA: firma webhook desteklemiyorsa `kargoDurumuSorgula`
//    periyodik olarak firmanın API'sine sorar. Aşağıdaki `SORGULAYICILAR`
//    tablosuna firma başına birer fonksiyon eklemek yeterli; çağıran
//    hiçbir yer değişmez.
//
// Firma başına gereken: API tabanı, kimlik bilgisi (müşteri no + şifre ya
// da token) ve teslim durumunun hangi alanda döndüğü.
//
// ÜÇÜNCÜ BİR YOL VARDI VE KAPATILDI: alıcı "ürünü elime aldım" diyor,
// damga oradan basılıyordu. Adım hem gereksizdi (aynı olayı taşıyıcı zaten
// bildiriyor) hem de kötüye kullanılabiliyordu — ürünü almış bir alıcı
// "almadım" diyerek süreci ve satıcının parasını bekletebiliyordu
// (bkz. BACKEND.md → Teslim sonrası tek adım).
//
// Bedeli: bu iki yoldan biri kurulana kadar `teslimZamani` dolmaz ve
// akışın son üçte biri ilerlemez. Bilinçli tercih — ölçülmeyen bir olayı
// kullanıcıya doğrulatmaktansa adım eksik kalsın.

export type KargoDurumu = "yolda" | "teslim-edildi" | "bilinmiyor";

/**
 * Firma başına sorgulama fonksiyonları. Anahtar, `KARGO_FIRMALARI`
 * içindeki firma adıdır. Bugün boş — anlaşma yapılan firma eklendikçe
 * doldurulacak.
 */
const SORGULAYICILAR: Record<
  string,
  (takipNo: string) => Promise<KargoDurumu>
> = {};

/**
 * Gönderinin durumunu sorar.
 * Firma için sorgulayıcı tanımlı değilse "bilinmiyor" döner — bu bir hata
 * değildir; teslim bilgisi o firmada webhook'tan gelecek demektir.
 */
export async function kargoDurumuSorgula(
  firma: string,
  takipNo: string,
): Promise<KargoDurumu> {
  const sorgula = SORGULAYICILAR[firma];
  if (!sorgula || !takipNo) return "bilinmiyor";
  try {
    return await sorgula(takipNo);
  } catch {
    // Firma servisi cevap vermiyorsa akış durmamalı; bir sonraki
    // sorguda yeniden denenir.
    return "bilinmiyor";
  }
}
