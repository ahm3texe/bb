import type { Sunum } from "@/components/SunumOnizleme";

/**
 * Kendi ilanlarıma gelen sunumlar (birden fazla talep).
 * Profil > Gelen Sunumlar listesi ile karşılaştırma sayfası aynı kaynaktan okur;
 * karşılaştırma her zaman TEK bir talep içinde yapılır.
 */
export type GelenSunum = Sunum & {
  id: string;
  /** Sunumun gönderildiği talep — karşılaştırma yalnızca aynı talep içinde yapılır. */
  talepId: string;
  satici: string;
  harf: string;
  puan: string;
  /**
   * Hesap türü. Bilinmiyorsa YAZILMAZ: uç her sunuma sabit "Bireysel"
   * basıyordu ve alıcı bunu satıcı hakkında gerçek bilgi sanıyordu.
   * Hesap türü alanı kullanıcı kaydına eklenince buradan gelecek.
   */
  saticiTipi?: "Mağaza" | "Bireysel";
  /** Satıcının Bulbana geçmişi — karşılaştırmada tartılır. */
  satis: number;
  /**
   * Satıcının mesajlara ortalama yanıt süresi (saat).
   *
   * Bir dönem her sunuma sabit `2` basılıyordu ve karşılaştırma tablosunda
   * "~2 saat" diye gerçek bir ölçümmüş gibi görünüyordu; ölçüm eklenene
   * kadar da hiç yazılmadı. Artık GERÇEKTEN ölçülüyor (bkz. lib/olcum.ts →
   * `ortalamaYanitSaati`) ve okuma anında tazeleniyor — kayda donmaz.
   * Ölçüm yoksa alan yazılmaz ve arayüz "—" gösterir.
   */
  yanitSaat?: number;
  /**
   * Satıcının sözünde durduğu kargo yüzdesi. Hiç gönderisi yoksa YAZILMAZ —
   * "%0" göstermek, henüz kargolamamış bir satıcıyı sözünde durmamış gibi
   * gösterirdi (bkz. `yanitSaat` ve `saticiTipi` ile aynı gerekçe).
   */
  zamanindaKargo?: number;
  ne: string;
  /**
   * Sunumun akıbeti. Alıcı karar verene kadar "beklemede"; kabul edilirse
   * "kabul", reddedilirse "red", kabul edilip ödeme süresi kaçırılınca
   * "iptal" olur. Aynı satıcı, sonuçlanmamış bir
   * sunumu varken aynı talebe ikinci kez sunum yapamaz — reddedildikten
   * sonra yeniden yapabilir. Eski kayıtlarda alan yok; okuyan taraf
   * boş değeri "beklemede" saymalı (bkz. sunumAcikMi).
   */
  sonuc?:
    | "beklemede"
    | "kabul"
    | "red"
    | "iptal"
    | "suresi-doldu"
    /** Talep yeniden yayına alındı; bu sunum önceki yayın dönemine ait. */
    | "arsiv"
    /**
     * Alıcı aynı talepteki BAŞKA bir sunumu kabul etti.
     *
     * "Reddedildi" değildir: alıcı bu sunuma bakıp hayır demedi, başkasını
     * tercih etti. "Süresi doldu" da değildir: alıcı yanıt verdi. Ayrı bir
     * durum olmasının sebebi satıcıya doğru gerekçeyi gösterebilmek.
     */
    | "kapandi";
  /** Sunumun gönderildiği an (ISO). Yanıt süresi buradan işler. */
  olusturuldu?: string;
};

/**
 * Alıcının sunuma yanıt verme süresi. Satıcı ürününü süresiz bekletemez:
 * bu süre içinde kabul ya da ret gelmezse sunum kendiliğinden düşer ve
 * satıcı aynı talebe yeniden sunum yapabilir.
 */
/**
 * Bir talebin taşıyabileceği en fazla AÇIK sunum sayısı.
 * Liste okunmaz hale gelmesin; kural depoda uygulanır (`sunumEkle`).
 */
export const MAX_ACIK_SUNUM = 50;

export const SUNUM_YANIT_SURESI_MS = 2 * 24 * 60 * 60 * 1000;

/** Yanıt süresi dolmuş, hâlâ beklemede duran sunum mu? */
export function sunumSuresiDolduMu(
  s: Pick<GelenSunum, "sonuc" | "olusturuldu">,
  simdi = Date.now(),
): boolean {
  if ((s.sonuc ?? "beklemede") !== "beklemede") return false;
  if (!s.olusturuldu) return false;
  const t = new Date(s.olusturuldu).getTime();
  return Number.isFinite(t) && simdi - t >= SUNUM_YANIT_SURESI_MS;
}

/** Alıcının yanıtı için kalan süre (ms). Süresi dolmuşsa 0. */
export function sunumYanitKalanMs(
  s: Pick<GelenSunum, "sonuc" | "olusturuldu">,
  simdi = Date.now(),
): number {
  if (!s.olusturuldu || (s.sonuc ?? "beklemede") !== "beklemede") return 0;
  const t = new Date(s.olusturuldu).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t + SUNUM_YANIT_SURESI_MS - simdi);
}

/** Sonuçlanmamış (yani yeni sunumu engelleyen) sunum mu? */
export function sunumAcikMi(
  s: Pick<GelenSunum, "sonuc" | "olusturuldu">,
  simdi = Date.now(),
): boolean {
  const sonuc = s.sonuc ?? "beklemede";
  // Ret, iptal ve süre aşımı yolu açar: üçünde de süren bir pazarlık yok.
  if (
    sonuc === "red" ||
    sonuc === "iptal" ||
    sonuc === "suresi-doldu" ||
    sonuc === "arsiv" ||
    sonuc === "kapandi"
  )
    return false;
  return !sunumSuresiDolduMu(s, simdi);
}

// NOT: burada `gelenSunumlar` diye boş bir dizi vardı; hiçbir dosya onu
// içe aktarmıyordu ama bileşenlerdeki aynı adlı yerel değişkenlerle
// karışıp aramalarda sahte eşleşme üretiyordu. Sunumların kaynağı depodur
// (bkz. lib/veri.ts → gelenSunumlarGetir).

