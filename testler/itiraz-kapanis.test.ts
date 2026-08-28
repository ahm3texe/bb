import { test } from "node:test";
import assert from "node:assert/strict";
import {
  iadeAdimi,
  itirazKapandiMi,
  siparisSuruyor,
  iadeKargoSuresiDoldu,
  IADE_KARGO_SURESI_MS,
} from "../lib/anlasma.ts";
import type { Anlasma } from "../lib/anlasma.ts";

function itirazli(iade: Anlasma["iade"] = {}): Anlasma {
  return {
    sunumId: "s1",
    talepId: "t1",
    alici: "melih.k",
    satici: "plakdukkani34",
    tutar: 1000,
    kabulEden: "melih.k",
    kabulZamani: new Date(0).toISOString(),
    kargoSaat: 18,
    odemeZamani: new Date(0).toISOString(),
    kargoZamani: new Date(0).toISOString(),
    teslimZamani: new Date(0).toISOString(),
    onay: "hayir",
    iade,
  };
}

test("iade kargosu süresi kararın üstünden 2 gün sonra dolar", () => {
  const a = itirazli({ karar: "alici-hakli", kararZamani: new Date(0).toISOString() });
  assert.equal(iadeKargoSuresiDoldu(a, IADE_KARGO_SURESI_MS - 1000), false);
  assert.equal(iadeKargoSuresiDoldu(a, IADE_KARGO_SURESI_MS), true);
});

test("ürün gönderildiyse süre işlemez", () => {
  const a = itirazli({
    karar: "alici-hakli",
    kararZamani: new Date(0).toISOString(),
    kargoZamani: new Date(1000).toISOString(),
  });
  assert.equal(iadeKargoSuresiDoldu(a, 10 * IADE_KARGO_SURESI_MS), false);
  assert.equal(iadeAdimi(a), "iade-kargoda");
});

test("iade kargosu gelmezse süreç satıcı lehine kapanır", () => {
  const a = itirazli({
    karar: "alici-hakli",
    kararZamani: new Date(0).toISOString(),
    kargoSuresiAsildi: new Date(IADE_KARGO_SURESI_MS).toISOString(),
  });
  assert.equal(iadeAdimi(a), "satici-hakli");
  assert.equal(itirazKapandiMi(a), true);
  // İlan artık kilitli değil: silinebilir ve yeni siparişe dönebilir.
  assert.equal(siparisSuruyor(a), false);
});

test("destek kararı ezilmez — kayıt 'alıcı haklıydı ama göndermedi' der", () => {
  const a = itirazli({
    karar: "alici-hakli",
    kararZamani: new Date(0).toISOString(),
    kargoSuresiAsildi: new Date(IADE_KARGO_SURESI_MS).toISOString(),
  });
  assert.equal(a.iade?.karar, "alici-hakli");
  assert.equal(iadeAdimi(a), "satici-hakli");
});

test("destek doğrudan satıcıyı haklı bulursa süreç kapanır", () => {
  const a = itirazli({ karar: "satici-hakli", kararZamani: new Date(0).toISOString() });
  assert.equal(iadeAdimi(a), "satici-hakli");
  assert.equal(siparisSuruyor(a), false);
});

test("karşı itirazın reddi de satıcı lehine kapanıştır", () => {
  const a = itirazli({
    karar: "alici-hakli",
    kargoZamani: new Date(0).toISOString(),
    kargoTeslimZamani: new Date(0).toISOString(),
    saticiOnay: "hayir",
    ikinciKarar: "ret",
  });
  assert.equal(iadeAdimi(a), "satici-hakli");
  assert.equal(siparisSuruyor(a), false);
});
