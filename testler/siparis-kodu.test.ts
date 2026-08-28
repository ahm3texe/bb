import { test } from "node:test";
import assert from "node:assert/strict";
import { siparisKoduUret, siparisKoduMu } from "../lib/siparis-kodu.ts";
import { gonderiOlustur } from "../lib/kargo-gonderi.ts";
import type { GonderiIstegi } from "../lib/kargo-gonderi.ts";

test("kod SP- önekli ve en az altı hane", () => {
  const kod = siparisKoduUret([]);
  assert.match(kod, /^SP-\d{6,}$/);
  assert.equal(siparisKoduMu(kod), true);
});

test("talep numarasıyla karışmaz", () => {
  // `talepNo` BB- önekli; iki numara aynı ekranda yan yana duruyor ve
  // kullanıcının yanlış olanı söylemesi kargo şubesinde iş görmemek demek.
  assert.equal(siparisKoduMu("BB-837549"), false);
});

test("mevcut kodlarla ÇAKIŞMAZ", () => {
  // Çakışmanın bedeli kozmetik değil: iki sipariş aynı kodu alırsa kargo
  // görevlisinin ekranına yanlış adres gelir.
  const uretilen = new Set<string>();
  for (let i = 0; i < 500; i++) uretilen.add(siparisKoduUret([...uretilen]));
  assert.equal(uretilen.size, 500);
});

test("alan dolduysa basamak büyür, sonsuz döngü olmaz", () => {
  // Altı haneli alanın tamamı kullanımdaysa üretim durmamalı.
  const dolu = Array.from({ length: 900000 }, (_, i) => `SP-${100000 + i}`);
  const kod = siparisKoduUret(dolu);
  assert.match(kod, /^SP-\d{7,}$/);
});

const istek: GonderiIstegi = {
  siparisKodu: "SP-100001",
  yon: "gidis",
  aliciAdi: "Melih Kurt",
  adres: {
    talepId: "t1", alici: "melih.k", il: "İstanbul", ilce: "Kadıköy",
    mahalle: "Caferağa", cadde: "Test", apartman: "5", kat: "2",
    daire: "7", tarif: "zil çalışmıyor",
  },
};

test("sağlayıcı yokken numarasız gönderi oluşmaz", () => {
  // Numara da yoksa ortada takip edilebilir hiçbir şey yok; "kargoya
  // verildi" demek boş bir iddia olurdu.
  return gonderiOlustur("Aras Kargo", istek).then((s) =>
    assert.equal(s, "saglayici-yok"),
  );
});

test("elle girilen numara BEYAN olarak damgalanır", async () => {
  const s = await gonderiOlustur("Aras Kargo", istek, "ARS123456");
  assert.notEqual(typeof s, "string");
  if (typeof s === "string") return;
  assert.equal(s.gonderiNo, "ARS123456");
  assert.equal(s.firma, "Aras Kargo");
  assert.equal(s.yon, "gidis");
  // Doğrulanmış bir gönderi numarası ile "satıcı böyle yazdı" aynı şey
  // değil; ayrım kayıtta durmalı.
  assert.equal(s.beyan, true);
});
