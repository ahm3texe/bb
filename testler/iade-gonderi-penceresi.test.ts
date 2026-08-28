import { test } from "node:test";
import assert from "node:assert/strict";
import { iadeAdimi } from "../lib/anlasma.ts";
import type { Anlasma, IadeSureci } from "../lib/anlasma.ts";

/*
 * Bu dosya bir dönem `iade-adres-penceresi.test.ts` idi ve "satıcının
 * adresi alıcıya hangi adımlarda açılır" kuralını sınıyordu. Adres
 * paylaşımı tamamen kaldırıldı (bkz. lib/kargo-gonderi.ts), yani o kural
 * artık yok — testin dayandığı `adresAcikMi` yardımcısı da yalnızca test
 * dosyasının içinde yaşayan, hiçbir üretim kodunun kullanmadığı bir
 * fonksiyona dönüşmüştü. Geçen bir test, sınadığı kural ortadan
 * kalktığında yanlış bir güven verir.
 *
 * Adım penceresi ise hâlâ gerçek: iade GÖNDERİSİ yalnızca
 * "iade-kargosu-bekleniyor" adımında oluşturulabilir — `gonderiHazirla`
 * tam olarak bu koşula bakar. Eski dosyanın asıl değeri buydu, o yüzden
 * iddialar korunup gerekçe yenilendi.
 */

const T = new Date(0).toISOString();

function itirazli(iade: IadeSureci): Anlasma {
  return {
    sunumId: "s1", talepId: "t1", alici: "alici", satici: "satici",
    tutar: 1000, kabulEden: "alici", kabulZamani: T, kargoSaat: 18,
    siparisKodu: "SP-100001",
    odemeZamani: T, kargoZamani: T, teslimZamani: T, onay: "hayir", iade,
  };
}

/** `lib/depo.ts` → `gonderiHazirla` bu koşulu kullanıyor. */
const gonderiAcikMi = (a: Anlasma) =>
  iadeAdimi(a) === "iade-kargosu-bekleniyor";

test("karar beklenirken iade gönderisi oluşturulamaz", () => {
  assert.equal(gonderiAcikMi(itirazli({})), false);
});

test("alıcı haklı bulunduysa iade gönderisi açılır", () => {
  assert.equal(
    gonderiAcikMi(itirazli({ karar: "alici-hakli", kararZamani: T })),
    true,
  );
});

test("ürün yola çıktıktan sonra ikinci gönderi oluşturulamaz", () => {
  const a = itirazli({ karar: "alici-hakli", kararZamani: T, kargoZamani: T });
  assert.equal(gonderiAcikMi(a), false);
});

test("ürün satıcıya ulaştıktan sonra kapalı", () => {
  const a = itirazli({
    karar: "alici-hakli", kararZamani: T, kargoZamani: T, kargoTeslimZamani: T,
  });
  assert.equal(gonderiAcikMi(a), false);
});

test("süreç tamamlandıktan sonra kapalı", () => {
  const a = itirazli({
    karar: "alici-hakli", kargoZamani: T, kargoTeslimZamani: T,
    saticiOnay: "evet", iadeZamani: T,
  });
  assert.equal(gonderiAcikMi(a), false);
});

test("alıcı ürünü göndermeyip dava kapandıysa kapalı", () => {
  // Süre aşıldıktan sonra alıcı geriye dönük gönderi oluşturamamalı:
  // süreç satıcı lehine kapandı, para ona geçti.
  const a = itirazli({
    karar: "alici-hakli", kararZamani: T, kargoSuresiAsildi: T,
  });
  assert.equal(gonderiAcikMi(a), false);
});

test("satıcı baştan haklı bulunduysa hiç açılmaz", () => {
  assert.equal(
    gonderiAcikMi(itirazli({ karar: "satici-hakli", kararZamani: T })),
    false,
  );
});
