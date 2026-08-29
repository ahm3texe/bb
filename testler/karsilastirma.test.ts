import { test } from "node:test";
import assert from "node:assert/strict";
import { karsilastirmaAnahtari, ayniMi } from "../lib/metin.ts";

test("Türkçe I/İ tuzağı karşılaştırmayı bozmaz", () => {
  // toLocaleLowerCase("tr") bunların hiçbirini eşleştirmiyordu.
  assert.ok(ayniMi("IPHONE", "iPhone"));
  assert.ok(ayniMi("Istanbul", "İstanbul"));
  assert.ok(ayniMi("NIKE", "Nike"));
  assert.ok(ayniMi("ISTANBUL", "istanbul"));
});

test("Türkçe karakterler katlanır", () => {
  assert.ok(ayniMi("Şişli", "sisli"));
  assert.ok(ayniMi("Çankaya", "cankaya"));
  assert.ok(ayniMi("Gaziosmanpaşa", "GAZIOSMANPASA"));
});

test("düzeltme işaretli harfler katlanır", () => {
  assert.ok(ayniMi("Kâhta", "Kahta"));
  assert.ok(ayniMi("Hakkâri", "HAKKARI"));
});

test("boşluk farkları önemsiz", () => {
  assert.ok(ayniMi("  Apple   Watch ", "apple watch"));
});

test("gerçekten farklı metinler eşleşmez", () => {
  assert.equal(ayniMi("Nike", "Adidas"), false);
  assert.equal(ayniMi("İstanbul", "Ankara"), false);
});

test("görünmez karakter karşılaştırmayı bozmaz", () => {
  assert.ok(ayniMi("Nike​", "nike"));
});

test("metin olmayan girdi boş anahtar üretir", () => {
  assert.equal(karsilastirmaAnahtari(null), "");
  assert.equal(karsilastirmaAnahtari(42), "");
});
