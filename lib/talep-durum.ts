import type { Talep } from "./data";

// ── Talep yaşam döngüsü ───────────────────────────────────────────────
// Bir sunum KABUL edildiği anda talep kapanır: alıcı aradığını bulmuştur,
// artık yeni sunum alınmaz. Ret talebi kapatmaz — alıcı aramaya devam
// eder ve satıcı aynı talebe yeniden sunum yapabilir. Kapanan talep 12 saat
// daha açık kalır — o sırada sohbete girenler ilan bağlamını görebilsin
// diye — sonra herkese açık listelerden ve detay sayfasından kalkar.
//
// Kalkması silinmesi değildir: talep sahibinin profilinde ve o talebe
// sunum yapmış satıcıların "Sunumlarım" listesinde durmaya devam eder.

/**
 * Kapanan talebin herkese açık kaldığı süre. Kart bu süre boyunca
 * listelerde durur ama tıklanamaz: satış bitmiştir, detay açılmaz.
 */
export const GIZLENME_SURESI_MS = 12 * 60 * 60 * 1000;

/** Bir talebin yayında kalma süresi (gün). Formda da bu yazılıdır. */
export const YAYIN_SURESI_GUN = 30;
const GUN_MS = 24 * 60 * 60 * 1000;

/**
 * Talebin yayın süresi doldu mu?
 * Damgası olmayan eski kayıtlarda `eklendi` (kaç gün önce) alanına düşülür.
 */
export function talepSuresiDolduMu(talep: Talep, simdi = Date.now()): boolean {
  const sure = (talep.gun || YAYIN_SURESI_GUN) * GUN_MS;
  if (talep.olusturuldu) {
    const baslangic = new Date(talep.olusturuldu).getTime();
    if (Number.isFinite(baslangic)) return simdi - baslangic >= sure;
  }
  return (talep.eklendi ?? 0) >= (talep.gun || YAYIN_SURESI_GUN);
}

/**
 * Süre bitimine kalan gün — 0 ise süre dolmuş demektir.
 *
 * DONDURULMUŞ talepte sayaç DURUR: dondurma bir duraklatmadır, dondurulan
 * gün saklanır (`dondurmaKalanGun`) ve yayına dönünce oradan devam eder.
 * Bu fonksiyon bunu bilmiyordu ve donmuş ilanın süresi ekranda erimeye
 * devam ediyordu: 25 gün kalmışken donduran kullanıcı bir ay sonra
 * "0 gün kaldı" görüyordu.
 *
 * Yan etki olarak çifte dondurma da düzelir: `talepYayinDurumu` dondururken
 * bu fonksiyonu çağırıp değeri saklıyor, dolayısıyla ikinci kez dondurmak
 * eskiden kalan süreyi eritiyordu.
 */
export function kalanGun(talep: Talep, simdi = Date.now()): number {
  if (talepDonduruldduMu(talep))
    return Math.max(0, talep.dondurmaKalanGun ?? YAYIN_SURESI_GUN);

  const sure = (talep.gun || YAYIN_SURESI_GUN) * GUN_MS;
  const baslangic = talep.olusturuldu
    ? new Date(talep.olusturuldu).getTime()
    : simdi - (talep.eklendi ?? 0) * GUN_MS;
  return Math.max(0, Math.ceil((baslangic + sure - simdi) / GUN_MS));
}

/**
 * Talep kaç gün önce yayına girdi? Sıralama ve "ilan tarihi" bundan okur.
 *
 * ESKİDEN `Talep.eklendi` ALANI OKUNUYORDU ve o alan yazılırken HER ZAMAN
 * `0` konuyor, bir daha hiç güncellenmiyordu. Üç şey birden sessizce
 * bozuktu:
 *
 *   • İlan detayı ve sunum ekranındaki "ilan tarihi" HER ZAMAN bugünü
 *     gösteriyordu — üç gün önce açılmış ilan da bugün açılmış görünüyordu,
 *   • Keşfet'teki "En yeni" / "En eski" sıralaması hiçbir şey yapmıyordu
 *     (her kaydın değeri aynı: 0),
 *   • "Sunumlarım" kartındaki tarih hep "Bugün" yazıyordu.
 *
 * Gerçek kaynak `olusturuldu` (ISO) ve zaten kayıtta duruyor. `eklendi`
 * artık türetilmiş bir SUNUM alanıdır: damgası olmayan eski kayıtlarda
 * yedek olarak okunur, yenilerinde hiç kullanılmaz.
 */
export function gecenGun(talep: Talep, simdi = Date.now()): number {
  if (talep.olusturuldu) {
    const basla = new Date(talep.olusturuldu).getTime();
    if (Number.isFinite(basla))
      return Math.max(0, Math.floor((simdi - basla) / GUN_MS));
  }
  return Math.max(0, talep.eklendi ?? 0);
}

/**
 * Yayına giriş anı — sıralama için. Gün'e yuvarlanmış `gecenGun` ile
 * sıralamak aynı güne düşen ilanları ayıramazdı; ham damga kullanılır.
 * (Sohbet listesindeki `sonHareket` ile aynı gerekçe.)
 */
export function yayinZamani(talep: Talep, simdi = Date.now()): number {
  if (talep.olusturuldu) {
    const basla = new Date(talep.olusturuldu).getTime();
    if (Number.isFinite(basla)) return basla;
  }
  return simdi - (talep.eklendi ?? 0) * GUN_MS;
}

