import { test } from "node:test";
import assert from "node:assert/strict";
import { aliciKalitesi } from "../lib/alici-kalitesi.ts";
import type { AliciMetrik } from "../lib/alici-kalitesi.ts";

function metrik(ek: Partial<AliciMetrik> = {}): AliciMetrik {
  return {
    puanOrtalamasi: 0,
    degerlendirmeSayisi: 0,
    olumluYorum: 0,
    olumsuzYorum: 0,
    tamamlananAlim: 0,
    iptalEdilenAlim: 0,
    sunumYanitOrani: null,
    ...ek,
  };
}

test("hiç geçmişi olmayan kullanıcı damgalanmaz", () => {
  const k = aliciKalitesi(metrik());
  assert.equal(k.seviye, "degerlendirilmedi");
});

test("ölçümü olmayan sinyal zayıf yan sayılmaz", () => {
  // Hiç sunum almamış birinin eksiği "Sunumlara yanıt" değildir.
  const k = aliciKalitesi(metrik({ tamamlananAlim: 5, sunumYanitOrani: null }));
  assert.equal(k.zayifYanlar.includes("Sunumlara yanıt"), false);
});

test("ölçümü olmayan sinyal puanı aşağı çekmez", () => {
  // Aynı kullanıcı; tek fark sunum yanıt verisinin durumu.
  const temel = { tamamlananAlim: 10, puanOrtalamasi: 5, degerlendirmeSayisi: 5 };
  const veriYok = aliciKalitesi(metrik({ ...temel, sunumYanitOrani: null }));
  const tamYanit = aliciKalitesi(metrik({ ...temel, sunumYanitOrani: 1 }));
  const hicYanit = aliciKalitesi(metrik({ ...temel, sunumYanitOrani: 0 }));

  // Veri yokluğu, mükemmel performansa yakın olmalı (yuvarlama payı) ve
  // gerçekten kötü performanstan belirgin şekilde yüksek kalmalı.
  assert.ok(
    Math.abs(veriYok.puan - tamYanit.puan) <= 1,
    `veri yokluğu cezalandırılmamalı: ${veriYok.puan} vs ${tamYanit.puan}`,
  );
  assert.ok(
    veriYok.puan > hicYanit.puan + 5,
    `veri yokluğu, hiç yanıt vermemekle karıştırılmamalı: ${veriYok.puan} vs ${hicYanit.puan}`,
  );
});

test("gerçekten yanıt vermeyen kullanıcı ceza alır", () => {
  const iyi = aliciKalitesi(
    metrik({ tamamlananAlim: 10, sunumYanitOrani: 1 }),
  );
  const kotu = aliciKalitesi(
    metrik({ tamamlananAlim: 10, sunumYanitOrani: 0 }),
  );
  assert.ok(kotu.puan < iyi.puan, "yanıt vermeyen daha düşük puan almalı");
  assert.equal(kotu.zayifYanlar.includes("Sunumlara yanıt"), true);
});

test("yüksek puanlı ve iptalsiz kullanıcı yüksek seviyede", () => {
  const k = aliciKalitesi(
    metrik({
      puanOrtalamasi: 4.8,
      degerlendirmeSayisi: 12,
      olumluYorum: 11,
      olumsuzYorum: 1,
      tamamlananAlim: 12,
      sunumYanitOrani: 0.9,
    }),
  );
  assert.equal(k.seviye, "yuksek");
});

test("çok iptal eden kullanıcı düşer", () => {
  const k = aliciKalitesi(
    metrik({
      puanOrtalamasi: 3,
      degerlendirmeSayisi: 5,
      tamamlananAlim: 4,
      iptalEdilenAlim: 6,
      sunumYanitOrani: 0.5,
    }),
  );
  assert.equal(k.seviye, "dusuk");
});

test("puan 0-100 aralığında kalır", () => {
  const uc = aliciKalitesi(
    metrik({
      puanOrtalamasi: 5,
      degerlendirmeSayisi: 100,
      olumluYorum: 100,
      tamamlananAlim: 100,
      sunumYanitOrani: 1,
    }),
  );
  assert.ok(uc.puan >= 0 && uc.puan <= 100, `puan bandı: ${uc.puan}`);
});
