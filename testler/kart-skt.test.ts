import { test } from "node:test";
import assert from "node:assert/strict";
import { sktGecerliMi } from "../lib/kart.ts";

const simdi = new Date("2026-08-21T00:00:00.000Z");

test("gelecekteki tarih geçerlidir", () => {
  assert.equal(sktGecerliMi("12/2028", simdi), true);
});

test("içinde bulunulan ay son güne kadar geçerlidir", () => {
  assert.equal(sktGecerliMi("08/2026", simdi), true);
});

test("geçmiş tarih reddedilir", () => {
  assert.equal(sktGecerliMi("07/2026", simdi), false);
  assert.equal(sktGecerliMi("01/1999", simdi), false);
});

test("olmayan ay reddedilir", () => {
  assert.equal(sktGecerliMi("99/2030", simdi), false);
  assert.equal(sktGecerliMi("00/2030", simdi), false);
});

test("çok uzak tarih yazım hatası sayılır", () => {
  assert.equal(sktGecerliMi("01/2099", simdi), false);
});

test("biçimsiz değer reddedilir", () => {
  assert.equal(sktGecerliMi("1/2030", simdi), false);
  assert.equal(sktGecerliMi("", simdi), false);
});
