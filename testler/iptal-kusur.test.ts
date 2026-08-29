import { test } from "node:test";
import assert from "node:assert/strict";
import { KUSUR, kusurluIptaller } from "../lib/iptal.ts";
import type { Iptal } from "../lib/iptal.ts";

function iptal(ek: Partial<Iptal>): Iptal {
  const sebep = ek.sebep ?? "odeme-yapilmadi";
  return {
    sunumId: "s1", talepId: "t1", alici: "alici", satici: "satici",
    sebep, kusur: KUSUR[sebep], zaman: new Date(0).toISOString(), ...ek,
  };
}

test("ödeme yapılmazsa kusur alıcıdadır", () => {
  assert.equal(KUSUR["odeme-yapilmadi"], "alici");
});

test("kargolanmazsa kusur satıcıdadır", () => {
  assert.equal(KUSUR["kargolanmadi"], "satici");
});

test("itiraz alıcı lehine sonuçlanırsa kusur SATICIDADIR", () => {
  // Ürün anlatıldığı gibi değilmiş.
  assert.equal(KUSUR["itiraz-alici-hakli"], "satici");
});

test("itiraz reddedilirse kusur alıcıdadır", () => {
  assert.equal(KUSUR["itiraz-satici-hakli"], "alici");
});

test("ürün süresinde iade edilmezse kusur alıcıdadır", () => {
  assert.equal(KUSUR["iade-edilmedi"], "alici");
});

test("kusurlu iptaller doğru tarafa sayılır", () => {
  const liste = [
    iptal({ sunumId: "a", sebep: "odeme-yapilmadi" }),
    iptal({ sunumId: "b", sebep: "kargolanmadi" }),
    iptal({ sunumId: "c", sebep: "itiraz-alici-hakli" }),
  ];
  assert.deepEqual(
    kusurluIptaller(liste, "alici").map((i) => i.sunumId),
    ["a"],
  );
  assert.deepEqual(
    kusurluIptaller(liste, "satici").map((i) => i.sunumId),
    ["b", "c"],
  );
});

test("karşı tarafın kusuru kişiye yazılmaz", () => {
  // Satıcı kargolamadıysa alıcının siciline geçmemeli.
  const liste = [iptal({ sebep: "kargolanmadi" })];
  assert.equal(kusurluIptaller(liste, "alici").length, 0);
});
