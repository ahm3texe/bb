import { NextResponse } from "next/server";
import { talepYayinDurumu } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Talebi dondurur ya da yeniden yayına alır: { islem: "dondur" | "yayinla" }
 * Yalnızca talebin sahibi çağırabilir; kontrol depoda yapılır.
 */
export async function PATCH(istek: Request, { params }: Params) {
  const { id } = await params;
  const govde = (await istek.json().catch(() => ({}))) as { islem?: unknown };
  const islem = govde.islem === "dondur" ? "dondur" : "yayinla";

  const sonuc = await talepYayinDurumu(id, await istekKullaniciAdi(), islem);
  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Talep bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu talebi yalnızca sahibi yönetebilir." },
      { status: 403 },
    );
  if (sonuc === "silinmis")
    return NextResponse.json(
      { hata: "Silinmiş talep yeniden yayına alınamaz." },
      { status: 409 },
    );
  if (sonuc === "zaten-yayinda")
    return NextResponse.json(
      {
        hata:
          "Bu talep zaten yayında. Süreyi uzatmak için önce dondurman ya da sürenin dolmasını beklemen gerekir.",
      },
      { status: 409 },
    );
  if (sonuc === "kapali")
    return NextResponse.json(
      { hata: "Anlaşma sağlanmış talep yeniden yayına alınamaz." },
      { status: 409 },
    );

  return NextResponse.json({ talep: sonuc });
}
