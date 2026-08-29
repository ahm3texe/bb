// ── Açık ve korumalı yollar ───────────────────────────────────────────
// Oturumu olmayan ziyaretçi vitrini görebilir, hesabı göremez.
//
// Neden liste "açık" tarafta tutuluyor: yeni eklenen bir sayfa hiçbir şey
// yapılmazsa KORUMALI olur. Tersi olsaydı (korumalı liste tutulsaydı),
// listeye eklenmeyi unutulan her yeni hesap sayfası sessizce herkese açık
// kalırdı — güvenlik listelerinin klasik hatası budur.

/** Tam eşleşen açık yollar. */
const TAM: ReadonlySet<string> = new Set([
  "/",
  "/kesfet",
  // Bilgi ve sözleşme sayfaları — hesapla ilgisi yok.
  "/nasil-calisir",
  "/hakkimizda",
  "/yardim",
  "/guvenli-alisveris",
  "/ilan-kurallari",
  "/sozlesmeler",
  "/site-haritasi",
  // Giriş akışının kendisi açık olmak ZORUNDA, yoksa yönlendirme döngüsü olur.
  "/giris",
  "/sifre-sifirlama",
]);

/**
 * Önek eşleşen açık yollar. Sondaki eğik çizgi şart:
 * `/ilan/` yalnızca ilan detayını açar, `/ilan-ac` ve `/ilan-yonetimi`
 * korumalı kalır. Aynı şekilde `/profil/deniz` ziyaretçi profilidir ama
 * `/profil` (tam eşleşme) kişinin kendi hesap sayfasıdır.
 */
const ONEK: readonly string[] = ["/ilan/", "/profil/"];

/**
 * Uygulamanın hiç karışmaması gereken yollar: derleyici çıktısı, yüklenen
 * dosyalar ve arama motorlarının okuduğu üstveri. Bunlar "açık" değil,
 * kapsam dışıdır.
 */
const KAPSAM_DISI: readonly string[] = [
  "/_next/",
  "/yuklemeler/",
  "/api/",
];

const KAPSAM_DISI_TAM: ReadonlySet<string> = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
]);

/** Sondaki eğik çizgiyi atar; `/kesfet/` ile `/kesfet` aynı sayfadır. */
function sadelestir(yol: string): string {
  if (yol.length > 1 && yol.endsWith("/")) return yol.slice(0, -1);
  return yol;
}

/** Bu yol giriş kapısının hiç ilgilenmediği bir yol mu? */
export function kapsamDisiMi(yol: string): boolean {
  if (KAPSAM_DISI_TAM.has(yol)) return true;
  return KAPSAM_DISI.some((o) => yol.startsWith(o));
}

/**
 * Oturumu olmayan biri bu sayfayı görebilir mi?
 *
 * Kapsam dışı yollar da `true` döner: giriş kapısı onlara dokunmaz.
 */
export function yolAcikMi(yol: string): boolean {
  if (kapsamDisiMi(yol)) return true;
  const sade = sadelestir(yol);
  if (TAM.has(sade)) return true;
  // Önek listesinde ham yola bakılır: `/profil` sadeleşmiş hâliyle önek
  // kuralına takılmamalı, yalnızca `/profil/<kullanıcı>` açık olmalı.
  return ONEK.some((o) => yol.startsWith(o) && yol.length > o.length);
}
