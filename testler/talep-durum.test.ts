import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kalanGun,
  talepAcikMi,
  talepGizliMi,
  talebiGorebilir,
  yenidenYayinlanabilirMi,
  YAYIN_SURESI_GUN,
  GIZLENME_SURESI_MS,
  gecenGun,
  yayinZamani,
  talepleriSirala,
} from "../lib/talep-durum.ts";
import type { Talep } from "../lib/data.ts";
import { ilanTarihi } from "../lib/data.ts";

const GUN = 24 * 3600_000;
const SIMDI = Date.parse("2026-08-21T12:00:00.000Z");

function talep(ek: Partial<Talep> = {}): Talep {
  return {
    id: "t1", baslik: "Saat", aciklama: "x", kategori: "Saat", fiyatNum: 1000,
    marka: "X", il: "Ankara", ilce: "Merkez", durum: "Hepsi", sunum: 0,
    gun: YAYIN_SURESI_GUN, eklendi: 0, sahibi: "alici", gorseller: [],
    olusturuldu: new Date(SIMDI).toISOString(),
    ...ek,
  } as Talep;
}

test("yeni talep 30 gün taşır", () => {
  assert.equal(kalanGun(talep(), SIMDI), YAYIN_SURESI_GUN);
});

test("süre normal talepte akar", () => {
  const t = talep({ olusturuldu: new Date(SIMDI - 10 * GUN).toISOString() });
  assert.equal(kalanGun(t, SIMDI), 20);
});

test("DONDURULMUŞ talepte sayaç durur", () => {
  // 25 gün kalmışken donduruldu, üstünden 15 gün geçti: yine 25 kalmalı.
  const t = talep({
    olusturuldu: new Date(SIMDI - 20 * GUN).toISOString(),
    donduruldu: new Date(SIMDI - 15 * GUN).toISOString(),
    dondurmaKalanGun: 25,
  });
  assert.equal(kalanGun(t, SIMDI), 25);
});

test("çifte dondurma kalan süreyi eritmez", () => {
  // İkinci dondurmada saklanacak değer, birincideki değerle aynı olmalı.
  const t = talep({
    olusturuldu: new Date(SIMDI - 20 * GUN).toISOString(),
    donduruldu: new Date(SIMDI - 15 * GUN).toISOString(),
    dondurmaKalanGun: 25,
  });
  assert.equal(kalanGun(t, SIMDI), 25);
});

test("dondurulmuş talep yeni sunum almaz ama geri açılabilir", () => {
  const t = talep({ donduruldu: new Date(SIMDI).toISOString(), dondurmaKalanGun: 10 });
  assert.equal(talepAcikMi(t, SIMDI), false);
  assert.equal(talepGizliMi(t, SIMDI), true);
  assert.equal(yenidenYayinlanabilirMi(t, SIMDI), true);
});

test("silinen talep geri açılamaz", () => {
  const t = talep({ silindi: new Date(SIMDI).toISOString() });
  assert.equal(yenidenYayinlanabilirMi(t, SIMDI), false);
  assert.equal(talepGizliMi(t, SIMDI), true);
});

test("kapanan talep 12 saat daha görünür", () => {
  const yeni = talep({ kapandi: new Date(SIMDI - 6 * 3600_000).toISOString() });
  const eski = talep({
    kapandi: new Date(SIMDI - GIZLENME_SURESI_MS - 1000).toISOString(),
  });
  assert.equal(talepGizliMi(yeni, SIMDI), false);
  assert.equal(talepGizliMi(eski, SIMDI), true);
});

test("gizlenen talebi sahibi ve sunum yapan görebilir", () => {
  const t = talep({ donduruldu: new Date(SIMDI).toISOString() });
  assert.equal(talebiGorebilir(t, "alici", [], SIMDI), true);
  assert.equal(talebiGorebilir(t, "satici", ["satici"], SIMDI), true);
  assert.equal(talebiGorebilir(t, "yabanci", ["satici"], SIMDI), false);
});

test("süresi dolan talep kapanır ve geri açılabilir", () => {
  const t = talep({ olusturuldu: new Date(SIMDI - 31 * GUN).toISOString() });
  assert.equal(kalanGun(t, SIMDI), 0);
  assert.equal(talepAcikMi(t, SIMDI), false);
  assert.equal(yenidenYayinlanabilirMi(t, SIMDI), true);
});

