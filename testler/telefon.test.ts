import { test } from "node:test";
import assert from "node:assert/strict";
import {
  telefonSadelestir,
  telefonGecerliMi,
  telefonMaskele,
  telefonBicimle,
  telefonKoduUret,
} from "../lib/telefon.ts";

// Numaranın tek doğru biçimi `lib/telefon.ts`'te tanımlı. Sadeleştirme
// olmazsa "0555…" ile "+90555…" aynı hesapta iki farklı kayıt gibi görünür
// ve doğrulanmış numara eşleşmez.

test("farklı yazımlar aynı sade biçime iner", () => {
  const beklenen = "+905551234567";
  for (const giris of [
    "0555 123 45 67",
    "05551234567",
    "+90 555 123 45 67",
    "905551234567",
    "555 123 45 67",
    "+90-555-123-45-67",
    " 0555.123.45.67 ",
  ]) {
    assert.equal(telefonSadelestir(giris), beklenen, giris);
  }
});

test("cep olmayan ve eksik numaralar reddedilir", () => {
  for (const giris of [
    "0212 123 45 67", // sabit hat: SMS ulaşmaz
    "0555 123 45 6", // eksik hane
    "0555 123 45 678", // fazla hane
    "abcdefghij",
    "",
    "   ",
  ]) {
    assert.equal(telefonSadelestir(giris), null, giris);
    assert.equal(telefonGecerliMi(giris), false, giris);
  }
});

test("metin olmayan girdi reddedilir", () => {
  for (const giris of [null, undefined, 5551234567, {}, []]) {
    assert.equal(telefonSadelestir(giris), null);
  }
});

test("maske yalnızca son iki haneyi açar", () => {
  const maske = telefonMaskele("+905551234567");
  assert.equal(maske, "+90 5•• ••• •• 67");
  // Numaranın tamamı maskeden geri üretilememeli.
  assert.equal(maske.includes("1234"), false);
});

test("okunur biçim gruplanır", () => {
  assert.equal(telefonBicimle("+905551234567"), "+90 555 123 45 67");
});

test("geçersiz kayıt biçimlendirilirken çökmez", () => {
  assert.equal(telefonMaskele("bozuk"), "");
  assert.equal(telefonBicimle("bozuk"), "bozuk");
});

test("doğrulama kodu altı haneli sayıdır", () => {
  // Kullanıcı kodu ELLE yazacağı için kısa ve rakamsal olmalı.
  for (const r of [0, 0.5, 0.999999]) {
    const kod = telefonKoduUret(() => r);
    assert.match(kod, /^\d{6}$/);
  }
});

test("kod aralığın uçlarında da altı hane kalır", () => {
  assert.equal(telefonKoduUret(() => 0), "100000");
  assert.equal(telefonKoduUret(() => 0.9999999), "999999");
});
