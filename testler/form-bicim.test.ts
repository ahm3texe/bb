import { test } from "node:test";
import assert from "node:assert/strict";
import { kartNoBicimle, sktBicimle } from "../lib/kart.ts";
import { telefonYazarkenBicimle, telefonSadelestir } from "../lib/telefon.ts";

test("kart numarası dörderli gruplanır", () => {
  assert.equal(kartNoBicimle("4"), "4");
  assert.equal(kartNoBicimle("1234"), "1234");
  assert.equal(kartNoBicimle("12345"), "1234 5");
  assert.equal(kartNoBicimle("1234567890123456"), "1234 5678 9012 3456");
});

test("kullanıcının yazdığı boşluk ve harf yok sayılır", () => {
  assert.equal(kartNoBicimle("1234 5678"), "1234 5678");
  assert.equal(kartNoBicimle("1234-5678"), "1234 5678");
  assert.equal(kartNoBicimle("12ab34"), "1234");
});

test("16 haneden fazlası alınmaz", () => {
  assert.equal(kartNoBicimle("12345678901234567890"), "1234 5678 9012 3456");
});

test("kart numarasında silme ilerler", () => {
  // Sondaki gruptan sonra boşluk bırakılmadığı için silme kilitlenmez.
  assert.equal(kartNoBicimle("1234 567"), "1234 567");
  assert.equal(kartNoBicimle("1234 "), "1234");
  assert.equal(kartNoBicimle("123"), "123");
});

test("son kullanma tarihine / kendiliğinden düşer", () => {
  assert.equal(sktBicimle("1", ""), "1");
  assert.equal(sktBicimle("12", "1"), "12/");
  assert.equal(sktBicimle("12/2", "12/"), "12/2");
  assert.equal(sktBicimle("12/28", "12/2"), "12/28");
});

test("kullanıcı / işaretini kendi yazsa da tek kalır", () => {
  assert.equal(sktBicimle("12/", "12"), "12/");
  assert.equal(sktBicimle("1/2", ""), "12/");
});

test("SKT'de silme KİLİTLENMEZ", () => {
  // "12/" iken geri silince tarayıcı "12" bırakır; biçimlendirici onu
  // yeniden "12/" yapsaydı silme hiç ilerlemezdi.
  assert.equal(sktBicimle("12", "12/"), "1");
  assert.equal(sktBicimle("1", "12"), "1");
  assert.equal(sktBicimle("", "1"), "");
});

test("SKT dört haneden uzun olmaz", () => {
  assert.equal(sktBicimle("1228999", "12/28"), "12/28");
});

test("telefon 4-3-2-2 gruplanır", () => {
  assert.equal(telefonYazarkenBicimle("0"), "0");
  assert.equal(telefonYazarkenBicimle("0555"), "0555");
  assert.equal(telefonYazarkenBicimle("05551"), "0555 1");
  assert.equal(telefonYazarkenBicimle("05551234567"), "0555 123 45 67");
});

test("telefonda harf, boşluk ve fazla hane elenir", () => {
  assert.equal(telefonYazarkenBicimle("0555 123 45 67"), "0555 123 45 67");
  assert.equal(telefonYazarkenBicimle("0555-123-45-67"), "0555 123 45 67");
  assert.equal(telefonYazarkenBicimle("05551234567899"), "0555 123 45 67");
});

test("telefonda silme KİLİTLENMEZ", () => {
  // Sondaki gruptan sonra ayraç bırakılmadığı için geri silme ilerler.
  assert.equal(telefonYazarkenBicimle("0555 123 45 6"), "0555 123 45 6");
  assert.equal(telefonYazarkenBicimle("0555 123 45 "), "0555 123 45");
  assert.equal(telefonYazarkenBicimle("0555 "), "0555");
});

test("biçimli numara kayda olduğu gibi verilebilir", () => {
  // Ekrandaki değer doğrudan uca gidiyor; sadeleştirici boşlukları atmalı.
  assert.equal(
    telefonSadelestir(telefonYazarkenBicimle("05551234567")),
    "+905551234567",
  );
});
