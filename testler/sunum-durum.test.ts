import { test } from "node:test";
import assert from "node:assert/strict";
import { sunumAcikMi, sunumSuresiDolduMu } from "../lib/gelen-sunumlar.ts";

const yeni = new Date().toISOString();

test("başka sunum kabul edilince kapanan sunum artık açık değildir", () => {
  // Açık sayılsaydı satıcı hâlâ "değerlendiriliyor" görürdü ve aynı talebe
  // yeni sunum yapması engellenirdi.
  assert.equal(sunumAcikMi({ sonuc: "kapandi", olusturuldu: yeni }), false);
});

test("kapanan sunum 'süresi doldu' sayılmaz", () => {
  // İki gün sonra üzerine yanlış gerekçe yazılmamalı: alıcı yanıt verdi,
  // sadece başkasını seçti.
  const eski = new Date(Date.now() - 5 * 24 * 3600_000).toISOString();
  assert.equal(sunumSuresiDolduMu({ sonuc: "kapandi", olusturuldu: eski }), false);
});

test("beklemedeki sunum açıktır", () => {
  assert.equal(sunumAcikMi({ sonuc: "beklemede", olusturuldu: yeni }), true);
});

test("kabul edilen sunum kapanmış sayılmaz", () => {
  assert.equal(sunumAcikMi({ sonuc: "kabul", olusturuldu: yeni }), true);
});
