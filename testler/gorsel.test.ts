import { test } from "node:test";
import assert from "node:assert/strict";
import { gorselYoluGecerliMi, gorselleriSuz,
  videoYoluMu,
  sadeceFotograflar,
  sadeceVideolar,
  kullanimDisiYollar,
} from "../lib/gorsel.ts";

test("yükleme ucunun ürettiği yol geçerlidir", () => {
  assert.equal(
    gorselYoluGecerliMi("/yuklemeler/1787213763842-d99b266e-1ddc.png"),
    true,
  );
});

test("dış adres reddedilir", () => {
  assert.equal(gorselYoluGecerliMi("https://kotu.example/x.jpg"), false);
  assert.equal(gorselYoluGecerliMi("//kotu.example/x.jpg"), false);
});

test("javascript: adresi reddedilir", () => {
  assert.equal(gorselYoluGecerliMi("javascript:alert(1)"), false);
});

test("yol geçişi reddedilir", () => {
  assert.equal(gorselYoluGecerliMi("/yuklemeler/../../etc/passwd"), false);
  assert.equal(gorselYoluGecerliMi("/yuklemeler/..%2Fgizli"), false);
});

test("başka klasör reddedilir", () => {
  assert.equal(gorselYoluGecerliMi("/gizli/dosya.png"), false);
});

test("süzgeç geçersizleri atar, tekrarları teker, sayıyı sınırlar", () => {
  const sonuc = gorselleriSuz(
    [
      "/yuklemeler/a.png",
      "/yuklemeler/a.png",
      "https://kotu.example/x.jpg",
      "/yuklemeler/b.png",
      "/yuklemeler/c.png",
      42,
      null,
    ],
    2,
  );
  assert.deepEqual(sonuc, ["/yuklemeler/a.png", "/yuklemeler/b.png"]);
});

test("dizi olmayan girdi boş liste döner", () => {
  assert.deepEqual(gorselleriSuz("hepsi", 6), []);
});

// ── Fotoğraf / video ayrımı ───────────────────────────────────────────
// Yüklemeler tek dizide taşınıyor. Ayrım yapılmadığı için video yolu
// fotoğraf galerisine karışıyor (`<Image>` mp4 açamaz → kırık kapak) ve
// video hiçbir yerde oynatılmıyordu.

test("video uzantıları tanınır", () => {
  for (const y of ["/yuklemeler/a.mp4", "/yuklemeler/b.webm", "/yuklemeler/c.MOV"])
    assert.equal(videoYoluMu(y), true, y);
});

test("görsel uzantıları video sayılmaz", () => {
  for (const y of ["/yuklemeler/a.webp", "/yuklemeler/b.jpg", "/yuklemeler/c.png"])
    assert.equal(videoYoluMu(y), false, y);
});

test("karışık liste ikiye ayrılır ve hiçbir yol kaybolmaz", () => {
  const hepsi = [
    "/yuklemeler/1.webp",
    "/yuklemeler/2.mp4",
    "/yuklemeler/3.png",
    "/yuklemeler/4.mov",
  ];
  const foto = sadeceFotograflar(hepsi);
  const video = sadeceVideolar(hepsi);
  assert.deepEqual(foto, ["/yuklemeler/1.webp", "/yuklemeler/3.png"]);
  assert.deepEqual(video, ["/yuklemeler/2.mp4", "/yuklemeler/4.mov"]);
  assert.equal(foto.length + video.length, hepsi.length);
});

// ── Beyan değil, sayım ─────────────────────────────────────────────────
// Sunum ucunda `fotolar` sayısı ve `video` bayrağı GÖVDEDEN okunuyordu ve
// gerçek `gorseller` dizisiyle hiç karşılaştırılmıyordu: istek
// {fotolar: 6, video: true, gorseller: []} gönderip karşılaştırma
// tablosunda "6 fotoğraf · 1 video" gösterebiliyordu. Alıcının kanıt diye
// baktığı sayı uydurulabilir olmamalı.

test("fotoğraf sayısı yüklenen dosyalardan sayılır", () => {
  const gorseller = gorselleriSuz(
    [
      "/yuklemeler/1.webp",
      "/yuklemeler/2.png",
      "/yuklemeler/3.mp4",
      "http://baska-site/4.webp", // süzülür
    ],
    6,
  );
  assert.equal(sadeceFotograflar(gorseller).length, 2);
  assert.equal(sadeceVideolar(gorseller).length > 0, true);
});

test("hiç dosya yoksa sayı sıfır ve video yok", () => {
  const gorseller = gorselleriSuz([], 6);
  assert.equal(sadeceFotograflar(gorseller).length, 0);
  assert.equal(sadeceVideolar(gorseller).length > 0, false);
});

// ── Paylaşılan dosya silinmez ─────────────────────────────────────────
// Dosya silme, yolun BAŞKA bir kayıtta geçip geçmediğine bakmıyordu.
// Yükleme kaydı "kim yükledi" bilgisini tutmadığı ve uçlar gövdeden gelen
// yolları (biçimi doğruysa) kabul ettiği için şu mümkündü: kötü niyetli
// kullanıcı hedefin ilanındaki görsel yolunu kendi ilanına yazar, kendi
// ilanını siler, HEDEFİN kapak görseli diskten gider.

test("başka kaydın kullandığı dosya silinmez", () => {
  const kullanimda = new Set(["/yuklemeler/hedef.webp"]);
  const silinecek = kullanimDisiYollar(["/yuklemeler/hedef.webp"], kullanimda);
  assert.deepEqual(silinecek, []);
});

test("hiçbir kaydın işaret etmediği dosya silinir", () => {
  const silinecek = kullanimDisiYollar(
    ["/yuklemeler/yetim.webp"],
    new Set(["/yuklemeler/baska.webp"]),
  );
  assert.deepEqual(silinecek, ["/yuklemeler/yetim.webp"]);
});

test("karışık listede yalnızca sahipsizler düşer", () => {
  const kullanimda = new Set(["/yuklemeler/a.webp", "/yuklemeler/c.mp4"]);
  assert.deepEqual(
    kullanimDisiYollar(
      ["/yuklemeler/a.webp", "/yuklemeler/b.webp", "/yuklemeler/c.mp4"],
      kullanimda,
    ),
    ["/yuklemeler/b.webp"],
  );
});

test("aynı yol iki kez verilse de bir kez değerlendirilir", () => {
  assert.deepEqual(
    kullanimDisiYollar(["/yuklemeler/x.webp", "/yuklemeler/x.webp"], new Set()),
    ["/yuklemeler/x.webp"],
  );
});
