import { test } from "node:test";
import assert from "node:assert/strict";
import { hizSinirla, sayacAdedi, DAKIKA } from "../lib/hiz-siniri.ts";

test("pencere içinde limit aşılınca reddedilir", () => {
  const anahtar = `test-limit-${Math.random()}`;
  assert.equal(hizSinirla(anahtar, 2, DAKIKA).izin, true);
  assert.equal(hizSinirla(anahtar, 2, DAKIKA).izin, true);
  const ucuncu = hizSinirla(anahtar, 2, DAKIKA);
  assert.equal(ucuncu.izin, false);
  if (!ucuncu.izin) assert.ok(ucuncu.kalanSaniye > 0);
});

test("pencere dolunca sayaç sıfırlanır", () => {
  const anahtar = `test-pencere-${Math.random()}`;
  // Sıfır uzunluklu pencere: bir sonraki çağrıda süre çoktan dolmuş olur.
  assert.equal(hizSinirla(anahtar, 1, 0).izin, true);
  assert.equal(hizSinirla(anahtar, 1, 0).izin, true);
});

test("süresi dolan kayıtlar bellekten düşer", () => {
  // GERİLEME TESTİ: sayaç `Map`'i hiç temizlenmiyordu. Anahtar kullanıcı
  // adı içerdiği için kayıt sayısı hesap sayısıyla birlikte sınırsız
  // büyüyordu — yavaş ama kesin bir bellek sızıntısı.
  const oncesi = sayacAdedi();

  // Temizlik seyrek çalışıyor (her N çağrıda bir); eşiği aşacak kadar
  // süresi DOLMUŞ kayıt üret.
  for (let i = 0; i < 600; i++) hizSinirla(`sizinti-${i}`, 5, 0);

  const sonrasi = sayacAdedi();
  assert.ok(
    sonrasi < oncesi + 600,
    `temizlik çalışmadı: ${oncesi} → ${sonrasi}`,
  );
});

test("süresi dolmamış kayıt temizlikte silinmez", () => {
  const anahtar = `test-canli-${Math.random()}`;
  hizSinirla(anahtar, 5, DAKIKA);
  // Temizliği tetikleyecek kadar çağrı yap; canlı kayıt korunmalı.
  for (let i = 0; i < 600; i++) hizSinirla(`gecici-${i}`, 5, 0);
  // Canlı kayıt duruyorsa sayaç kaldığı yerden devam eder.
  const sonuc = hizSinirla(anahtar, 5, DAKIKA);
  assert.equal(sonuc.izin, true);
});
