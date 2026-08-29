import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aliciOnaySuresiDoldu,
  aliciOnaySonTarih,
  anlasmaDurumu,
  ALICI_ONAY_SURESI_MS,
} from "../lib/anlasma.ts";
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
    odemeZamani: new Date(0).toISOString(),
    kargoZamani: new Date(SAAT).toISOString(),
    ...ek,
  };
}

test("kargo firması teslim bildirmeden sayaç başlamaz", () => {
  const a = anlasma();
  assert.equal(aliciOnaySonTarih(a), undefined);
  assert.equal(aliciOnaySuresiDoldu(a, 1000 * SAAT), false);
});

test("sayaç teslim bildiriminden itibaren 24 saat işler", () => {
  const a = anlasma({ teslimZamani: new Date(10 * SAAT).toISOString() });
  assert.equal(
    aliciOnaySonTarih(a),
    new Date(10 * SAAT + ALICI_ONAY_SURESI_MS).toISOString(),
  );
  assert.equal(aliciOnaySuresiDoldu(a, 33 * SAAT), false);
  assert.equal(aliciOnaySuresiDoldu(a, 34 * SAAT), true);
});

test("sayacın tek kaynağı taşıyıcının teslim damgasıdır", () => {
  // Alıcıya "ürünü teslim aldın mı?" diye sorulan bir ara adım VARDI ve
  // sayacın o adımla uzamaması ayrıca korunuyordu. Adım kaldırıldı: teslim
  // bilgisi kargo firmasından geliyor, aynı olayı alıcıya doğrulatmak hem
  // gereksizdi hem de "almadım" diyerek süreci bekletmeye açıktı.
  // Geriye tek kaynak kaldı; bu test onu bağlar.
  const a = anlasma({ teslimZamani: new Date(0).toISOString() });
  assert.equal(aliciOnaySonTarih(a), new Date(24 * SAAT).toISOString());
  assert.equal(aliciOnaySuresiDoldu(a, 23 * SAAT), false);
  assert.equal(aliciOnaySuresiDoldu(a, 25 * SAAT), true);
});

test("yanıt verilmişse süre işlemez", () => {
  const a = anlasma({
    teslimZamani: new Date(0).toISOString(),
    onay: "evet",
  });
  assert.equal(aliciOnaySuresiDoldu(a, 1000 * SAAT), false);
});

test("itiraz edilmiş sipariş otomatik onaylanmaz", () => {
  const a = anlasma({
    teslimZamani: new Date(0).toISOString(),
    onay: "hayir",
  });
  assert.equal(aliciOnaySuresiDoldu(a, 1000 * SAAT), false);
  assert.equal(anlasmaDurumu(a), "sorunlu");
});

test("teslim aldım onayı siparişi 'teslim-edildi'de tutar", () => {
  // Ürünün kabulü ayrı adım: teslim onayı tek başına siparişi bitirmez.
  const a = anlasma({
    teslimZamani: new Date(0).toISOString(),
  });
  assert.equal(anlasmaDurumu(a), "teslim-edildi");
});
