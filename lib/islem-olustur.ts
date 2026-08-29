// ── Alışverişten işlem kaydı ──────────────────────────────────────────
// Alıcı ürünü onayladığı anda sipariş kapanır ve tek bir "işlem" kaydına
// dönüşür. Aldıklarım, Sattıklarım, Cüzdan ve Mali Tablom hep bu kaydı
// okur; böylece iki taraf aynı gerçeği görür.

import type { Anlasma } from "./anlasma";
import type { GelenSunum } from "./gelen-sunumlar";
import type { Talep } from "./data";
import type { Islem, IslemTalep, IslemSunum } from "./islemler";
import { talepDurumlari } from "./data";

export function islemOlustur(
  anlasma: Anlasma,
  sunum: GelenSunum,
  talep: Talep | undefined,
  /**
   * İşlemin tarihi. Normalde alıcının onay anıdır; itiraz satıcı lehine
   * kapandığında ise KARAR anıdır — alıcının itiraz ettiği gün değil.
   */
  zamanIso?: string,
): Islem {
  const zaman = zamanIso ?? anlasma.onayZamani ?? new Date().toISOString();
  const tarih = new Date(zaman);

  const talepBilgi: IslemTalep = {
    fiyat: talep?.fiyatNum ?? anlasma.tutar,
    durum: talep ? talepDurumlari(talep).join(" / ") || "Hepsi" : "—",
    // Yanıtsız talep "Defosuz olmalı" diye kaydediliyordu; işlem kaydı
    // kalıcıdır, uydurulan şart yıllar sonra da orada durur.
    defo:
      talep?.defoKabul === undefined
        ? "—"
        : talep.defoKabul
          ? "Defolu olabilir"
          : "Defosuz olmalı",
    marka: talep?.marka ?? "—",
    model: talep?.model ?? "—",
    yil: talep?.yil ?? "—",
    renk: talep?.renk ?? "—",
    konum: talep ? `${talep.il}/${talep.ilce}` : "—",
    acilis: talep?.olusturuldu
      ? new Date(talep.olusturuldu).toLocaleDateString("tr-TR")
      : "—",
    aciklama: talep?.aciklama ?? "",
    sunumSayisi: talep?.sunum ?? 0,
  };

  const sunumBilgi: IslemSunum = {
    fiyat: anlasma.tutar,
    durum: sunum.durum ?? "—",
    defo: sunum.defoVar ? "Defolu" : "Defosuz",
    marka: sunum.marka ?? "—",
    model: sunum.model ?? "—",
    yil: sunum.yil ?? "—",
    renk: sunum.renk ?? "—",
    urun: sunum.urun ?? sunum.baslik,
    kutu: !!sunum.kutu,
    fatura: !!sunum.fatura,
    kargo: sunum.kargo ?? "—",
    teslim: sunum.teslim ?? "—",
    not: sunum.aciklama ?? "",
  };

  return {
    // Sipariş başına tek kayıt: aynı sunum ikinci kez işleme dönüşemez.
    id: anlasma.sunumId,
    ilanBaslik: talep?.baslik ?? sunum.baslik,
    kategori: talep?.kategori ?? "—",
    alici: anlasma.alici,
    satici: anlasma.satici,
    tarih: tarih.toLocaleDateString("tr-TR"),
    tarihIso: zaman,
    fiyat: anlasma.tutar,
    // Kargo bedeli kayda girmez: taraflar kendi aralarında hallediyor
    // (bkz. lib/islemler.ts → Islem). Sunumdaki "kime ait" etiketi
    // `sunumBilgi.kargo` içinde bilgi olarak duruyor.
    // Paranın nerede olduğu KAYDA YAZILMAZ; aktarım defterinden türetilir
    // (bkz. lib/islemler.ts → paraDurumlari).
    talep: talepBilgi,
    sunum: sunumBilgi,
  };
}
