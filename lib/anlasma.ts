// ── Anlaşma ───────────────────────────────────────────────────────────
// Teklif kabul edildiği anda pazarlık biter ve sipariş başlar. Bu dosya
// siparişin veri şeklini ve akış kurallarını tanımlar; kalıcılık
// `lib/depo.ts` içindedir.
//
// Akış: teklif kabul → alıcı öder → satıcının kargo süresi işlemeye
// başlar → satıcı kargo firmasını seçer, sistem gönderiyi oluşturur →
// satıcı şubede sipariş kodunu söyler → alıcı kargoyu takip eder.
//
// ADRES HİÇBİR TARAFA GÖSTERİLMEZ: gönderiyi firma oluşturur, adres
// sunucudan firmaya gider (bkz. lib/kargo-gonderi.ts).

import type { Gonderi } from "./kargo-gonderi";

export type Anlasma = {
  /** Sohbetin ve siparişin çapası — anlaşma sunum başına tektir. */
  sunumId: string;
  talepId: string;
  alici: string;
  satici: string;
  /** Üzerinde anlaşılan tutar (TL). */
  tutar: number;
  /** Teklifi kabul eden taraf — iki taraf da kabul edebilir. */
  kabulEden: string;
  kabulZamani: string;
  /** Satıcının sunumunda vaat ettiği kargolama süresi (saat). */
  kargoSaat: number;
  /**
   * Bulbana sipariş kodu (`SP-482913`) — kargo şubesinde ADRES YERİNE
   * söylenen numara. Sipariş başına tek, firmadan bağımsız, değişmez
   * (bkz. lib/siparis-kodu.ts).
   *
   * İsteğe bağlı görünüyor çünkü bu alan eklenmeden önce açılmış kayıtlar
   * var; eksik kalanlara `anlasmalariTazele` ilk dokunuşta kod atar.
   */
  siparisKodu?: string;
  /** Ödeme alındığı an — sayaç buradan işler. */
  odemeZamani?: string;
  kargoFirma?: string;
  /**
   * Takip numarası — KARGO FİRMASINDAN gelir, satıcının beyanı değildir.
   * Firma gönderi oluşturunca kendi numarasını döner ve o numara hem
   * gönderi hem takip numarasıdır (bkz. `gonderi`).
   */
  takipNo?: string;
  /** Firmada oluşturulan gönderi kaydı — satıcı→alıcı yönü. */
  gonderi?: Gonderi;
  /** Takip bilgisinin girildiği an. */
  kargoZamani?: string;
  /** Kargonun teslim edildiği an — firmadan gelir (webhook/sorgulama). */
  teslimZamani?: string;
  /*
   * ALICIYA "ÜRÜNÜ TESLİM ALDIN MI?" DİYE SORULMAZ.
   *
   * Burada `aliciTeslimZamani` diye bir alan vardı: kargo firması teslimi
   * bildirdikten SONRA alıcıdan ayrıca "ürünü teslim aldım" onayı
   * isteniyordu ve "anlatıldığı gibi mi?" sorusu ancak ondan sonra
   * açılıyordu.
   *
   * İki sebeple kaldırıldı:
   *
   * 1. GEREKSİZ. Teslim bilgisi kargo firmasından geliyorsa taşıyıcının
   *    kaydı zaten var; aynı olayı bir de alıcıya doğrulatmak, akışa
   *    hiçbir bilgi katmayan fazladan bir adımdır.
   * 2. KÖTÜYE KULLANILABİLİR. Ürün eline ulaşmış bir alıcı "almadım"
   *    diyerek adımı hiç geçmeyebilir; 24 saatlik sayaç dolana kadar
   *    süreci ve satıcının parasını bekletirdi.
   *
   * Artık teslim damgası (`teslimZamani`) düştüğü anda sıra doğrudan
   * "ürün anlatıldığı gibi mi?" sorusuna gelir (`onay`).
   */
  /** Alıcının "ürün anlatıldığı gibi mi?" yanıtı. */
  onay?: "evet" | "hayir";
  onayZamani?: string;
  /**
   * Onay alıcıdan değil, 24 saatlik sürenin dolmasından geldiyse `true`.
   * Anlaşmazlıkta "alıcı gerçekten onayladı mı?" sorusunun cevabı budur.
   */
  otomatikOnay?: boolean;
  /**
   * İtiraz sonrası iade süreci. Alıcı ürünü reddettiğinde başlar ve dört
   * adımda kapanır: destek kararı → ürünün geri kargolanması → satıcının
   * teslim onayı → paranın havuzdan alıcıya iadesi. Süreç kapanana kadar
   * talep silinemez.
   */
  iade?: IadeSureci;
};

