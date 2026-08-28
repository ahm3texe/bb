// ── Hesap parolası belirler ───────────────────────────────────────────
//
// Kayıt (self-servis üyelik) akışı henüz yok; hesaplar `lib/kullanicilar.ts`
// içindeki sabit listeden geliyor. Bu betik o hesaplara parola verir —
// yani giriş yapılabilir hâle getirir.
//
//   npm run parola -- melih.k                 → parolayı sorar
//   npm run parola -- melih.k 'gizli-parola'  → doğrudan verir
//   npm run parola -- --liste                 → parolası olan hesapları sayar
//
// Parola HİÇBİR ZAMAN düz metin saklanmaz; kayda yalnızca scrypt türevi
// girer (bkz. lib/parola.ts).

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { kimlikOku, kimlikYaz } from "../lib/depo";
import { kullanicilar, getKullanici } from "../lib/kullanicilar";
import { parolaHashle, parolaKuralHatasi } from "../lib/parola";

async function liste() {
  console.log("Hesap                Parola");
  console.log("───────────────────  ──────────");
  for (const k of kullanicilar) {
    const kayit = await kimlikOku(k.kullanici);
    console.log(
      `${k.kullanici.padEnd(19)}  ${kayit ? "tanımlı" : "YOK — giriş yapamaz"}`,
    );
  }
}

async function main() {
  const argumanlar = process.argv.slice(2);

  if (argumanlar.includes("--liste")) {
    await liste();
    return;
  }

  const kullanici = argumanlar[0];
  if (!kullanici) {
    console.error("Kullanım: npm run parola -- <kullanıcı> [parola]");
    console.error("          npm run parola -- --liste");
    process.exitCode = 1;
    return;
  }

  if (!getKullanici(kullanici)) {
    console.error(`"${kullanici}" diye bir hesap yok.`);
    console.error(
      `Tanımlı hesaplar: ${kullanicilar.map((k) => k.kullanici).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  let parola = argumanlar[1];
  if (!parola) {
    const soru = createInterface({ input: stdin, output: stdout });
    // Not: terminal yankısı kapatılmıyor; kabuk geçmişine düşmemesi için
    // parolayı komut satırına yazmaktansa buraya yazmak yine de iyidir.
    parola = await soru.question(`"${kullanici}" için yeni parola: `);
    soru.close();
  }

  const hata = parolaKuralHatasi(parola);
  if (hata) {
    console.error(hata);
    process.exitCode = 1;
    return;
  }

  await kimlikYaz(kullanici, await parolaHashle(parola));
  console.log(`✓ "${kullanici}" hesabının parolası ayarlandı.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
