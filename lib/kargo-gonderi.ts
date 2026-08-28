// ── Adressiz gönderi ──────────────────────────────────────────────────
//
// KİMSE KARŞI TARAFIN ADRESİNİ GÖRMEZ.
//
// Eskiden ödeme alınır alınmaz alıcının tam adresi — kapı numarası, kat,
// daire, zil tarifi — satıcının ekranına düşüyordu; iade sürecinde de
// satıcının adresi alıcıya açılıyordu. İkisi de "kargoyu hazırlayacak
// tarafın adresi bilmesi lazım" varsayımına dayanıyordu. Bu varsayım
// yanlış: adresi bilmesi gereken taraf KARGO FİRMASIDIR, gönderen değil.
//
// Yeni akış:
//
//   sipariş açılır          → Bulbana sipariş kodu üretilir (SP-482913)
//   satıcı firmayı seçer    → adres SUNUCUDAN FİRMAYA gider (bu modül)
//   firma gönderi numarası döner
//   satıcı yalnızca kodu görür → şubede kodu söyler, ürünü teslim eder
//   görevli adresi kendi sisteminde görür
//
// Adres hiçbir aşamada karşı tarafın tarayıcısına inmez. Gönderenin
// elindeki tek şey koddur ve kod tek başına adres bilgisi taşımaz.
//
// İKİ NUMARA KARIŞTIRILMAMALI:
//
//   • `siparisKodu`  — Bulbana üretir, sipariş başına TEK, firmadan
//     bağımsız, hiç değişmez. Kullanıcının gördüğü ve söylediği budur.
//   • `gonderiNo`    — kargo firması üretir, firma başına farklıdır ve
//     her gönderi için ayrıdır. Takip numarası da budur. Bir sipariş
//     birden çok gönderi doğurabilir (iade = ters yönde ikinci gönderi),
//     yani ilişki sipariş 1 → gönderi N.
//
// GERÇEK SAĞLAYICI YOK (Faz 4). `SAGLAYICILAR` boş; bağlanacak tek yer o
// tablodur ve deseni `lib/kargo-durum.ts` ile aynıdır.
//
// Sağlayıcı bağlanana kadar gönderen takip numarasını ELLE girer ve kayıt
// bunun beyan olduğunu taşır (`Gonderi.beyan`). Numara doğrulanmamıştır ve
// arayüz bunu söyler — doğrulanmış bir gönderi numarası ile "satıcı böyle
// yazdı" aynı şey değildir. Firma bağlandığı gün beyan dalı kendiliğinden
// devre dışı kalır.
//
// ADRESİN KAPALI OLMASI BU DALDAN BAĞIMSIZDIR: numara elle girilse de
// adres hiçbir zaman karşı tarafa gösterilmez.

import type { TeslimatAdresi } from "./teslimat";

/** Gönderinin yönü. İade, aynı siparişin ters yönlü ikinci gönderisidir. */
export type GonderiYonu = "gidis" | "iade";

/** Kargo firmasında oluşturulmuş gönderi kaydı. */
export type Gonderi = {
  /** Gönderiyi oluşturan firma (`KARGO_FIRMALARI` içindeki ad). */
  firma: string;
  /** Firmanın kendi gönderi/barkod numarası — takip numarası da budur. */
  gonderiNo: string;
  yon: GonderiYonu;
  /**
   * Numara firmadan değil, GÖNDERENİN BEYANINDAN geldiyse `true`.
   *
   * Sağlayıcı bağlı değilken gönderen numarayı elle girer; o numara
   * hiçbir yerde doğrulanmaz. Ayrımı kayıtta tutmak şart: doğrulanmış bir
   * gönderi numarası ile "satıcı böyle yazdı" aynı şey değil ve sonradan
   * çıkacak bir anlaşmazlıkta bu fark gerekir. Arayüz de beyan olduğunu
   * söyler.
   */
  beyan?: boolean;
  olusturuldu: string;
};

/**
 * Sağlayıcıya gidecek istek.
 *
 * `adres` BURADAN ÖTEYE GİTMEZ: bu nesne yalnızca sunucuda yaşar ve
 * firmanın API'sine gider. Hiçbir uç bunu yanıt gövdesine koymamalı.
 */
export type GonderiIstegi = {
  siparisKodu: string;
  yon: GonderiYonu;
  /** Kargo etiketine yazılacak alıcı adı. */
  aliciAdi: string;
  adres: TeslimatAdresi;
};

/** Bir kargo firmasının gönderi oluşturma bağlantısı. */
export type Saglayici = (istek: GonderiIstegi) => Promise<{ gonderiNo: string }>;

/**
 * Firma adı → sağlayıcı. Bugün BOŞ.
 *
 * Her firma kurumsal sözleşme ve API anahtarı ister; anahtarlar ortam
 * değişkeninden okunmalı ve bu tabloya buradan bağlanmalı. Firmaların
 * takip/gönderi sayfalarını kazımak seçenek değil: kullanım şartlarına
 * aykırı, bot korumasına takılır ve sayfa değişince sessizce bozulur.
 */
export const SAGLAYICILAR: Record<string, Saglayici> = {};

/** Sağlayıcısı bağlı firmalar — arayüz seçenekleri buna göre süzülebilir. */
export function bagliFirmalar(): string[] {
  return Object.keys(SAGLAYICILAR);
}

/**
 * Firmada gönderi oluşturur ve gönderi numarasını döndürür.
 *
 * Sağlayıcı bağlı değilse `"saglayici-yok"`, firma isteği reddederse
 * `"saglayici-hatasi"` döner. İkisi ayrı: birincisi bizim eksiğimiz,
 * ikincisi firmanın yanıtı ve kullanıcıya farklı şey söylenmeli.
 *
 * KİLİDİN DIŞINDAN ÇAĞRILMALI: ağ çağrısı içerir, yazma kuyruğunu
 * bekletmemeli (bkz. lib/depo.ts → sirala).
 */
export async function gonderiOlustur(
  firma: string,
  istek: GonderiIstegi,
  elleTakipNo?: string,
): Promise<Gonderi | "saglayici-yok" | "saglayici-hatasi"> {
  const saglayici = SAGLAYICILAR[firma];

  // SAĞLAYICI YOKKEN ELLE GİRİLEN NUMARA KABUL EDİLİR.
  //
  // Hiçbir firma bağlı olmadığı için sağlayıcıyı şart koşmak kargo
  // adımını tamamen kapatıyordu. Gönderen numarayı elle girebiliyor ama
  // kayıt bunun BEYAN olduğunu taşıyor ve arayüz de söylüyor — numara
  // doğrulanmış gibi gösterilmiyor. Firma bağlandığı gün bu dal
  // kendiliğinden devre dışı kalır: sağlayıcı varsa beyan okunmaz.
  if (!saglayici) {
    if (!elleTakipNo) return "saglayici-yok";
    return {
      firma,
      gonderiNo: elleTakipNo,
      yon: istek.yon,
      beyan: true,
      olusturuldu: new Date().toISOString(),
    };
  }

  try {
    const { gonderiNo } = await saglayici(istek);
    if (!gonderiNo) return "saglayici-hatasi";
    return {
      firma,
      gonderiNo,
      yon: istek.yon,
      olusturuldu: new Date().toISOString(),
    };
  } catch {
    return "saglayici-hatasi";
  }
}
