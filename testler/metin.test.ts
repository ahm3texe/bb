import { test } from "node:test";
import assert from "node:assert/strict";
import { tekSatir, cokSatir } from "../lib/metin.ts";

const SIFIR_GENISLIK = "\u200B";
const YON_TERS = "\u202E";
const BOM = "\uFEFF";
const KELIME_BIRLESTIRICI = "\u2060";

test("sıfır genişlikli boşluk uzunluk kontrolünü delemez", () => {
  // Beş görünmez karakter "en az 5 karakter" kuralını geçiyordu ve ilan
  // bomboş görünüyordu.
  const gizli = SIFIR_GENISLIK.repeat(5);
  assert.equal(tekSatir(gizli, 70), "");
  assert.equal(cokSatir(gizli.repeat(10), 500), "");
});

test("yön değiştirici karakterler atılır", () => {
  assert.equal(tekSatir(`Saat ${YON_TERS}muroyıra`, 70), "Saat muroyıra");
});

test("bayt sırası işareti ve kelime birleştirici atılır", () => {
  assert.equal(tekSatir(`${BOM}Saat${KELIME_BIRLESTIRICI}`, 70), "Saat");
});

test("denetim karakterleri atılır", () => {
  assert.equal(tekSatir("Sa\u0000at\u0007", 70), "Saat");
});

test("tek satırlık alanda satır sonu boşluğa iner", () => {
  assert.equal(tekSatir("Saat\n\n\n\narıyorum", 70), "Saat arıyorum");
});

test("tek satırlık alanda boşluk dizileri tekleşir", () => {
  assert.equal(tekSatir("  Saat     arıyorum  ", 70), "Saat arıyorum");
});

test("çok satırlık alanda paragraflar korunur", () => {
  assert.equal(
    cokSatir("Birinci satır\n\nİkinci satır", 500),
    "Birinci satır\n\nİkinci satır",
  );
});

test("çok satırlık alanda aşırı boş satır ikiye iner", () => {
  assert.equal(cokSatir("A\n\n\n\n\n\nB", 500), "A\n\nB");
});

test("uzunluk sınırı uygulanır", () => {
  assert.equal(tekSatir("abcdefghij", 4), "abcd");
});

test("metin olmayan girdi boş döner", () => {
  assert.equal(tekSatir(42, 70), "");
  assert.equal(tekSatir(null, 70), "");
  assert.equal(cokSatir(["a"], 70), "");
});

test("normal Türkçe metin bozulmaz", () => {
  const t = "Şükrü'nün çğıöü SAATİ — 2. el";
  assert.equal(tekSatir(t, 70), t);
});

test("emoji ve tire gibi görünür işaretler korunur", () => {
  assert.equal(tekSatir("Saat ⌚ — sıfır", 70), "Saat ⌚ — sıfır");
});