/** Keşfet'teki sıralama seçenekleri. */
export type TalepSirasi = "yeni" | "eski" | "artan" | "azalan" | "sunum";

/**
 * Talepleri seçilen ölçüte göre sıralar — SAF fonksiyon, girdiyi bozmaz.
 *
 * Karşılaştırma Keşfet bileşeninin içine gömülüydü; oradan test etmenin
 * yolu yoktu ve tarih sıralaması uzun süre sessizce bozuk kaldı (`eklendi`
 * her kayıtta 0 olduğu için "En yeni" ile "En eski" aynı sonucu
 * veriyordu). Ayrı bir fonksiyon olması bunu ölçülebilir kılar.
 */
export function talepleriSirala<T extends Talep>(
  talepler: readonly T[],
  sira: TalepSirasi,
  simdi = Date.now(),
): T[] {
  return [...talepler].sort((a, b) => {
    switch (sira) {
      case "eski":
        return yayinZamani(a, simdi) - yayinZamani(b, simdi);
      case "artan":
        return a.fiyatNum - b.fiyatNum;
      case "azalan":
        return b.fiyatNum - a.fiyatNum;
      case "sunum":
        return b.sunum - a.sunum;
      default:
        return yayinZamani(b, simdi) - yayinZamani(a, simdi);
    }
  });
}

/** Talep dondurulmuş mu — alıcı yayından kendi eliyle çekmiş. */
export function talepDonduruldduMu(talep: Talep): boolean {
  return !!talep.donduruldu;
}

/**
 * Sahibinin tek dokunuşla yeniden yayına alabileceği durumda mı?
 * Süre bitimi ve dondurma geri alınabilir; kabul edilerek kapanan talep
 * (anlaşma yapılmış) buradan yeniden açılmaz.
 */
export function yenidenYayinlanabilirMi(
  talep: Talep,
  simdi = Date.now(),
): boolean {
  // Silinen talep geri açılmaz; yalnızca kayıt olarak durur.
  if (talep.silindi) return false;
  // Kapanmış talep de yeniden açılabilir; tek engel süren bir sipariştir
  // ve onu çağıran taraf `surecDevam` ile bildirir (bkz. IlanDetay).
  return (
    !!talep.kapandi ||
    talepDonduruldduMu(talep) ||
    talepSuresiDolduMu(talep, simdi)
  );
}

/** Talep yeni sunum alıyor mu? */
export function talepAcikMi(talep: Talep, simdi = Date.now()): boolean {
  return (
    !talep.silindi &&
    !talep.kapandi &&
    !talepDonduruldduMu(talep) &&
    !talepSuresiDolduMu(talep, simdi)
  );
}

/**
 * Herkese açık listelerden kalkmış mı?
 *   • Kapanan talep 12 saat daha görünür, sonra kalkar.
 *   • Süresi dolan ve dondurulan talep hemen kalkar.
 * Kalkması silinmesi değildir: sahibinin "Taleplerim" sekmesinde durur ve
 * tek düğmeyle yeniden yayına alınabilir.
 */
export function talepGizliMi(talep: Talep, simdi = Date.now()): boolean {
  // Sahibi sildiyse herkese açık listelerden hemen kalkar.
  if (talep.silindi) return true;
  if (talepDonduruldduMu(talep)) return true;
  if (!talep.kapandi) return talepSuresiDolduMu(talep, simdi);
  return simdi - new Date(talep.kapandi).getTime() >= GIZLENME_SURESI_MS;
}

/** Herkese açık listelerde görünecek talepler. */
export function acikTalepler(talepler: Talep[], simdi = Date.now()): Talep[] {
  return talepler.filter((t) => !talepGizliMi(t, simdi));
}

/**
 * Gizlenmiş talebi yine de görebilecek kişi mi?
 * Talebi açan kişi ile o talebe sunum göndermiş satıcılar görebilir;
 * ikisinin de kaydı sürüyor, bağlantıları kırılmamalı.
 */
export function talebiGorebilir(
  talep: Talep,
  kullanici: string,
  sunumYapanlar: string[],
  simdi = Date.now(),
): boolean {
  if (!talepGizliMi(talep, simdi)) return true;
  return talep.sahibi === kullanici || sunumYapanlar.includes(kullanici);
}

/** Kapanma sonrası kalan görünürlük süresi (saat) — bilgilendirme için. */
export function gizlenmeyeKalanSaat(
  talep: Talep,
  simdi = Date.now(),
): number | undefined {
  if (!talep.kapandi) return undefined;
  const kalan =
    new Date(talep.kapandi).getTime() + GIZLENME_SURESI_MS - simdi;
  return kalan > 0 ? Math.ceil(kalan / 3_600_000) : 0;
}

/**
 * Alıcı, aradığı ürünün muadilini (eşdeğerini) de değerlendiriyor mu?
 *
 * Tercih ilan kartında ETİKET olarak gösterilmiyor: kart zaten dolu ve bu
 * bilgi satıcıyı yalnızca ARARKEN ilgilendiriyor. Keşfet'teki "Muadil
 * kabul" filtresi ve `?muadil=1` bağlantısı bu yordamdan geçer.
 *
 * Alan eklenmeden önce açılmış taleplerde `muadilKabul` tanımsızdır; bu
 * durum "kabul etmiyor" sayılır — filtre işaretlendiğinde alıcının böyle
 * bir söz vermediği talepler listelenmemelidir.
 */
export function muadilKabulEder(talep: Talep): boolean {
  return talep.muadilKabul === true;
}