export type IadeSureci = {
  /** Destek ekibinin kararı. */
  karar?: "alici-hakli" | "satici-hakli";
  kararZamani?: string;
  /**
   * Karşı itiraz sonrası destek ekibinin ikinci kararı.
   * "iade" → para yine alıcıya döner, "ret" → süreç satıcı lehine kapanır.
   */
  ikinciKarar?: "iade" | "ret";
  ikinciKararZamani?: string;
  /**
   * Alıcının ürünü geri gönderdiği kargo. `takipNo` firmadan gelir;
   * satıcının adresi alıcıya HİÇ gösterilmez, iade de sipariş koduyla
   * yapılır (bkz. lib/kargo-gonderi.ts).
   */
  kargoFirma?: string;
  takipNo?: string;
  /** Firmada oluşturulan iade gönderisi — alıcı→satıcı yönü. */
  gonderi?: Gonderi;
  kargoZamani?: string;
  /** İade kargosunun satıcıya ulaştığı an (kargo firmasından gelir). */
  kargoTeslimZamani?: string;
  /**
   * Alıcı, "alıcı haklı" kararına rağmen ürünü süresinde iade kargosuna
   * vermediyse damgalanır ve süreç satıcı lehine kapanır.
   *
   * Destek kararı EZİLMEZ (`karar` alanı olduğu gibi kalır): kayıt, "alıcı
   * haklı bulundu ama ürünü göndermedi" gerçeğini olduğu gibi taşımalı.
   */
  kargoSuresiAsildi?: string;
  /** Satıcının "ürün gönderdiğim gibi mi?" yanıtı. */
  saticiOnay?: "evet" | "hayir";
  saticiOnayZamani?: string;
  /** Satıcı ürünü gönderdiği gibi bulmadıysa açılan karşı itiraz. */
  karsiItiraz?: string;
  /** Satıcının "ürün elime ulaştı" onayı (eski kayıtlar için). */
  saticiTeslimZamani?: string;
  /** Paranın havuzdan alıcıya iade edildiği an. */
  iadeZamani?: string;
};

/** İtiraz sürecinin bulunduğu adım. */
export type IadeAdim =
  | "inceleme"
  | "iade-kargosu-bekleniyor"
  | "iade-kargoda"
  | "satici-onayi-bekleniyor"
  | "karsi-itiraz"
  | "para-iadesi-bekleniyor"
  | "tamamlandi"
  | "satici-hakli";

/** Alıcının ürünü iade kargosuna verme süresi. */
export const IADE_KARGO_SURESI_MS = 2 * 24 * 60 * 60 * 1000;

/** İade kargosu süresi doldu mu — alıcı ürünü zamanında göndermedi mi? */
export function iadeKargoSuresiDoldu(a: Anlasma, simdi = Date.now()): boolean {
  if (iadeAdimi(a) !== "iade-kargosu-bekleniyor") return false;
  return simdi >= new Date(iadeKargoSonTarih(a)).getTime();
}

/** İade kargosu için son tarih (ISO) — kararın üstünden 2 gün. */
export function iadeKargoSonTarih(a: Anlasma): string {
  const bas = a.iade?.kararZamani
    ? new Date(a.iade.kararZamani).getTime()
    : Date.now();
  return new Date(bas + IADE_KARGO_SURESI_MS).toISOString();
}

