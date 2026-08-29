import { NextResponse } from "next/server";
import { kimlikDogrula } from "@/lib/kimlik";
import {
  OTURUM_CEREZI,
  OTURUM_SURESI_MS,
  oturumAnahtariVarMi,
  oturumImzala,
} from "@/lib/oturum-imza";
import { istekOturumu } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * Oturum açma ve kapatma.
 *
 * Bu uç, imzalı çerezin DAĞITILDIĞI tek yerdir. `lib/oturum-imza.ts` çerezin
 * sahte olmamasını garantiler; burası da çerezi hak edip etmediğini
 * doğrular. İkisi ayrı sorular ve ikisi de gerekli.
 */

/** Çerezi yanıta basar. */
function cerezBas(yanit: NextResponse, deger: string, omurMs: number) {
  yanit.cookies.set({
    name: OTURUM_CEREZI,
    value: deger,
    // JavaScript'ten okunamaz: eski çerez `document.cookie` ile yazılıyordu,
    // bu açığın kapanması için çerezin istemciye hiç görünmemesi gerekir.
    httpOnly: true,
    // Yerelde HTTPS yok; üretimde çerez yalnızca şifreli bağlantıda gider.
    secure: process.env.NODE_ENV === "production",
    // Siteler arası POST'la oturum taşınmasın (proxy.ts'teki köken
    // kontrolüyle birlikte ikinci katman).
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(omurMs / 1000),
  });
}

/**
 * Oturumdaki hesap — arayüz "giriş yapılmış mı?" sorusunu buradan sorar.
 *
 * `istekOturumu()` kullanılır, `istekKullaniciAdi()` DEĞİL: bu ucun tam
 * amacı "oturum var mı?" sorusuna yanıt vermek, dolayısıyla oturumsuzluk
 * burada normaldir. Hata fırlatan sürümle çağrılınca giriş yapmamış
 * ziyaretçiye 500 dönüyordu.
 */
export async function GET() {
  return NextResponse.json({ kullanici: await istekOturumu() });
}

export async function POST(istek: Request) {
  if (!oturumAnahtariVarMi())
    return NextResponse.json(
      {
        hata:
          "Sunucuda oturum imza anahtarı tanımlı değil; giriş kapalı. BULBANA_OTURUM_ANAHTARI ayarlanmalı.",
      },
      { status: 503 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const kullanici = tekSatir(g.kullanici, 60);
  const parola = typeof g.parola === "string" ? g.parola : "";

  if (!kullanici || !parola)
    return NextResponse.json(
      { hata: "Kullanıcı adı ve parola gerekli." },
      { status: 400 },
    );

  // Parola deneme tavanı. Anahtar kullanıcı adı: bir hesabın parolası
  // sınırsız denenememeli. (Gerçek dağıtımda kenar katmanında IP başına
  // sınır da olmalı — bkz. lib/hiz-siniri.ts.)
  const hiz = hizSinirla(`giris:${kullanici}`, 10, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla giriş denemesi. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  if (!(await kimlikDogrula(kullanici, parola)))
    // Gerekçe ayrıştırılmaz: "kullanıcı yok" ile "parola yanlış" ayrımı
    // yalnızca hesap toplamaya yarar (bkz. lib/kimlik.ts).
    return NextResponse.json(
      { hata: "Kullanıcı adı ya da parola hatalı." },
      { status: 401 },
    );

  const cerez = oturumImzala(kullanici);
  if (!cerez)
    return NextResponse.json(
      { hata: "Oturum açılamadı." },
      { status: 503 },
    );

  const yanit = NextResponse.json({ kullanici });
  cerezBas(yanit, cerez, OTURUM_SURESI_MS);
  return yanit;
}

/** Çıkış: çerezi hemen geçersiz kılar. */
export async function DELETE() {
  const yanit = NextResponse.json({ cikildi: true });
  cerezBas(yanit, "", 0);
  return yanit;
}
