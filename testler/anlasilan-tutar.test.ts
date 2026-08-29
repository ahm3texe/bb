import { test } from "node:test";
import assert from "node:assert/strict";
import { siparisSuruyor } from "../lib/anlasma.ts";
import type { Anlasma } from "../lib/anlasma.ts";

function anlasma(ek: Partial<Anlasma> = {}): Anlasma {
  return {
    sunumId: "s1",
    talepId: "t1",
    alici: "melih.k",
    satici: "plakdukkani34",
    tutar: 1000,
    kabulEden: "melih.k",
    kabulZamani: new Date(0).toISOString(),
    kargoSaat: 18,
    ...ek,
  };
}

test("ödeme bekleyen sipariş sürüyor sayılır", () => {
  assert.equal(siparisSuruyor(anlasma()), true);
});

test("tamamlanan sipariş sürmez — talep yeniden siparişe dönebilir", () => {
  const a = anlasma({
    odemeZamani: new Date(0).toISOString(),
    kargoZamani: new Date(0).toISOString(),
    teslimZamani: new Date(0).toISOString(),
    onay: "evet",
  });
  assert.equal(siparisSuruyor(a), false);
});

test("açık itirazı olan sipariş sürüyor sayılır", () => {
  // "Sorunlu" tek başına bitmiş demek değil: iade süreci işliyor olabilir.
  const a = anlasma({
    teslimZamani: new Date(0).toISOString(),
    onay: "hayir",
  });
  assert.equal(siparisSuruyor(a), true);
});

test("itirazı kapanan sipariş sürmez", () => {
  const a = anlasma({
    teslimZamani: new Date(0).toISOString(),
    onay: "hayir",
    iade: { karar: "satici-hakli", kararZamani: new Date(0).toISOString() },
  });
  assert.equal(siparisSuruyor(a), false);
});

test("para iadesi tamamlanan itiraz sürmez", () => {
  const a = anlasma({
    teslimZamani: new Date(0).toISOString(),
    onay: "hayir",
    iade: {
      karar: "alici-hakli",
      kargoZamani: new Date(0).toISOString(),
      kargoTeslimZamani: new Date(0).toISOString(),
      saticiOnay: "evet",
      iadeZamani: new Date(0).toISOString(),
    },
  });
  assert.equal(siparisSuruyor(a), false);
});
