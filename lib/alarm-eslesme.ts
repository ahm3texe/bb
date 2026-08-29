// ── Talep alarmı eşleşmesi ────────────────────────────────────────────
// Alarm formundaki kriterler ekranda etiket olarak da tutuluyor ("Elektronik",
// "defosuz"…) ama eşleşme metin karşılaştırmasıyla yapılamaz: burada aynı
// kriterlerin yapısal hali saklanır ve yeni talep düştüğünde bu filtre
// çalıştırılır.

import type { Talep } from "./data";
import { talepDurumlari } from "./data";
import { karsilastirmaAnahtari } from "./metin";

export type AlarmKanallari = { uygulama: boolean; eposta: boolean };

export type AlarmKonum = { il: string; ilce: string };

export type AlarmFiltre = {
  /** Alarm tek kategoriyi kapsar. */
  kategori: string;
  tur: string;
  cesit: string;
  marka: string;
  model: string;
  yil: string;
  renk: string;
  /** Başlık ve açıklamada aranan kelimeler; biri geçse yeter. */
  kelimeler: string[];
  /** Boş dizi = "Hepsi". */
  durumlar: string[];
  /** Boş dizi = "Farketmez"; "defosuz" / "defolu". */
  defolar: string[];
  /** null = farketmez. */
  muadil: boolean | null;
  minFiyat: number | null;
  maxFiyat: number | null;
  /** Boş dizi = tüm Türkiye; ilce boşsa ilin tamamı. */
  konumlar: AlarmKonum[];
};

/**
 * Bir hesabın kurabileceği en fazla alarm sayısı.
 *
 * Sınır ŞART: her yeni talep yayına girdiğinde TÜM alarmlar taranıyor
 * (`alarmlariTetikle`). Sınırsız alarm hem depoyu şişirir hem de her ilan
 * açılışını yavaşlatır. Kart ve adres tarafında benzer tavanlar zaten var;
 * alarmda atlanmıştı.
 */
export const EN_FAZLA_ALARM = 20;

export const BOS_FILTRE: AlarmFiltre = {
  kategori: "",
  tur: "",
  cesit: "",
  marka: "",
  model: "",
  yil: "",
  renk: "",
  kelimeler: [],
  durumlar: [],
  defolar: [],
  muadil: null,
  minFiyat: null,
  maxFiyat: null,
  konumlar: [],
};

// Karşılaştırma `karsilastirmaAnahtari` ile yapılır. Eskiden burada
// `toLocaleLowerCase("tr")` vardı ve Türkçe I/İ tuzağı yüzünden "IPHONE"
// alarmı "iPhone" talebini YAKALAMIYORDU — alarm sessizce hiç ateşlenmiyordu
// (bkz. lib/metin.ts).
const kucuk = karsilastirmaAnahtari;

/** İki serbest metin alanı aynı şeyi mi gösteriyor? Boş kriter her şeye uyar. */
function alanUyar(kriter: string, deger: string | undefined): boolean {
  if (!kriter.trim()) return true;
  return kucuk(deger ?? "") === kucuk(kriter);
}

/**
 * Talep, alarmın filtresine uyuyor mu?
 *
 * KESİN koşullar (tutmuyorsa bildirim yok): kategori, tür, çeşit, marka,
 * model (giyimde cinsiyet), anahtar kelimeler, muadil, ürün durumu, ürün
 * defosu, konum.
 *
 * ESNEK alanlar (eşleşmeyi engellemez): yıl / beden ve renk. Örneğin M
 * beden işaretlenmiş bir alarm, kesin koşulları tutan bir L beden talebini
 * de sahibine bildirir.
 */
export function talepEslesiyorMu(filtre: AlarmFiltre, talep: Talep): boolean {
  if (filtre.kategori && kucuk(talep.kategori) !== kucuk(filtre.kategori))
    return false;

  if (!alanUyar(filtre.tur, talep.tur)) return false;
  if (!alanUyar(filtre.cesit, talep.cesit)) return false;
  if (!alanUyar(filtre.marka, talep.marka)) return false;
  if (!alanUyar(filtre.model, talep.model)) return false;
  // Yıl/beden ve renk bilerek denetlenmiyor: yakın beden ve farklı renk
  // talepleri de satıcıya ulaşsın diye.

  // Anahtar kelimeler başlık + açıklamada taranır; biri geçerse yeter.
  if (filtre.kelimeler.length) {
    const metin = kucuk(`${talep.baslik} ${talep.aciklama}`);
    if (!filtre.kelimeler.some((k) => metin.includes(kucuk(k)))) return false;
  }

  // Boş liste = "Hepsi"; doluysa talebin durumu işaretlenenlerden biri
  // olmalı. Alıcı "Hepsi" dediyse her durumu kabul ediyor demektir; o talep
  // durum işaretlemiş satıcıya da uyar — yoksa satıcı fırsatı kaçırır.
  if (filtre.durumlar.length) {
    const kabul = talepDurumlari(talep);
    // Boş liste = alıcı "Hepsi" dedi: her durum alarmına uyar.
    if (
      kabul.length > 0 &&
      !kabul.some((td) => filtre.durumlar.some((d) => kucuk(d) === kucuk(td)))
    )
      return false;
  }

  // Defo: alıcı "defolu da olur" dediyse defosuz ürün de ona uyar — bu
  // talep hem "defosuz" hem "defolu" alarmına düşer. Alıcı defosuz
  // istiyorsa yalnızca "defosuz" alarmına düşer.
  if (filtre.defolar.length && talep.defoKabul !== true) {
    if (!filtre.defolar.includes("defosuz")) return false;
  }

  // Muadil: alıcı muadili de kabul ediyorsa orijinal ürün de ona uyar, o
  // yüzden bu talep hem "Evet" hem "Hayır" alarmına düşer. "Evet" alarmı
  // (muadil satan satıcı) yalnızca muadil kabul eden talepleri yakalar.
  if (filtre.muadil === true && talep.muadilKabul !== true) return false;

  if (filtre.minFiyat !== null && talep.fiyatNum < filtre.minFiyat) return false;
  if (filtre.maxFiyat !== null && talep.fiyatNum > filtre.maxFiyat) return false;

  if (filtre.konumlar.length) {
    const uyan = filtre.konumlar.some(
      (k) =>
        kucuk(k.il) === kucuk(talep.il) &&
        (!k.ilce || kucuk(k.ilce) === kucuk(talep.ilce)),
    );
    if (!uyan) return false;
  }

  return true;
}
