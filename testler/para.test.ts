import { test } from "node:test";
import assert from "node:assert/strict";
import { paraTutari, MAX_FIYAT } from "../lib/para.ts";

test("geçerli tam sayı olduğu gibi geçer", () => {
  assert.equal(paraTutari(10000), 10000);
  assert.equal(paraTutari("10000"), 10000);
});

test("kesir yuvarlanır — ekranda '3.333,333 TL' görünmesin", () => {
  assert.equal(paraTutari(3333.3333), 3333);
  assert.equal(paraTutari(3333.7), 3334);
});

test("tip zorlaması reddedilir", () => {
  // Number([5]) === 5 ve Number(true) === 1; sessizce geçmemeli.
  assert.equal(paraTutari([5]), null);
  assert.equal(paraTutari(true), null);
  assert.equal(paraTutari({}), null);
  assert.equal(paraTutari(null), null);
  assert.equal(paraTutari(undefined), null);
});

test("boş ve anlamsız metin reddedilir", () => {
  assert.equal(paraTutari(""), null);
  assert.equal(paraTutari("   "), null);
  assert.equal(paraTutari("abc"), null);
});

test("sıfır ve negatif reddedilir", () => {
  assert.equal(paraTutari(0), null);
  assert.equal(paraTutari(-5), null);
  // 0.4 yuvarlanınca 0 olur; yine reddedilmeli.
  assert.equal(paraTutari(0.4), null);
});

test("sonsuz ve NaN reddedilir", () => {
  assert.equal(paraTutari(Infinity), null);
  assert.equal(paraTutari(NaN), null);
  assert.equal(paraTutari("1e999"), null);
});

test("üst bant uygulanır", () => {
  assert.equal(paraTutari(MAX_FIYAT), MAX_FIYAT);
  assert.equal(paraTutari(MAX_FIYAT + 1), null);
});
