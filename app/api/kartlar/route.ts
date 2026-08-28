import { NextResponse } from "next/server";
import { kartlarOku, kartEkle, metinKimlik } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import {
  kartMarkasi,
  kartNumarasiGecerli,
  sktGecerliMi,
  EN_FAZLA_KART,
} from "@/lib/kart";
import type { KayitliKart } from "@/lib/kart";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/** Oturumdaki hesabın kayıtlı kartları. */
export async function GET() {
  return NextResponse.json({ kartlar: await kartlarOku(await istekKullaniciAdi()) });
}

/**
 * Yeni kart kaydeder.
 *
 * Numara doğrulanır ama SAKLANMAZ: kayda yalnızca marka ve son dört hane
 * geçer. CVV hiç istenmez — kayıtlı karttan ödeme yapılırken sorulur ve o
 * da hiçbir yere yazılmaz.
 */
export async function POST(istek: Request) {
  let govde: Record<string, unknown>;
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const numara = tekSatir(govde.numara, 25);
  const isim = tekSatir(govde.isim, 60);
  const skt = tekSatir(govde.skt, 7);

  const hatalar: string[] = [];
  if (!kartNumarasiGecerli(numara)) hatalar.push("Kart numarası geçersiz.");
  if (isim.length < 5) hatalar.push("Kart üzerindeki ismi gir.");
  if (!/^\d{2}\/\d{4}$/.test(skt))
    hatalar.push("Son kullanma tarihi AA/YYYY olmalı.");
  else if (!sktGecerliMi(skt))
    hatalar.push("Son kullanma tarihi geçersiz ya da geçmiş.");
  if (hatalar.length)
    return NextResponse.json({ hata: hatalar[0], hatalar }, { status: 400 });

  const kullanici = await istekKullaniciAdi();
  const kart: KayitliKart = {
    id: metinKimlik("kart"),
    kullanici,
    marka: kartMarkasi(numara),
    son4: numara.replace(/\D/g, "").slice(-4),
    skt,
    isim,
    varsayilan: govde.varsayilan === true,
  };

  const sonuc = await kartEkle(kart);
  if (sonuc === "sinir-doldu")
    return NextResponse.json(
      {
        hata: `En fazla ${EN_FAZLA_KART} kart kaydedebilirsin. Yeni kart eklemek için önce birini kaldır.`,
      },
      { status: 409 },
    );

  return NextResponse.json({ kart: sonuc }, { status: 201 });
}
