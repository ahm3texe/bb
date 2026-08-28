import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ortalamaYanitSaati,
  ortalamaKargoSaati,
  sureMetni,
} from "../lib/olcum.ts";
import type { Mesaj } from "../lib/depo.ts";
import type { Anlasma } from "../lib/anlasma.ts";

// Bu iki metrik ("Yanıt süresi · ~1 saat", "Ort. kargolama · 1 gün") bir
// dönem profilde KODA GÖMÜLÜ sabitlerdi; ölçen hiçbir kod yoktu. Testler
// hem hesabın doğruluğunu hem de "ölçüm yoksa null" kuralını bağlar.

const SAAT = 3600_000;

function mesaj(ek: Partial<Mesaj> & { gonderen: string; zaman: string }): Mesaj {
  return { id: "m", sohbetId: "s1", metin: "x", ...ek };
}

/** t saat sonrası — okunur kurulum için. */
function saat(n: number): string {
  return new Date(Date.parse("2026-08-20T09:00:00.000Z") + n * SAAT).toISOString();
}

// ── Yanıt süresi ──────────────────────────────────────────────────────

test("yanıt süresi karşı tarafın mesajıyla cevap arasındaki farktır", () => {
  const m = [
    mesaj({ gonderen: "alici", zaman: saat(0) }),
    mesaj({ gonderen: "satici", zaman: saat(2) }),
  ];
  assert.equal(ortalamaYanitSaati(m, "satici"), 2);
});

test("üst üste gelen mesajlar TEK bekleyiş sayılır, süre ilkinden işler", () => {
  const m = [
    mesaj({ gonderen: "alici", zaman: saat(0) }),
    mesaj({ gonderen: "alici", zaman: saat(1) }),
    mesaj({ gonderen: "alici", zaman: saat(2) }),
    mesaj({ gonderen: "satici", zaman: saat(4) }),
  ];
  // İlk mesajdan itibaren 4 saat — son mesajdan 2 saat DEĞİL.
  assert.equal(ortalamaYanitSaati(m, "satici"), 4);
});

test("birden fazla bekleyişin ortalaması alınır", () => {
  const m = [
    mesaj({ gonderen: "alici", zaman: saat(0) }),
    mesaj({ gonderen: "satici", zaman: saat(2) }),
    mesaj({ gonderen: "alici", zaman: saat(3) }),
    mesaj({ gonderen: "satici", zaman: saat(9) }),
  ];
  assert.equal(ortalamaYanitSaati(m, "satici"), 4); // (2 + 6) / 2
});

test("kendi başlattığı sohbet ölçüme girmez", () => {
  // Kullanıcı yazmış, karşı taraf cevaplamış: burada BEKLEYEN o değil.
  const m = [
    mesaj({ gonderen: "satici", zaman: saat(0) }),
    mesaj({ gonderen: "alici", zaman: saat(5) }),
  ];
  assert.equal(ortalamaYanitSaati(m, "satici"), null);
});

test("yanıtlanmamış mesaj ortalamayı düşürmez ama ölçüme de girmez", () => {
  const m = [
    mesaj({ gonderen: "alici", zaman: saat(0) }),
    mesaj({ gonderen: "satici", zaman: saat(1) }),
    // Sohbetin sonundaki bu mesaj hâlâ cevapsız: süresi belli değil.
    mesaj({ gonderen: "alici", zaman: saat(2) }),
  ];
  assert.equal(ortalamaYanitSaati(m, "satici"), 1);
});

test("ayrı sohbetler birbirine karışmaz", () => {
  const m = [
    mesaj({ sohbetId: "s1", gonderen: "alici", zaman: saat(0) }),
    mesaj({ sohbetId: "s2", gonderen: "baska", zaman: saat(1) }),
    mesaj({ sohbetId: "s1", gonderen: "satici", zaman: saat(2) }),
    mesaj({ sohbetId: "s2", gonderen: "satici", zaman: saat(7) }),
  ];
  // s1'de 2 saat, s2'de 6 saat → ortalama 4.
  assert.equal(ortalamaYanitSaati(m, "satici"), 4);
});

test("hiç mesaj yoksa null döner — sıfır DEĞİL", () => {
  assert.equal(ortalamaYanitSaati([], "satici"), null);
});

test("bir saatin altındaki yanıt 0 değil 1 saat gösterilir", () => {
  const m = [
    mesaj({ gonderen: "alici", zaman: saat(0) }),
    mesaj({ gonderen: "satici", zaman: saat(0.2) }),
  ];
  // "0 saat" ekranda ölçüm yokmuş gibi durur; en az 1.
  assert.equal(ortalamaYanitSaati(m, "satici"), 1);
});

// ── Kargolama süresi ──────────────────────────────────────────────────

function anlasma(ek: Partial<Anlasma>): Anlasma {
  return {
    sunumId: "s-1",
    talepId: "t1",
    alici: "alici",
    satici: "satici",
    kabulEden: "alici",
    kabulZamani: saat(0),
    kargoSaat: 72,
    tutar: 1000,
    ...ek,
  } as Anlasma;
}

test("kargolama süresi ödemeden kargoya kadar geçen süredir", () => {
  const a = [anlasma({ odemeZamani: saat(0), kargoZamani: saat(5) })];
  assert.equal(ortalamaKargoSaati(a, "satici"), 5);
});

test("birden fazla gönderinin ortalaması alınır", () => {
  const a = [
    anlasma({ sunumId: "a", odemeZamani: saat(0), kargoZamani: saat(4) }),
    anlasma({ sunumId: "b", odemeZamani: saat(0), kargoZamani: saat(8) }),
  ];
  assert.equal(ortalamaKargoSaati(a, "satici"), 6);
});

test("kargolanmamış sipariş ölçüme girmez", () => {
  const a = [
    anlasma({ sunumId: "a", odemeZamani: saat(0), kargoZamani: saat(4) }),
    anlasma({ sunumId: "b", odemeZamani: saat(0) }), // henüz kargoda değil
  ];
  assert.equal(ortalamaKargoSaati(a, "satici"), 4);
});

test("başkasının gönderisi sayılmaz", () => {
  const a = [
    anlasma({ satici: "baskasi", odemeZamani: saat(0), kargoZamani: saat(9) }),
  ];
  assert.equal(ortalamaKargoSaati(a, "satici"), null);
});

test("hiç gönderi yoksa null döner — %0 mantığıyla aynı gerekçe", () => {
  assert.equal(ortalamaKargoSaati([], "satici"), null);
});

// ── Ekran metni ───────────────────────────────────────────────────────

test("süre metni saat ve güne çevrilir, ölçüm yoksa tire", () => {
  assert.equal(sureMetni(null), "—");
  assert.equal(sureMetni(3), "3 saat");
  assert.equal(sureMetni(23), "23 saat");
  assert.equal(sureMetni(24), "1 gün");
  assert.equal(sureMetni(72), "3 gün");
});
