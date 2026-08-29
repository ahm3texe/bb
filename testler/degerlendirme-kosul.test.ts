import { test } from "node:test";
import assert from "node:assert/strict";
import { siparisSuruyor } from "../lib/anlasma.ts";
import type { Anlasma } from "../lib/anlasma.ts";

const T = new Date(0).toISOString();

function siparis(ek: Partial<Anlasma> = {}): Anlasma {
  return {
    sunumId: "s1", talepId: "t1", alici: "alici", satici: "satici",
    tutar: 1000, kabulEden: "alici", kabulZamani: T, kargoSaat: 18, ...ek,
  };
}

/** Uç bu koşulu kullanıyor: sipariş sürüyorsa değerlendirme kapalı. */
const degerlendirilebilir = (a: Anlasma) => !siparisSuruyor(a);

test("süren siparişte değerlendirme yapılamaz", () => {
  assert.equal(degerlendirilebilir(siparis({ odemeZamani: T })), false);
  assert.equal(
    degerlendirilebilir(siparis({ odemeZamani: T, kargoZamani: T })),
    false,
  );
});

test("alıcı onayladıysa değerlendirilebilir", () => {
  const a = siparis({
    odemeZamani: T, kargoZamani: T, teslimZamani: T, onay: "evet",
  });
  assert.equal(degerlendirilebilir(a), true);
});

test("açık itiraz varken değerlendirilemez", () => {
  const a = siparis({
    odemeZamani: T, kargoZamani: T, teslimZamani: T, onay: "hayir", iade: { karar: "alici-hakli", kararZamani: T },
  });
  assert.equal(degerlendirilebilir(a), false);
});

test("itiraz satıcı lehine kapandıysa değerlendirilebilir", () => {
  const a = siparis({
    odemeZamani: T, kargoZamani: T, teslimZamani: T, onay: "hayir",
    iade: { karar: "satici-hakli", kararZamani: T },
  });
  assert.equal(degerlendirilebilir(a), true);
});

test("ürün iade edilip para döndüyse de değerlendirilebilir", () => {
  // Alışveriş geri alındı ama taraflar birbirini yaşadı; puanlanabilmeli.
  const a = siparis({
    odemeZamani: T, kargoZamani: T, teslimZamani: T, onay: "hayir",
    iade: {
      karar: "alici-hakli", kargoZamani: T, kargoTeslimZamani: T,
      saticiOnay: "evet", iadeZamani: T,
    },
  });
  assert.equal(degerlendirilebilir(a), true);
});

test("alıcı ürünü iade etmediği için kapandıysa da değerlendirilebilir", () => {
  const a = siparis({
    odemeZamani: T, kargoZamani: T, teslimZamani: T, onay: "hayir",
    iade: { karar: "alici-hakli", kararZamani: T, kargoSuresiAsildi: T },
  });
  assert.equal(degerlendirilebilir(a), true);
});
