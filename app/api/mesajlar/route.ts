import { NextResponse } from "next/server";
import {
  mesajlarOku,
  mesajEkle,
  metinKimlik,
  mesajBildirimiGonder,
} from "@/lib/depo";
import { sohbetTaraflari } from "@/lib/veri";
import { paraTutari, MAX_FIYAT } from "@/lib/para";
import { cokSatir } from "@/lib/metin";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, DAKIKA } from "@/lib/hiz-siniri";
import type { Mesaj } from "@/lib/depo";

export const dynamic = "force-dynamic";

/** GET /api/mesajlar?sohbet=<id> */
export async function GET(istek: Request) {
  const sohbetId = new URL(istek.url).searchParams.get("sohbet") ?? "";
  if (!sohbetId) {
    return NextResponse.json({ hata: "Sohbet belirtilmedi." }, { status: 400 });
  }
  const kisiler = await sohbetTaraflari(sohbetId);
  if (!kisiler) {
    return NextResponse.json({ hata: "Sohbet bulunamadı." }, { status: 404 });
  }
  // Sohbeti yalnızca tarafları okuyabilir.
  if (!kisiler.includes(await istekKullaniciAdi())) {
    return NextResponse.json(
      { hata: "Bu sohbete erişimin yok." },
      { status: 403 },
    );
  }
  return NextResponse.json({ mesajlar: await mesajlarOku(sohbetId) });
}

export async function POST(istek: Request) {
  // Sohbet spam'ini engelle: dakikada en fazla 30 mesaj.
  const gonderen = await istekKullaniciAdi();
  const hiz = hizSinirla(`mesaj:${gonderen}`, 30, DAKIKA);
  if (!hiz.izin)
    return NextResponse.json(
      { hata: `Çok hızlı mesaj gönderiyorsun. ${hiz.kalanSaniye} sn bekle.` },
      { status: 429 },
    );

  let govde: Record<string, unknown>;
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json(
      { hata: "Geçersiz istek gövdesi." },
      { status: 400 },
    );
  }

  const sohbetId = typeof govde.sohbetId === "string" ? govde.sohbetId : "";
  const metin = cokSatir(govde.metin, 2000);
  // Teklif tutarı artık siparişin bedelini doğrudan belirliyor
  // (bkz. lib/depo.ts → anlasilanTutar), o yüzden talep/sunum ile aynı
  // bantta olmalı; sınırsız bir teklif kabul edilirse kayıt da sınırsız olur.
  const tutar = paraTutari(govde.tutar);
  const teklifMi = tutar !== null;
  // Tutar gönderilmiş ama geçersizse sessizce düz mesaja dönüşmemeli:
  // kullanıcı teklif verdiğini sanır, karşı taraf boş mesaj görür.
  if (govde.tutar !== undefined && tutar === null)
    return NextResponse.json(
      {
        hata: `Geçerli bir teklif tutarı gir (en fazla ${MAX_FIYAT.toLocaleString("tr-TR")} TL).`,
      },
      { status: 400 },
    );

  if (!metin && !teklifMi) {
    return NextResponse.json(
      { hata: "Boş mesaj gönderilemez." },
      { status: 400 },
    );
  }

  const kisiler = await sohbetTaraflari(sohbetId);
  if (!kisiler) {
    return NextResponse.json({ hata: "Sohbet bulunamadı." }, { status: 404 });
  }
  const ben = gonderen;
  if (!kisiler.includes(ben)) {
    return NextResponse.json(
      { hata: "Bu sohbete yazamazsın." },
      { status: 403 },
    );
  }

  const mesaj: Mesaj = {
    id: metinKimlik(sohbetId),
    sohbetId,
    gonderen: ben,
    metin,
    ...(teklifMi ? { tutar } : {}),
    zaman: new Date().toISOString(),
  };
  await mesajEkle(mesaj);

  // Karşı taraf haberdar edilir. Bu bildirim hiç yazılmıyordu: Ayarlar'da
  // "Mesajlar" tercihi duruyor ama sohbete mesaj gelince zil çalmıyordu
  // (bkz. lib/depo.ts → mesajBildirimiGonder).
  const karsiTaraf = kisiler.find((k) => k !== ben);
  if (karsiTaraf)
    await mesajBildirimiGonder({
      kime: karsiTaraf,
      gonderen: ben,
      sohbetId,
      metin,
      ...(teklifMi ? { tutar: tutar! } : {}),
    }).catch(() => undefined);

  return NextResponse.json({ mesaj }, { status: 201 });
}
