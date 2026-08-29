import { NextResponse } from "next/server";
import { anlasmaGetir, anlasmaOlustur } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/** Sohbetin siparişi: /api/anlasmalar?sunum=<sunumId> */
export async function GET(istek: Request) {
  const sunumId = new URL(istek.url).searchParams.get("sunum");
  if (!sunumId)
    return NextResponse.json({ hata: "Sunum kimliği gerekli." }, { status: 400 });

  const anlasma = await anlasmaGetir(sunumId);
  if (!anlasma) return NextResponse.json({ anlasma: null });

  // Sipariş bilgisi yalnızca tarafların işi.
  const kim = await istekKullaniciAdi();
  if (kim !== anlasma.alici && kim !== anlasma.satici)
    return NextResponse.json({ hata: "Bu siparişin tarafı değilsin." }, { status: 403 });

  return NextResponse.json({ anlasma });
}

/**
 * Teklifin kabulü — siparişi açar.
 *
 * TUTAR GÖVDEDEN OKUNMAZ. Anlaşılan bedel sohbetteki son karşı tekliften
 * türetilir (bkz. lib/depo.ts → anlasilanTutar). Eskiden istemcinin
 * gönderdiği sayı doğrudan kaydediliyordu; tutar komisyon, bakiye ve IBAN
 * aktarımı zincirinin başı olduğu için beyana bırakılamaz.
 */
export async function POST(istek: Request) {
  let govde: { sunumId?: unknown };
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const sunumId = typeof govde.sunumId === "string" ? govde.sunumId : "";
  if (!sunumId)
    return NextResponse.json({ hata: "Sunum kimliği gerekli." }, { status: 400 });

  const sonuc = await anlasmaOlustur(sunumId, await istekKullaniciAdi());
  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sunum bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json({ hata: "Bu pazarlığın tarafı değilsin." }, { status: 403 });
  if (sonuc === "zaten-var")
    return NextResponse.json({ hata: "Bu sunum için anlaşma zaten açık." }, { status: 409 });
  if (sonuc === "talepte-suren-siparis")
    return NextResponse.json(
      {
        hata:
          "Bu ilanda süren bir sipariş var. Bir ilan aynı anda tek siparişe dönüşebilir.",
      },
      { status: 409 },
    );

  return NextResponse.json({ anlasma: sonuc }, { status: 201 });
}
