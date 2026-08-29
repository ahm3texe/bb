import { test } from "node:test";
import assert from "node:assert/strict";
import { destekNo } from "../lib/destek.ts";

test("numara beklenen biçimde", () => {
  assert.match(destekNo(), /^#DT-\d+$/);
});

test("mevcut numaralarla çakışmaz", () => {
  // Dört basamaklı alanın TAMAMI dolu: yeni numara yine üretilebilmeli.
  const dolu = Array.from({ length: 9000 }, (_, i) => `#DT-${1000 + i}`);
  const yeni = destekNo(dolu);
  assert.equal(dolu.includes(yeni), false);
  assert.match(yeni, /^#DT-\d+$/);
});

test("çok sayıda kayıtta çakışma üretmez", () => {
  // Eski hâli (1000-9999 rastgele) 100 kayıtta %42 çakışıyordu.
  const uretilen: string[] = [];
  for (let i = 0; i < 500; i++) uretilen.push(destekNo(uretilen));
  assert.equal(new Set(uretilen).size, 500);
});

test("boş listeyle de çalışır", () => {
  assert.match(destekNo([]), /^#DT-\d+$/);
});
