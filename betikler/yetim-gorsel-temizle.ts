// ── Yetim yüklemeleri temizler ────────────────────────────────────────
//
// `/api/yukle` dosyayı diske HEMEN yazar; kayda bağlanması ise talep ya da
// sunum gönderildiğinde olur. Arada kullanıcı formu terk ederse dosya
// diskte kalır ve hiçbir kaydın işaret etmediği bir yetim olur.
//
// Talep silindiğinde (`talepSil`) ve düzenlemede listeden düşen görseller
// için (`talepGuncelle`) temizlik zaten otomatik. Bu betik yalnızca hiç
// kayda bağlanmamış dosyaları toplar.
//
//   npm run temizle:gorsel -- --kuru       → yalnızca rapor
//   npm run temizle:gorsel                 → 24 saatten eski yetimleri sil
//   npm run temizle:gorsel -- --saat 0     → yaş sınırı olmadan sil
//
// YAŞ SINIRI ÖNEMLİ: kullanıcı şu anda formu dolduruyor olabilir. Dosyası
// yüklendi ama talebi henüz göndermedi — o dosya "yetim" görünür. Varsayılan
// 24 saatlik pencere bu yarışı engeller.

import { promises as fs } from "node:fs";
import path from "node:path";

const YUKLEME = path.join(process.cwd(), "public", "yuklemeler");
const VERI = path.join(process.cwd(), ".veri");

/** Görsel yolu taşıyan kayıt dosyaları. */
const KAYIT_DOSYALARI = ["talepler.json", "sunumlar.json"];

function sayiArgumani(ad: string, varsayilan: number): number {
  const i = process.argv.indexOf(`--${ad}`);
  if (i === -1) return varsayilan;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) && v >= 0 ? v : varsayilan;
}

/** Kayıtlarda geçen tüm dosya adları. */
async function referanslar(): Promise<Set<string>> {
  const adlar = new Set<string>();
  for (const dosya of KAYIT_DOSYALARI) {
    let ham: string;
    try {
      ham = await fs.readFile(path.join(VERI, dosya), "utf8");
    } catch {
      continue;
    }
    const kayitlar = JSON.parse(ham);
    if (!Array.isArray(kayitlar)) continue;
    for (const k of kayitlar)
      for (const g of k?.gorseller ?? [])
        if (typeof g === "string") adlar.add(path.basename(g));
  }
  return adlar;
}

async function main() {
  const kuru = process.argv.includes("--kuru");
  const saat = sayiArgumani("saat", 24);
  const esik = Date.now() - saat * 3600_000;

  let diskte: string[];
  try {
    diskte = await fs.readdir(YUKLEME);
  } catch {
    console.log(`Yükleme klasörü yok, yapacak bir şey yok: ${YUKLEME}`);
    return;
  }

  const bagli = await referanslar();
  const yetimler: { ad: string; yas: number }[] = [];
  let genc = 0;

  for (const ad of diskte) {
    if (bagli.has(ad)) continue;
    const bilgi = await fs.stat(path.join(YUKLEME, ad));
    if (bilgi.mtimeMs > esik) {
      // Henüz gönderilmemiş bir formun dosyası olabilir; dokunma.
      genc++;
      continue;
    }
    yetimler.push({
      ad,
      yas: Math.round((Date.now() - bilgi.mtimeMs) / 3600_000),
    });
  }

  console.log(`Diskteki dosya : ${diskte.length}`);
  console.log(`Kayda bağlı    : ${diskte.length - yetimler.length - genc}`);
  console.log(`Yetim (>${saat}s)  : ${yetimler.length}`);
  if (genc) console.log(`Bekletilen     : ${genc} (${saat} saatten yeni)`);
  for (const y of yetimler) console.log(`  • ${y.ad} (${y.yas} saat)`);

  if (!yetimler.length) {
    console.log("Silinecek bir şey yok.");
    return;
  }
  if (kuru) {
    console.log("\n--kuru verildi: hiçbir şey silinmedi.");
    return;
  }

  for (const y of yetimler)
    await fs.unlink(path.join(YUKLEME, y.ad)).catch(() => undefined);
  console.log(`\n${yetimler.length} yetim dosya silindi.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
