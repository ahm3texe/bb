import { NextResponse } from "next/server";
import { sunumSonucla, sunumGeriCek } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/**
 * Sunumu REDDEDER: PATCH /api/sunumlar/<id> { sonuc: "red" }
 * Kararı talebi açan alıcı verir; yetki kontrolü depo katmanındadır.
 *
 * KABUL BURADAN GEÇMEZ. Kabul etmek sipariş açmak demektir ve bunu yapan tek
 * yer `POST /api/anlasmalar`'dır: tutarı sohbetten türetir, talebi kapatır,
 * diğer sunumları düşürür ve siparişi oluşturur.
 *
 * Bu uç bir dönem "kabul" de kabul ediyordu; o dalda sunum kabul edilmiş
 * olup talep kapanıyor ama ortada sipariş olmuyordu — ödenecek, kargolanacak
 * hiçbir şey yok, süreç orada donuyordu. Arayüz bu yolu hiç kullanmıyordu
 * ama kapı açıktı.
 */
export async function PATCH(
  istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let govde: { sonuc?: unknown };
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const sonuc = govde.sonuc;
  if (sonuc === "kabul") {
    return NextResponse.json(
      {
        hata:
          "Kabul bu uçtan yapılmaz: kabul etmek sipariş açmaktır. POST /api/anlasmalar kullanın.",
      },
      { status: 400 },
    );
  }
  if (sonuc !== "red") {
    return NextResponse.json(
      { hata: "Sonuç yalnızca 'red' olabilir." },
      { status: 400 },
    );
  }

  const durum = await sunumSonucla(id, await istekKullaniciAdi(), sonuc);
  if (durum === "bulunamadi")
    return NextResponse.json({ hata: "Sunum bulunamadı." }, { status: 404 });
  if (durum === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu sunum hakkında yalnızca talebi açan kullanıcı karar verebilir." },
      { status: 403 },
    );
  if (durum === "zaten-sonuclandi")
    return NextResponse.json(
      { hata: "Bu sunum için karar zaten verildi." },
      { status: 409 },
    );

  return NextResponse.json({ sonuc });
}

/**
 * Satıcı sunumunu geri çeker: DELETE /api/sunumlar/<id>
 * Kayıt silinmez, "iptal" olarak işaretlenir — geçmiş korunur, talebin
 * sunum sayacı düşer ve satıcı aynı talebe yeniden sunum yapabilir.
 */
export async function DELETE(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sonuc = await sunumGeriCek(id, await istekKullaniciAdi());

  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sunum bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu sunumu yalnızca gönderen satıcı geri çekebilir." },
      { status: 403 },
    );
  if (sonuc === "geri-cekilemez")
    return NextResponse.json(
      { hata: "Alıcı karar verdikten sonra sunum geri çekilemez." },
      { status: 409 },
    );

  return NextResponse.json({ sunum: sonuc });
}
