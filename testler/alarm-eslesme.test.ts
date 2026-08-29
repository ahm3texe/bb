import { test } from "node:test";
import assert from "node:assert/strict";
import { talepEslesiyorMu, BOS_FILTRE } from "../lib/alarm-eslesme.ts";
import type { Talep } from "../lib/data.ts";

/** Testlerde kullanılan temel talep; her test yalnız ilgilendiği alanı ezer. */
function talep(ek: Partial<Talep> = {}): Talep {
  return {
    id: "t1",
    baslik: "Nokia 3310 kutulu arıyorum",
    marka: "Nokia",
    aciklama: "Orijinal kutulu, çalışır durumda olsun.",
    fiyatNum: 3500,
    kategori: "Elektronik",
    il: "İstanbul",
    ilce: "Kadıköy",
    sunum: 0,
    gun: 30,
    durum: "Az kullanılmış",
    eklendi: 0,
    sahibi: "ayse.demir",
    ...ek,
  };
}

test("boş filtre her talebe uyar", () => {
  assert.equal(talepEslesiyorMu(BOS_FILTRE, talep()), true);
});

test("kategori tutmuyorsa eşleşmez", () => {
  const f = { ...BOS_FILTRE, kategori: "Saat" };
  assert.equal(talepEslesiyorMu(f, talep()), false);
});

test("marka kesin koşuldur", () => {
  assert.equal(
    talepEslesiyorMu({ ...BOS_FILTRE, marka: "Samsung" }, talep()),
    false,
  );
  assert.equal(
    talepEslesiyorMu({ ...BOS_FILTRE, marka: "nokia" }, talep()),
    true,
    "büyük/küçük harf ayrımı olmamalı",
  );
});

test("yıl ve renk esnektir: eşleşmeyi engellemez", () => {
  const f = { ...BOS_FILTRE, yil: "2020", renk: "Mavi" };
  assert.equal(talepEslesiyorMu(f, talep({ yil: "2015", renk: "Siyah" })), true);
});

test("anahtar kelimelerden biri tutması yeter", () => {
  const f = { ...BOS_FILTRE, kelimeler: ["şarj", "kutulu"] };
  assert.equal(talepEslesiyorMu(f, talep()), true);
  assert.equal(
    talepEslesiyorMu({ ...BOS_FILTRE, kelimeler: ["defolu"] }, talep()),
    false,
  );
});

test("fiyat aralığı dışındaki talep elenir", () => {
  const f = { ...BOS_FILTRE, minFiyat: 1000, maxFiyat: 3000 };
  assert.equal(talepEslesiyorMu(f, talep()), false);
  assert.equal(talepEslesiyorMu({ ...f, maxFiyat: 4000 }, talep()), true);
});

test("konum: ilçe boşsa ilin tamamı kapsanır", () => {
  const f = { ...BOS_FILTRE, konumlar: [{ il: "İstanbul", ilce: "" }] };
  assert.equal(talepEslesiyorMu(f, talep()), true);
  const f2 = { ...BOS_FILTRE, konumlar: [{ il: "İstanbul", ilce: "Şile" }] };
  assert.equal(talepEslesiyorMu(f2, talep()), false);
});

test("alıcı 'Hepsi' dediyse durum alarmı yine uyar", () => {
  const f = { ...BOS_FILTRE, durumlar: ["Yenilenmiş"] };
  assert.equal(talepEslesiyorMu(f, talep({ durum: "Hepsi" })), true);
  assert.equal(talepEslesiyorMu(f, talep({ durum: "Kullanılmış" })), false);
});

test("alıcı defoluyu kabul ediyorsa defosuz alarmına da düşer", () => {
  const f = { ...BOS_FILTRE, defolar: ["defosuz"] };
  assert.equal(talepEslesiyorMu(f, talep({ defoKabul: true })), true);
  assert.equal(talepEslesiyorMu(f, talep({ defoKabul: false })), true);
  const f2 = { ...BOS_FILTRE, defolar: ["defolu"] };
  assert.equal(talepEslesiyorMu(f2, talep({ defoKabul: false })), false);
});

test("muadil: alıcı kabul ediyorsa her iki alarma da uyar", () => {
  assert.equal(
    talepEslesiyorMu({ ...BOS_FILTRE, muadil: true }, talep({ muadilKabul: true })),
    true,
  );
  assert.equal(
    talepEslesiyorMu({ ...BOS_FILTRE, muadil: true }, talep({ muadilKabul: false })),
    false,
  );
  assert.equal(
    talepEslesiyorMu({ ...BOS_FILTRE, muadil: false }, talep({ muadilKabul: true })),
    true,
  );
});

// ── Türkçe yazım farkları ────────────────────────────────────────────
// `toLocaleLowerCase("tr")` I → ı, İ → i yapar; aynı markanın farklı
// yazımları eşleşmiyor ve alarm sessizce hiç ateşlenmiyordu.

test("marka farklı yazımla da eşleşir (IPHONE / iPhone)", () => {
  assert.equal(
    talepEslesiyorMu(
      { ...BOS_FILTRE, marka: "IPHONE" },
      talep({ marka: "iPhone" }),
    ),
    true,
  );
});

test("il farklı yazımla da eşleşir (Istanbul / İstanbul)", () => {
  assert.equal(
    talepEslesiyorMu(
      { ...BOS_FILTRE, konumlar: [{ il: "Istanbul", ilce: "" }] },
      talep({ il: "İstanbul", ilce: "Kadıköy" }),
    ),
    true,
  );
});

test("ilçe Türkçe karakterle de eşleşir (Kadikoy / Kadıköy)", () => {
  assert.equal(
    talepEslesiyorMu(
      { ...BOS_FILTRE, konumlar: [{ il: "İstanbul", ilce: "Kadikoy" }] },
      talep({ il: "İstanbul", ilce: "Kadıköy" }),
    ),
    true,
  );
});

test("anahtar kelime büyük harfle de bulunur", () => {
  assert.equal(
    talepEslesiyorMu(
      { ...BOS_FILTRE, kelimeler: ["KUTULU"] },
      talep({ aciklama: "Orijinal kutulu, çalışır durumda olsun." }),
    ),
    true,
  );
});

test("gerçekten farklı marka yine eşleşmez", () => {
  assert.equal(
    talepEslesiyorMu(
      { ...BOS_FILTRE, marka: "Samsung" },
      talep({ marka: "Nokia" }),
    ),
    false,
  );
});
