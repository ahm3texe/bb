import { test } from "node:test";
import assert from "node:assert/strict";

import {
  oturumImzala,
  oturumCoz,
  oturumAnahtariVarMi,
  OTURUM_SURESI_MS,
} from "../lib/oturum-imza.ts";

// Anahtar modül yüklenirken değil, HER ÇAĞRIDA okunuyor; bu yüzden statik
// import güvenli — testler çalışmaya başlamadan önce burada kurulur.
process.env.BULBANA_OTURUM_ANAHTARI =
  "test-anahtari-en-az-otuz-iki-karakter-uzunlugunda";

test("imzalanan çerez kendi kullanıcısını geri verir", () => {
  const cerez = oturumImzala("melih.k");
  assert.ok(cerez);
  assert.equal(oturumCoz(cerez), "melih.k");
});

test("noktalı kullanıcı adı ayraçla çakışmaz", () => {
  // `melih.k` ve `ayse.demir` nokta içeriyor; ayraç olarak nokta seçilseydi
  // çözme adımı kullanıcı adını ortadan bölerdi.
  for (const ad of ["melih.k", "ayse.demir", "plakdukkani34"]) {
    assert.equal(oturumCoz(oturumImzala(ad)), ad);
  }
});

test("düz metin çerez kabul edilmez", () => {
  // Eski biçim buydu: `bb_aktif_kullanici=melih.k`. Tarayıcı konsolundan
  // yazılan bu değer artık hiçbir kimlik üretmemeli.
  assert.equal(oturumCoz("melih.k"), null);
});

test("gövdesi değiştirilen çerez reddedilir", () => {
  const cerez = oturumImzala("melih.k");
  assert.ok(cerez);
  const [, bitis, imza] = cerez.split("~");
  // Başkasının kullanıcı adı, aynı imzayla.
  const sahte = `${Buffer.from("ayse.demir", "utf8").toString("base64url")}~${bitis}~${imza}`;
  assert.equal(oturumCoz(sahte), null);
});

test("imzası uydurulan çerez reddedilir", () => {
  const govde = `${Buffer.from("ayse.demir", "utf8").toString("base64url")}~${Date.now() + 1000}`;
  assert.equal(oturumCoz(`${govde}~uydurmaimza`), null);
});

test("süresi dolan oturum reddedilir", () => {
  const simdi = Date.now();
  const cerez = oturumImzala("melih.k", simdi);
  assert.ok(cerez);
  // Süre dolmadan hemen önce geçerli, dolduktan sonra değil.
  assert.equal(oturumCoz(cerez, simdi + OTURUM_SURESI_MS - 1000), "melih.k");
  assert.equal(oturumCoz(cerez, simdi + OTURUM_SURESI_MS), null);
});

test("bozuk biçimler sessizce reddedilir", () => {
  for (const bozuk of ["", "a~b", "a~b~c~d", "~~", "!!!~123~xyz"]) {
    assert.equal(oturumCoz(bozuk), null);
  }
  assert.equal(oturumCoz(undefined), null);
});

test("anahtar yoksa oturum üretilemez ve çözülemez", () => {
  const cerez = oturumImzala("melih.k");
  assert.ok(cerez);

  const yedek = process.env.BULBANA_OTURUM_ANAHTARI;
  try {
    // Anahtarsız sunucu: "başarısızsa kapan". Daha önce üretilmiş geçerli
    // bir çerez bile kabul edilmemeli.
    delete process.env.BULBANA_OTURUM_ANAHTARI;
    assert.equal(oturumAnahtariVarMi(), false);
    assert.equal(oturumImzala("melih.k"), null);
    assert.equal(oturumCoz(cerez), null);

    // Kısa anahtar da yok sayılır — yanlışlıkla girilen bir yer tutucu
    // gerçek anahtar sanılmasın.
    process.env.BULBANA_OTURUM_ANAHTARI = "kisa";
    assert.equal(oturumAnahtariVarMi(), false);
    assert.equal(oturumCoz(cerez), null);
  } finally {
    process.env.BULBANA_OTURUM_ANAHTARI = yedek;
  }
});

test("başka anahtarla imzalanan çerez kabul edilmez", () => {
  const cerez = oturumImzala("melih.k");
  assert.ok(cerez);
  const yedek = process.env.BULBANA_OTURUM_ANAHTARI;
  try {
    process.env.BULBANA_OTURUM_ANAHTARI =
      "bambaska-bir-anahtar-yine-otuz-iki-karakterden-uzun";
    assert.equal(oturumCoz(cerez), null);
  } finally {
    process.env.BULBANA_OTURUM_ANAHTARI = yedek;
  }
});
