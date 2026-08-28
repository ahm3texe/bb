import { test } from "node:test";
import assert from "node:assert/strict";
import { icerikTuru, icerikBeyanaUyuyorMu } from "../lib/dosya-imza.ts";

const bayt = (...b: number[]) => new Uint8Array(b);
const metin = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const birlestir = (...p: Uint8Array[]) =>
  new Uint8Array(p.flatMap((x) => [...x]));

const JPEG = bayt(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bayt(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const GIF = metin("GIF89a....");
const WEBP = birlestir(metin("RIFF"), bayt(0, 0, 0, 0), metin("WEBP"));
const WEBM = bayt(0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00);
const MP4 = birlestir(bayt(0, 0, 0, 0x20), metin("ftyp"), metin("isom"));
const MOV = birlestir(bayt(0, 0, 0, 0x14), metin("ftyp"), metin("qt  "));

test("izinli biçimler imzasından tanınır", () => {
  assert.equal(icerikTuru(JPEG), "image/jpeg");
  assert.equal(icerikTuru(PNG), "image/png");
  assert.equal(icerikTuru(GIF), "image/gif");
  assert.equal(icerikTuru(WEBP), "image/webp");
  assert.equal(icerikTuru(WEBM), "video/webm");
  assert.equal(icerikTuru(MP4), "video/mp4");
  assert.equal(icerikTuru(MOV), "video/quicktime");
});

test("beyanla eşleşen içerik kabul edilir", () => {
  assert.equal(icerikBeyanaUyuyorMu(PNG, "image/png"), true);
  assert.equal(icerikBeyanaUyuyorMu(JPEG, "image/jpeg"), true);
});

test("türü gizlenmiş dosya reddedilir", () => {
  // Açığın kendisi buydu: içerik başka, beyan `image/png`. Beyaz liste
  // yalnızca beyanı süzdüğü için dosya `.png` adıyla diske yazılıyordu.
  const calistirilabilir = birlestir(metin("MZ"), bayt(0x90, 0x00));
  assert.equal(icerikBeyanaUyuyorMu(calistirilabilir, "image/png"), false);

  const betik = metin("#!/bin/sh\necho merhaba");
  assert.equal(icerikBeyanaUyuyorMu(betik, "image/jpeg"), false);

  const html = metin("<html><script>alert(1)</script>");
  assert.equal(icerikBeyanaUyuyorMu(html, "image/gif"), false);
});

test("gerçek görsel yanlış türle beyan edilirse reddedilir", () => {
  assert.equal(icerikBeyanaUyuyorMu(PNG, "image/jpeg"), false);
  assert.equal(icerikBeyanaUyuyorMu(GIF, "image/webp"), false);
});

test("mp4 ve mov aynı kapsayıcı — birbirinin yerine kabul edilir", () => {
  // Marka alanı üreticiye göre değişiyor; ikisini birbirinden ayırmakta
  // ısrar etmek gerçek dosyaları reddederdi.
  assert.equal(icerikBeyanaUyuyorMu(MP4, "video/quicktime"), true);
  assert.equal(icerikBeyanaUyuyorMu(MOV, "video/mp4"), true);
  // Ama video, görsel yerine geçemez.
  assert.equal(icerikBeyanaUyuyorMu(MP4, "image/png"), false);
});

test("boş ve çok kısa girdi çökertmez", () => {
  assert.equal(icerikTuru(bayt()), null);
  assert.equal(icerikTuru(bayt(0xff)), null);
  assert.equal(icerikBeyanaUyuyorMu(bayt(), "image/png"), false);
});
