import { NextResponse } from "next/server";
import { kullanicilar, getKullanici } from "@/lib/kullanicilar";
import {
  OTURUM_CEREZI,
  OTURUM_SURESI_MS,
  oturumImzala,
} from "@/lib/oturum-imza";
import { onizlemeGecisiAcikMi } from "@/lib/onizleme";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * ÖNİZLEME: parola sormadan demo hesapları arasında geçiş.
 *
 * Prototipi alıcı ve satıcı gözünden hızlıca denemek için var. Yalnızca
 * `BULBANA_ONIZLEME_GECISI=1` iken çalışır; değişken yoksa uç 404 döner —
 * yani kapalıyken varlığı bile belli olmaz.
 *
 * Çerez yine SUNUCUDA imzalanır ve `httpOnly` basılır: istemci kendi
 * kimliğini hâlâ yazamıyor. Atlanan tek şey parola sorusu.
 *
 * ÜRETİMDE AÇILMAMALI (bkz. lib/onizleme.ts).
 */
export async function GET() {
  if (!onizlemeGecisiAcikMi())
    return NextResponse.json({ hata: "Bulunamadı." }, { status: 404 });

  // Geçiş çubuğunun listeleyeceği hesaplar.
  return NextResponse.json({
    hesaplar: kullanicilar.map((k) => ({
      kullanici: k.kullanici,
      ad: k.ad,
      harf: k.harf,
    })),
  });
}

export async function POST(istek: Request) {
  if (!onizlemeGecisiAcikMi())
    return NextResponse.json({ hata: "Bulunamadı." }, { status: 404 });

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const kullanici = tekSatir(g.kullanici, 60);

  // Yalnızca tohum verisindeki demo hesaplar. Serbest metin kabul etmek,
  // ileride gerçek kullanıcılar eklendiğinde herhangi bir hesaba parolasız
  // giriş anlamına gelirdi.
  if (!kullanici || !getKullanici(kullanici))
    return NextResponse.json(
      { hata: "Bu hesap önizleme listesinde değil." },
      { status: 400 },
    );

  const cerez = oturumImzala(kullanici);
  if (!cerez)
    return NextResponse.json(
      {
        hata:
          "Oturum imza anahtarı tanımlı değil; BULBANA_OTURUM_ANAHTARI ayarlanmalı.",
      },
      { status: 503 },
    );

  const yanit = NextResponse.json({ kullanici });
  yanit.cookies.set({
    name: OTURUM_CEREZI,
    value: cerez,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(OTURUM_SURESI_MS / 1000),
  });
  return yanit;
}
