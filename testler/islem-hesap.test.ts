import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toplamHarcama,
  satisOzeti,
  bakiyedekiTutar,
  paraDurumlari,
  komisyon,
  maliHareketler,
  KOMISYON_ORANI,
} from "../lib/islemler.ts";
import type { Islem } from "../lib/islemler.ts";
import { cekilebilirTutar } from "../lib/aktarim.ts";
import type { AktarimTalebi } from "../lib/aktarim.ts";

function islem(ek: Partial<Islem> = {}): Islem {
  return {
    id: "i1",
    ilanBaslik: "Saat",
    kategori: "Saat",
    alici: "alici",
    satici: "satici",
    tarih: "20.08.2026",
    tarihIso: "2026-08-20T10:00:00.000Z",
    fiyat: 10000,
    talep: {
      fiyat: 10000, durum: "-", defo: "-", marka: "-", model: "-", yil: "-",
      renk: "-", konum: "-", acilis: "-", aciklama: "", sunumSayisi: 1,
    },
    sunum: {
      fiyat: 10000, durum: "-", defo: "-", marka: "-", model: "-", yil: "-",
      renk: "-", urun: "Saat", kutu: true, fatura: true,
      kargo: "Kargo alıcıya ait", teslim: "-", not: "",
    },
    ...ek,
  };
}

test("alıcının harcaması yalnızca ürün bedelidir", () => {
  // Kargo Bulbana'dan geçmiyor; muhasebeye girmemeli.
  assert.equal(toplamHarcama([islem()], "alici"), 10000);
});

test("komisyon ürün bedeli üzerinden hesaplanır", () => {
  assert.equal(komisyon(islem()), 10000 * KOMISYON_ORANI);
  const { brut, komisyon: k, net } = satisOzeti([islem()], "satici");
  assert.equal(brut, 10000);
  assert.equal(k, 400);
  assert.equal(net, 9600);
});

test("bakiye net satış gelirini gösterir", () => {
  assert.equal(bakiyedekiTutar([islem()], "satici"), 9600);
});

test("bakiye aktarımdan haberdar değildir — düşme tek yerde yapılır", () => {
  // `bakiyedekiTutar` satıştan kazanılan TOPLAM net geliri verir. Aktarılan
  // para burada değil, `cekilebilirTutar` içinde bir kez düşülür. İkisinde
  // birden düşmek aynı parayı iki kez saymak olurdu.
  assert.equal(bakiyedekiTutar([islem()], "satici"), 9600);
});

test("kısmi aktarım sonrası kalan bakiyenin tamamı çekilebilir", () => {
  // GERİLEME TESTİ. Eskiden iki mekanizma aynı parayı birden düşüyordu:
  // aktarım tamamlanınca işlem kaydı "IBAN'a aktarıldı" damgalanıp
  // bakiyeden eleniyor, aktarım kaydı da çekilebilir tutardan ayrıca
  // çıkarılıyordu. 600 + 500 TL'lik iki satışta 500 TL çekildiğinde
  // gerçekte 600 TL kalıyor ama ekranda 100 TL görünüyordu — 500 TL
  // kalıcı olarak erişilemez hâle geliyordu.
  const satislar = [
    islem({ id: "eski", fiyat: 10000, tarihIso: "2026-08-01T00:00:00.000Z" }),
    islem({ id: "yeni", fiyat: 5000, tarihIso: "2026-08-10T00:00:00.000Z" }),
  ];
  const bakiye = bakiyedekiTutar(satislar, "satici"); // 9600 + 4800
  assert.equal(bakiye, 14400);

  const aktarimlar: AktarimTalebi[] = [
    {
      id: "a1",
      kullanici: "satici",
      tutar: 4800,
      ibanMaske: "TR•••1234",
      durum: "tamamlandi",
      zaman: "2026-08-11T00:00:00.000Z",
    },
  ];
  // 14400 kazanıldı, 4800 çıktı → tam olarak 9600 kalmalı.
  assert.equal(cekilebilirTutar(bakiye, aktarimlar), 9600);
});

test("para etiketi aktarım defterinden türetilir, en eski satıştan başlar", () => {
  const satislar = [
    islem({ id: "eski", fiyat: 10000, tarihIso: "2026-08-01T00:00:00.000Z" }),
    islem({ id: "yeni", fiyat: 5000, tarihIso: "2026-08-10T00:00:00.000Z" }),
  ];
  // En eski satışın neti tam olarak aktarıldı (9600).
  const d = paraDurumlari(satislar, "satici", 9600);
  assert.equal(d.get("eski"), "IBAN'a aktarıldı");
  assert.equal(d.get("yeni"), "Bakiyede");

  // Hiç aktarım yoksa hepsi bakiyededir.
  const yok = paraDurumlari(satislar, "satici", 0);
  assert.equal(yok.get("eski"), "Bakiyede");
  assert.equal(yok.get("yeni"), "Bakiyede");
});

test("tutarın ortasında kesilen satış bakiyede kalır", () => {
  // 9600'lük satıştan yalnızca 5000 aktarıldıysa o satış "aktarıldı"
  // sayılmaz: parasının tamamı çıkmamıştır.
  const d = paraDurumlari([islem({ id: "tek" })], "satici", 5000);
  assert.equal(d.get("tek"), "Bakiyede");
});

test("mali hareketlerde alımın kesintisi yoktur", () => {
  const [h] = maliHareketler([islem()], "alici");
  assert.equal(h.tur, "alim");
  assert.equal(h.tutar, -10000);
  assert.equal(h.kesinti, 0);
  assert.equal(h.kesintiEtiketi, "—");
});

test("mali hareketlerde satışın kesintisi komisyondur", () => {
  const [h] = maliHareketler([islem()], "satici");
  assert.equal(h.tur, "satis");
  assert.equal(h.tutar, 9600);
  assert.equal(h.kesinti, 400);
  assert.equal(h.kesintiEtiketi, "komisyon");
});