/**
 * İtiraz/iade sürecinin adımı. Sıra: destek incelemesi → alıcı ürünü geri
 * kargolar → satıcı teslim aldığını onaylar → para iade edilir.
 */
export function iadeAdimi(a: Anlasma): IadeAdim {
  const i = a.iade;
  if (!i?.karar) return "inceleme";
  if (i.karar === "satici-hakli") return "satici-hakli";
  if (i.iadeZamani) return "tamamlandi";
  // Karşı itiraz destek ekibince sonuçlandıysa süreç oradan devam eder.
  if (i.ikinciKarar === "ret") return "satici-hakli";
  if (i.ikinciKarar === "iade") return "para-iadesi-bekleniyor";
  // Satıcı ürünü "gönderdiğim gibi değil" dediyse karşı itiraz açılır.
  if (i.saticiOnay === "hayir") return "karsi-itiraz";
  if (i.saticiOnay === "evet" || i.saticiTeslimZamani)
    return "para-iadesi-bekleniyor";
  // Kargo satıcıya ulaştıysa sıra satıcının kontrolünde.
  if (i.kargoTeslimZamani) return "satici-onayi-bekleniyor";
  if (i.kargoZamani) return "iade-kargoda";
  // Alıcı ürünü süresinde göndermediyse süreç satıcı lehine kapanır: ürün
  // alıcıda kaldığına göre bedelini de o ödemelidir.
  if (i.kargoSuresiAsildi) return "satici-hakli";
  return "iade-kargosu-bekleniyor";
}

/**
 * Sipariş hâlâ sürüyor mu?
 *
 * Tamamlanan ve itirazı kapanmış siparişler bitmiştir; geri kalan her şey
 * (ödeme, kargo, teslim, açık itiraz) sürüyor sayılır. Bir talebin ikinci
 * kez siparişe dönüp dönemeyeceği buna bakılarak karara bağlanır.
 */
export function siparisSuruyor(a: Anlasma): boolean {
  const durum = anlasmaDurumu(a);
  if (durum === "tamamlandi") return false;
  // "Sorunlu" tek başına bitmiş demek değil: iade süreci hâlâ işliyor olabilir.
  if (durum === "sorunlu") return !itirazKapandiMi(a);
  return true;
}

/** İtiraz süreci kapandı mı — talep ancak kapandıktan sonra silinebilir. */
export function itirazKapandiMi(a: Anlasma): boolean {
  if (a.onay !== "hayir") return true;
  const adim = iadeAdimi(a);
  return adim === "tamamlandi" || adim === "satici-hakli";
}

/** Siparişin bulunduğu adım — kayıttan türetilir, ayrıca saklanmaz. */

export type AnlasmaDurum =
  | "odeme-bekleniyor"
  | "kargo-bekleniyor"
  | "kargoda"
  | "teslim-edildi"
  | "tamamlandi"
  | "sorunlu";

export function anlasmaDurumu(a: Anlasma): AnlasmaDurum {
  // Sonuç önce okunur: teslimden sonra alıcının yanıtı siparişi bitirir.
  if (a.onay === "evet") return "tamamlandi";
  if (a.onay === "hayir") return "sorunlu";
  if (a.teslimZamani) return "teslim-edildi";
  if (a.kargoZamani) return "kargoda";
  if (a.odemeZamani) return "kargo-bekleniyor";
  return "odeme-bekleniyor";
}

/**
 * Satıcının sunumdaki teslim vaadini saate çevirir.
 * Vaat metni serbest değil, sunum formundaki seçeneklerden gelir; yine de
 * tanınmayan bir değer gelirse en uzun süre (3 gün) kabul edilir — süreyi
 * satıcı aleyhine kısaltmak yanlış olur.
 */
export function kargoSaatiCoz(teslim: string): number {
  return /18\s*saat/i.test(teslim) ? 18 : 72;
}

