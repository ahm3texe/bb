import { test } from "node:test";
import assert from "node:assert/strict";
import { yolAcikMi, kapsamDisiMi } from "../lib/korumali-yollar.ts";

test("vitrin sayfaları oturumsuz görülebilir", () => {
  for (const yol of [
    "/",
    "/kesfet",
    "/nasil-calisir",
    "/hakkimizda",
    "/yardim",
    "/guvenli-alisveris",
    "/ilan-kurallari",
    "/sozlesmeler",
    "/site-haritasi",
  ]) {
    assert.equal(yolAcikMi(yol), true, yol);
  }
});

test("hesap sayfaları oturum ister", () => {
  for (const yol of [
    "/profil",
    "/cuzdan",
    "/ayarlar",
    "/mesajlar",
    "/bildirimler",
    "/aldiklarim",
    "/sattiklarim",
    "/ilan-ac",
    "/ilan-yonetimi",
    "/talep-alarmlari",
    "/sunum-yap/abc",
    "/sunumum/abc",
    "/sunum-detay",
    "/sunum-karsilastirma",
    "/odeme/abc",
    "/islem/alim-1",
    // NOT: /itiraz, /siparis ve /davet-et sayfaları kaldırıldı — üçü de
    // hiçbir sunucu çağrısı yapmayan sahte ekranlardı.
    "/destek",
    "/satici-performansi",
    "/admin",
  ]) {
    assert.equal(yolAcikMi(yol), false, yol);
  }
});

test("ilan detayı açık ama ilan-ac ve ilan-yonetimi değil", () => {
  // Önek `/ilan/` sondaki eğik çizgiyle yazılmasaydı `/ilan-ac` da
  // eşleşir ve ilan açma formu herkese açılırdı.
  assert.equal(yolAcikMi("/ilan/saatc"), true);
  assert.equal(yolAcikMi("/ilan-ac"), false);
  assert.equal(yolAcikMi("/ilan-yonetimi"), false);
  assert.equal(yolAcikMi("/ilan-kurallari"), true);
});

test("ziyaretçi profili açık ama kendi profil sayfası değil", () => {
  assert.equal(yolAcikMi("/profil/melih.k"), true);
  assert.equal(yolAcikMi("/profil"), false);
  // Önekin kendisi, ardında kullanıcı adı olmadan açılmamalı.
  assert.equal(yolAcikMi("/profil/"), false);
});

test("giriş akışı açık olmalı — yoksa yönlendirme döngüsü olur", () => {
  assert.equal(yolAcikMi("/giris"), true);
  assert.equal(yolAcikMi("/sifre-sifirlama"), true);
});

test("sondaki eğik çizgi sayfayı değiştirmez", () => {
  assert.equal(yolAcikMi("/kesfet/"), true);
  assert.equal(yolAcikMi("/cuzdan/"), false);
});

test("listede olmayan yeni sayfa varsayılan olarak korumalıdır", () => {
  // Liste "açık" tarafta tutulduğu için, eklenmesi unutulan bir sayfa
  // sessizce herkese açılmaz.
  assert.equal(yolAcikMi("/yeni-hesap-sayfasi"), false);
});

test("derleyici çıktısı ve üstveri kapsam dışıdır", () => {
  for (const yol of [
    "/_next/static/chunk.js",
    "/yuklemeler/foto.webp",
    "/api/talepler",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/opengraph-image",
  ]) {
    assert.equal(kapsamDisiMi(yol), true, yol);
    assert.equal(yolAcikMi(yol), true, yol);
  }
});

// ── Statik dosyalar oturum kapısına takılmamalı ───────────────────────
// `proxy.ts` matcher'ı bir dönem yalnızca `_next/` ve `yuklemeler/` yollarını
// muaf tutuyordu; `public/` altındaki her şey — logo dâhil — korumalı yol
// sayılıp /giris'e yönlendiriliyordu. Sonuç: /logo.png 307 dönüyor, Next'in
// görsel iyileştiricisi dosyayı çekemiyor ve logo HERKESTE kırık görünüyordu.
//
// Buradaki desen proxy.ts'teki matcher'ın aynısıdır; ikisi birlikte
// güncellenmelidir.

const STATIK_MUAF =
  /^\/(?:_next\/|yuklemeler\/|.*\.(?:png|jpe?g|gif|webp|avif|svg|ico|txt|xml|webmanifest|mp4|webm|mov|woff2?|ttf)$)/;

test("public altındaki dosyalar proxy'ye takılmaz", () => {
  for (const yol of [
    "/logo.png",
    "/file.svg",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/talepler/daft-punk-discovery-plak-1.jpg",
    "/yuklemeler/abc.webp",
    "/_next/static/chunk.js",
  ]) {
    assert.equal(STATIK_MUAF.test(yol), true, yol);
  }
});

test("sayfa ve API yolları muafiyete girmez", () => {
  for (const yol of [
    "/profil",
    "/cuzdan",
    "/api/profil",
    "/ilan/saatc",
    "/",
  ]) {
    assert.equal(STATIK_MUAF.test(yol), false, yol);
  }
});

test("uzantı eklenerek oturum kapısı atlatılamaz", () => {
  // "/profil.png" muafiyete girer ama böyle bir rota yok: Next 404 döner.
  // Kapı bu yüzden yalnızca GERÇEK dosya yollarını serbest bırakıyor sayılır;
  // test, muafiyetin API yollarını kapsamadığını bağlar.
  assert.equal(STATIK_MUAF.test("/api/profil"), false);
  assert.equal(STATIK_MUAF.test("/api/iban"), false);
});
