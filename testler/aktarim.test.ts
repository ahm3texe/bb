import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cekilebilirTutar,
  bekleyenTutar,
  aktarilanTutar,
} from "../lib/aktarim.ts";
import type { AktarimTalebi } from "../lib/aktarim.ts";

function aktarim(ek: Partial<AktarimTalebi> = {}): AktarimTalebi {
  return {
    id: "a1",
    kullanici: "melih.k",
    tutar: 1000,
    ibanMaske: "TR** **** 1234",
    durum: "islemde",
    zaman: "2026-08-01T10:00:00.000Z",
    ...ek,
  };
}

test("bekleyen aktarım çekilebilir tutardan düşer", () => {
  const liste = [aktarim({ tutar: 400, durum: "islemde" })];
  assert.equal(cekilebilirTutar(1000, liste), 600);
});

test("TAMAMLANMIŞ aktarım da çekilebilir tutardan düşer", () => {
  // Regresyon: yalnızca "islemde" düşülüyordu; muhasebe aktarımı
  // tamamlayınca aynı para yeniden çekilebilir hale geliyordu.
  const liste = [aktarim({ tutar: 400, durum: "tamamlandi" })];
  assert.equal(cekilebilirTutar(1000, liste), 600);
});

test("reddedilen aktarım bakiyeyi bloke etmez", () => {
  const liste = [aktarim({ tutar: 400, durum: "reddedildi" })];
  assert.equal(cekilebilirTutar(1000, liste), 1000);
});

test("bekleyen ve tamamlanan birlikte düşer, sonuç negatife inmez", () => {
  const liste = [
    aktarim({ id: "a1", tutar: 700, durum: "tamamlandi" }),
    aktarim({ id: "a2", tutar: 500, durum: "islemde" }),
  ];
  assert.equal(bekleyenTutar(liste), 500);
  assert.equal(aktarilanTutar(liste), 700);
  assert.equal(cekilebilirTutar(1000, liste), 0);
});