// ── Teslim sonrası onay süresi ────────────────────────────────────────
// Kargo firması teslimi bildirdiği anda alıcının 24 saati başlar. Bu süre
// içinde ürünü teslim aldığını onaylayıp "anlatıldığı gibi mi?" sorusunu
// yanıtlaması beklenir.
//
// Süre dolarsa alışveriş OTOMATİK ONAYLANIR ve para satıcıya geçer. Aksi
// hâlde sessiz kalan bir alıcı parayı havuzda süresiz tutabilir; satıcı da
// ne parasını ne ürününü alır.
//
// Sayaç `teslimZamani`'den işler ve "teslim aldım" ile UZAMAZ: uzasaydı
// alıcı düğmeye basıp ikinci adımı süresiz bekletebilirdi.

export const ALICI_ONAY_SURESI_MS = 24 * 60 * 60 * 1000;

/** Alıcının yanıt vermesi gereken son an (ISO). Teslim gelmediyse yok. */
export function aliciOnaySonTarih(a: Anlasma): string | undefined {
  if (!a.teslimZamani) return undefined;
  return new Date(
    new Date(a.teslimZamani).getTime() + ALICI_ONAY_SURESI_MS,
  ).toISOString();
}

/** Alıcı süresinde yanıt vermedi mi? (Otomatik onay koşulu.) */
export function aliciOnaySuresiDoldu(a: Anlasma, simdi = Date.now()): boolean {
  // Yanıt verilmişse süre işlemez; teslim gelmediyse sayaç başlamamıştır.
  if (a.onay || !a.teslimZamani) return false;
  const son = aliciOnaySonTarih(a);
  return !!son && simdi >= new Date(son).getTime();
}

// ── Ödeme süresi ──────────────────────────────────────────────────────
// Kabul, ürünü diğer alıcı adaylarına kapatır; bu yüzden süresiz
// bekleyemez. Alıcı bir saat içinde ödemezse anlaşma düşer, talep
// yeniden sunuma açılır ve satıcı boş yere beklemekten kurtulur.

export const ODEME_SURESI_MS = 60 * 60 * 1000;

/** Ödemenin yapılması gereken son an (ISO). */
export function odemeSonTarih(a: Anlasma): string {
  return new Date(
    new Date(a.kabulZamani).getTime() + ODEME_SURESI_MS,
  ).toISOString();
}

/** Ödenmeden süresi dolmuş anlaşma mı? */
export function odemeSuresiDoldu(a: Anlasma, simdi = Date.now()): boolean {
  if (a.odemeZamani) return false;
  return simdi >= new Date(odemeSonTarih(a)).getTime();
}

/** Sayacın bittiği an (ISO). Ödeme yapılmadıysa sayaç başlamamıştır. */
export function kargoSonTarih(a: Anlasma): string | undefined {
  if (!a.odemeZamani) return undefined;
  return new Date(
    new Date(a.odemeZamani).getTime() + a.kargoSaat * 3600_000,
  ).toISOString();
}

/**
 * Satıcı vaat ettiği süre içinde kargoya vermedi mi?
 *
 * Yardım sayfası bunu açıkça taahhüt ediyor: "süre aşılırsa satış otomatik
 * iptal olur ve alıcının ödemesi eksiksiz iade edilir." Süre yalnızca ekranda
 * sayaç olarak duruyordu, hiçbir yerde sonuç doğurmuyordu; taahhüdün
 * karşılığı `kargoGecikenleriDusur()` (bkz. lib/depo.ts).
 */
export function kargoSuresiDoldu(a: Anlasma, simdi = Date.now()): boolean {
  // Ödeme yapılmadıysa sayaç başlamamıştır; kargo girildiyse söz tutulmuştur.
  if (!a.odemeZamani || a.kargoZamani) return false;
  const son = kargoSonTarih(a);
  return !!son && simdi >= new Date(son).getTime();
}