// ── Yayın tarihi türetimi ─────────────────────────────────────────────
// `eklendi` alanı yazılırken her zaman 0 konuyor ve hiç güncellenmiyordu:
// ilan tarihi hep bugünü gösteriyor, "En yeni/En eski" sıralaması hiçbir
// şey yapmıyordu. İkisi de artık `olusturuldu` damgasından türer.

test("gecenGun damgadan hesaplanır, eklendi=0 olsa bile", () => {
  const t = talep({
    eklendi: 0,
    olusturuldu: new Date(Date.now() - 3 * 86400000).toISOString(),
  });
  assert.equal(gecenGun(t), 3);
});

test("damga yoksa eklendi alanına düşülür", () => {
  const t = talep({ eklendi: 5, olusturuldu: undefined });
  assert.equal(gecenGun(t), 5);
});

test("aynı gün açılan iki ilan damgayla ayrışır", () => {
  const eski = talep({
    id: "eski",
    eklendi: 0,
    olusturuldu: new Date(Date.now() - 5 * 3600_000).toISOString(),
  });
  const yeni = talep({
    id: "yeni",
    eklendi: 0,
    olusturuldu: new Date(Date.now() - 1 * 3600_000).toISOString(),
  });
  // İkisi de "bugün" (gecenGun = 0) ama sıralama yine de doğru olmalı.
  assert.equal(gecenGun(eski), 0);
  assert.equal(gecenGun(yeni), 0);
  assert.ok(yayinZamani(yeni) > yayinZamani(eski));
});

test("ilan tarihi damgadan birebir okunur, gün kaydırmaz", () => {
  // 20 Ağustos'ta açılan ilan, 24 Ağustos'ta bakıldığında 20 Ağustos
  // yazmalı. Gün sayısına çevirip geri tarihe dönmek 21 Ağustos veriyordu.
  const t = talep({ eklendi: 0, olusturuldu: "2026-08-20T08:16:03.920Z" });
  assert.equal(ilanTarihi(t), "20/08/2026");
});

test("damga yoksa ilan tarihi eklendi alanından türer", () => {
  const bugun = new Date();
  bugun.setDate(bugun.getDate() - 2);
  const bekleniyor = `${String(bugun.getDate()).padStart(2, "0")}/${String(
    bugun.getMonth() + 1,
  ).padStart(2, "0")}/${bugun.getFullYear()}`;
  assert.equal(ilanTarihi({ eklendi: 2, olusturuldu: undefined }), bekleniyor);
});

// ── Keşfet sıralaması ─────────────────────────────────────────────────
// "En yeni" ve "En eski" uzun süre AYNI sonucu veriyordu: karşılaştırma
// `eklendi` alanını okuyordu ve o alan her kayıtta 0 yazılıyordu.

const eskiTalep = talep({
  id: "eski",
  fiyatNum: 1000,
  sunum: 5,
  eklendi: 0,
  olusturuldu: "2026-08-20T08:00:00.000Z",
});
const yeniTalep = talep({
  id: "yeni",
  fiyatNum: 9000,
  sunum: 1,
  eklendi: 0,
  olusturuldu: "2026-08-23T19:00:00.000Z",
});

test("en yeni ve en eski TERS sıra verir", () => {
  const liste = [eskiTalep, yeniTalep];
  assert.deepEqual(
    talepleriSirala(liste, "yeni").map((t) => t.id),
    ["yeni", "eski"],
  );
  assert.deepEqual(
    talepleriSirala(liste, "eski").map((t) => t.id),
    ["eski", "yeni"],
  );
});

test("fiyat ve sunum sıralaması", () => {
  const liste = [yeniTalep, eskiTalep];
  assert.deepEqual(
    talepleriSirala(liste, "artan").map((t) => t.id),
    ["eski", "yeni"],
  );
  assert.deepEqual(
    talepleriSirala(liste, "azalan").map((t) => t.id),
    ["yeni", "eski"],
  );
  assert.deepEqual(
    talepleriSirala(liste, "sunum").map((t) => t.id),
    ["eski", "yeni"],
  );
});

test("sıralama girdiyi bozmaz", () => {
  const liste = [yeniTalep, eskiTalep];
  talepleriSirala(liste, "eski");
  assert.deepEqual(liste.map((t) => t.id), ["yeni", "eski"]);
});
