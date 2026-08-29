// ── Yüklenen görsel yolları ───────────────────────────────────────────
// `/api/yukle` diske yazdığı dosya için `/yuklemeler/<ad>` biçiminde bir yol
// döndürür. Talep ve sunum uçları bu yolları gövdeden geri alıyor — ama
// gövdeden gelen her şey gibi bunlar da uydurulabilir.
//
// Doğrulama yapılmadığında kayda keyfi metin girebiliyordu: dış alan adı,
// `javascript:` başlayan bir adres ya da `../` içeren bir yol. Bu değerler
// doğrudan `<Image src>` içine gidiyor. Kayda yalnızca BİZİM ürettiğimiz
// biçime uyan yollar girmeli.

/** `/api/yukle` çıktısının biçimi: /yuklemeler/<dosya-adı>.<uzantı> */
const YUKLEME_YOLU = /^\/yuklemeler\/[A-Za-z0-9._-]+$/;

/** Tek bir yol bizim ürettiğimiz biçime uyuyor mu? */
export function gorselYoluGecerliMi(yol: unknown): yol is string {
  if (typeof yol !== "string") return false;
  // `..` bileşeni regex'e takılmaz (nokta izinli); ayrıca elenir.
  if (yol.includes("..")) return false;
  return YUKLEME_YOLU.test(yol);
}

/**
 * Gövdeden gelen görsel listesini süzer: yalnızca geçerli yükleme yolları,
 * en fazla `enFazla` tane, tekrarsız.
 */
export function gorselleriSuz(ham: unknown, enFazla: number): string[] {
  if (!Array.isArray(ham)) return [];
  const gecerli = ham.filter(gorselYoluGecerliMi);
  return [...new Set(gecerli)].slice(0, enFazla);
}

// ── Görsel / video ayrımı ─────────────────────────────────────────────
// Yüklemeler tek bir `gorseller` dizisinde taşınıyor: fotoğraflar ve
// videolar aynı listede. Ayrımı yapmadan kullanmak iki şeyi bozuyordu:
//
//   • Galeriler video yolunu `<Image>` içine veriyordu — Next görsel
//     iyileştiricisi mp4'ü açamaz, kart ve detay sayfasında kırık kapak
//     çıkıyordu.
//   • Video hiçbir yerde OYNATILMIYORDU: satıcının kanıt videosu yükleniyor
//     ama alıcı yalnızca "temsili" yazan sahte bir oynatıcı görüyordu.
//
// Tür uzantıdan anlaşılır; `/api/yukle` uzantıyı içerikten doğruladığı
// beyaz listeden yazar (bkz. lib/dosya-imza.ts), yani uzantı güvenilirdir.

const VIDEO_UZANTI = /\.(mp4|webm|mov)$/i;

/** Yol bir video mu? */
export function videoYoluMu(yol: string): boolean {
  return VIDEO_UZANTI.test(yol);
}

/** Listedeki yalnızca fotoğraflar — galerilere bu verilir. */
export function sadeceFotograflar(yollar: readonly string[] = []): string[] {
  return yollar.filter((y) => !videoYoluMu(y));
}

/** Listedeki yalnızca videolar — oynatıcıya bu verilir. */
export function sadeceVideolar(yollar: readonly string[] = []): string[] {
  return yollar.filter(videoYoluMu);
}

/**
 * Verilen yollardan, `kullanimda` kümesinde geçmeyenleri döndürür —
 * yani artık hiçbir kaydın işaret etmediklerini.
 *
 * Silme kararının saf çekirdeği. `lib/depo.ts` kümeyi güncel kayıtlardan
 * kurar; burası yalnızca farkı alır, böylece kural test edilebilir olur.
 *
 * NEDEN: dosya silme, yolun başka bir kayıtta geçip geçmediğine bakmadan
 * yapılıyordu. Yükleme kaydı "kim yükledi" bilgisini tutmadığı ve uçlar
 * gövdeden gelen yolları (biçimi doğruysa) kabul ettiği için, kötü niyetli
 * bir kullanıcı başkasının görsel yolunu kendi ilanına yazıp o ilanı
 * silerek HEDEFİN görselini diskten sildirebiliyordu.
 */
export function kullanimDisiYollar(
  yollar: readonly string[],
  kullanimda: ReadonlySet<string>,
): string[] {
  return [...new Set(yollar)].filter((y) => !kullanimda.has(y));
}