// ── Kargo firmaları ───────────────────────────────────────────────────
// Takip bağlantısı olan firmalar; alıcı takip numarasına tıklayınca
// firmanın kendi takip sayfasına gider.

/**
 * Firmaların takip adresleri. `takip` doluysa numara adrese eklenir ve
 * sorgu doğrudan açılır; boşsa `site` adresine gidilir ve numaranın
 * elle yapıştırılması gerekir.
 *
 * Adresler 15/08/2026'da tek tek denendi. Çalışmayan bir derin bağlantıyı
 * listede tutmaktansa firmanın kendi takip sayfasına göndermek doğru:
 * kullanıcı yanlış bir sayfada kaybolmuyor.
 */
export const KARGO_FIRMALARI = [
  {
    ad: "Yurtiçi Kargo",
    takip: "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=",
    site: "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula",
  },
  {
    ad: "Aras Kargo",
    takip: "https://www.araskargo.com.tr/kargom-nerede?code=",
    site: "https://www.araskargo.com.tr/kargom-nerede",
  },
  {
    // MNG Kargo DHL eCommerce bünyesine geçti; eski adres oraya
    // yönleniyordu. Doğrudan yeni adrese gidiyoruz ki "MNG'ye tıkladım,
    // DHL açıldı" şaşkınlığı olmasın.
    ad: "MNG Kargo (DHL eCommerce)",
    takip: "https://kargotakip.dhlecommerce.com.tr/?takipNo=",
    site: "https://kargotakip.dhlecommerce.com.tr/",
  },
  {
    // PTT'nin numarayı adresten kabul eden bir sayfası bulunamadı;
    // her deneme ana sayfaya düşüyor. Bu yüzden yalnızca takip sayfası.
    ad: "PTT Kargo",
    takip: "",
    site: "https://gonderitakip.ptt.gov.tr/",
  },
  {
    ad: "Sürat Kargo",
    takip: "https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=",
    site: "https://www.suratkargo.com.tr/KargoTakip/",
  },
  {
    ad: "UPS Kargo",
    takip: "https://www.ups.com/track?tracknum=",
    site: "https://www.ups.com/track",
  },
  {
    ad: "DHL",
    takip: "https://www.dhl.com/tr-tr/home/tracking.html?submit=1&tracking-id=",
    site: "https://www.dhl.com/tr-tr/home/tracking.html",
  },
  {
    ad: "FedEx",
    takip: "https://www.fedex.com/fedextrack/?trknbr=",
    site: "https://www.fedex.com/fedextrack/",
  },
  { ad: "Diğer", takip: "", site: "" },
] as const;

/**
 * Firma kaydını bulur. Daha önce kaydedilmiş sunumlarda firma adı eski
 * hâliyle duruyor olabilir (ör. "MNG Kargo"); eski adlar da tanınır ki
 * geçmiş siparişlerin takip bağlantısı kırılmasın.
 */
function firmaBul(firma: string) {
  const eskiAdlar: Record<string, string> = {
    "MNG Kargo": "MNG Kargo (DHL eCommerce)",
    "Trendyol Express": "Diğer",
  };
  const ad = eskiAdlar[firma] ?? firma;
  return KARGO_FIRMALARI.find((k) => k.ad === ad);
}

/**
 * Takip numarasının açılacağı adres.
 * Derin bağlantı varsa numara adrese gömülür; yoksa firmanın takip
 * sayfası döner. Firma tanınmıyorsa boş döner ve numara düz metin kalır.
 */
export function takipAdresi(firma: string, takipNo: string): string {
  const kayit = firmaBul(firma);
  if (!kayit) return "";
  if (kayit.takip) return kayit.takip + encodeURIComponent(takipNo);
  return kayit.site;
}

/** Numara adrese gömülüyor mu? Gömülmüyorsa kullanıcı uyarılır. */
export function takipNumarasiOtomatikMi(firma: string): boolean {
  return Boolean(firmaBul(firma)?.takip);
}
