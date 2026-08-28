// ── Sunum kayıtlarından DONMUŞ satıcı alanlarını temizler ─────────────
//
// Sunum kaydı bir dönem satıcı hakkındaki değerleri gönderim anında içine
// yazıyordu. İki ayrı sorun vardı:
//
//   • `saticiTipi` ve `yanitSaat` HİÇ ölçülmüyordu; her sunuma sabit
//     "Bireysel" ve 2 basılıyor, alıcı bunları karşılaştırma tablosunda
//     gerçek bilgi sanıyordu.
//   • `zamanindaKargo` ölçülüyordu ama kayda DONUYORDU: satıcı sonradan
//     on gönderi daha yapsa bile alıcı gönderim anındaki yüzdeyi
//     görüyordu.
//
// Bugün üçü de kayda yazılmıyor; satıcı metrikleri OKUMA ANINDA
// hesaplanıyor (bkz. lib/veri.ts → `saticiMetrikleriniTazele`) ve ölçüm
// yoksa arayüz "—" gösteriyor. `yanitSaat` de artık gerçekten ölçülüyor
// (bkz. lib/olcum.ts) — ama eski kayıtlarda gömülü değerler kaldı.
//
// Okuma katmanı bu alanları zaten üzerine yazıyor, yani ekranda yanlış bir
// şey görünmez; betik dosyadaki ölü veriyi temizler ki kaydın kendisi de
// tek gerçeği söylesin.
//
// Idempotenttir: ikinci çalıştırmada değişiklik bulamaz ve dosyaya dokunmaz.
//
//   npm run temizle:sunum -- --kuru   → yalnızca rapor, yazma yok
//   npm run temizle:sunum             → yedek al, temizle
//
// Not: yalnızca alan siler, kayıt silmez.

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Kayda YAZILMAMASI gereken, okuma anında türetilen satıcı alanları.
 *
 * `satis` listede DEĞİL: tip onu zorunlu tutuyor (`GelenSunum.satis:
 * number`) ve okuma katmanı her seferinde üzerine yazıyor. Alanı silmek
 * kaydı tipe aykırı hâle getirirdi.
 */
const DONMUS_ALANLAR = ["saticiTipi", "yanitSaat", "zamanindaKargo"] as const;

const DOSYA = path.join(process.cwd(), ".veri", "sunumlar.json");

async function main() {
  const kuru = process.argv.includes("--kuru");

  let ham: string;
  try {
    ham = await fs.readFile(DOSYA, "utf8");
  } catch {
    console.log(`Dosya yok, yapacak bir şey yok: ${DOSYA}`);
    return;
  }

  const kayitlar: Record<string, unknown>[] = JSON.parse(ham);
  if (!Array.isArray(kayitlar)) {
    console.error("Beklenen biçim bir dizi değil; dosyaya dokunulmadı.");
    process.exitCode = 1;
    return;
  }

  // Hangi kayıtta hangi alan var — rapor bunun üzerinden yazılır.
  const etkilenen = kayitlar.filter((k) =>
    DONMUS_ALANLAR.some((alan) => alan in k),
  );

  console.log(`Toplam kayıt : ${kayitlar.length}`);
  console.log(`Temizlenecek : ${etkilenen.length}`);
  for (const k of etkilenen) {
    const bulunan = DONMUS_ALANLAR.filter((a) => a in k)
      .map((a) => `${a}=${JSON.stringify(k[a])}`)
      .join(", ");
    console.log(`  • ${k.id} (${k.satici}) → ${bulunan}`);
  }

  if (!etkilenen.length) {
    console.log("Temiz; dosyaya dokunulmadı.");
    return;
  }
  if (kuru) {
    console.log("\n--kuru verildi: hiçbir şey yazılmadı.");
    return;
  }

  // Yedek önce: geri dönülemez bir şey yapmadan önce elde kopya olsun.
  const damga = new Date().toISOString().replace(/[:.]/g, "-");
  const yedek = `${DOSYA}.${damga}.yedek`;
  await fs.writeFile(yedek, ham, "utf8");

  for (const k of kayitlar)
    for (const alan of DONMUS_ALANLAR) delete k[alan];

  // depo.ts ile aynı desen: geçici dosyaya yaz, sonra taşı — yazma
  // yarıda kesilirse asıl dosya bozulmadan kalır.
  const gecici = `${DOSYA}.tmp`;
  await fs.writeFile(gecici, JSON.stringify(kayitlar, null, 2), "utf8");
  await fs.rename(gecici, DOSYA);

  console.log(`\n${etkilenen.length} kayıt temizlendi.`);
  console.log(`Yedek: ${path.basename(yedek)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
