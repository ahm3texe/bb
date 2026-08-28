import { test } from "node:test";
import assert from "node:assert/strict";
import { kargoSuresiDoldu, odemeSuresiDoldu } from "../lib/anlasma.ts";
import type { Anlasma } from "../lib/anlasma.ts";

const SAAT = 3600_000;

function anlasma(ek: Partial<Anlasma> = {}): Anlasma {
  return {
    sunumId: "s1",
    talepId: "t1",
    alici: "melih.k",
    satici: "plakdukkani34",
    tutar: 3500,
    kabulEden: "melih.k",
    kabulZamani: new Date(0).toISOString(),
    kargoSaat: 18,
    ...ek,
  };
}

test("ödeme yapılmadıysa kargo sayacı hiç başlamaz", () => {
  const a = anlasma();
  assert.equal(kargoSuresiDoldu(a, 100 * SAAT), false);
});

test("süre içinde kargolanmışsa gecikme yok", () => {
  const a = anlasma({
    odemeZamani: new Date(0).toISOString(),
    kargoZamani: new Date(5 * SAAT).toISOString(),
  });
  assert.equal(kargoSuresiDoldu(a, 100 * SAAT), false);
});

test("vaat edilen süre dolduğu hâlde kargolanmadıysa gecikmiştir", () => {
  const a = anlasma({ odemeZamani: new Date(0).toISOString() });
  assert.equal(kargoSuresiDoldu(a, 17 * SAAT), false);
  assert.equal(kargoSuresiDoldu(a, 18 * SAAT), true);
});

test("72 saatlik vaatte sayaç 18 saatte dolmaz", () => {
  const a = anlasma({ kargoSaat: 72, odemeZamani: new Date(0).toISOString() });
  assert.equal(kargoSuresiDoldu(a, 18 * SAAT), false);
  assert.equal(kargoSuresiDoldu(a, 72 * SAAT), true);
});

test("ödeme süresi ve kargo süresi birbirine karışmaz", () => {
  const a = anlasma();
  assert.equal(odemeSuresiDoldu(a, 2 * SAAT), true);
  assert.equal(kargoSuresiDoldu(a, 2 * SAAT), false);
});
