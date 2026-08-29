import { NextResponse } from "next/server";
import { odemeIsaretle, bildirimEkle, kimlik } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { harfFor } from "@/lib/sohbetler";
import { kargoSonTarih } from "@/lib/anlasma";

export const dynamic = "force-dynamic";

/**
 * Ödemenin alındığını işaretler; satıcının kargo sayacı buradan başlar.
 *
 * PROTOTİP UYARISI: gerçek sistemde bu ucu alıcının tarayıcısı değil,
 * ödeme sağlayıcısının imzalı webhook'u çağırmalıdır — tarayıcıdan gelen
 * istek ödemenin yapıldığının kanıtı değildir.
 */
export async function POST(
  _istek: Request,
  { params }: { params: Promise<{ sunumId: string }> },
) {
  const { sunumId } = await params;
  const alici = await istekKullaniciAdi();
  const sonuc = await odemeIsaretle(sunumId, alici);

  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json({ hata: "Ödemeyi yalnızca alıcı yapabilir." }, { status: 403 });
  if (sonuc === "sure-doldu")
    return NextResponse.json(
      {
        hata:
          "Ödeme süresi doldu; anlaşma iptal edildi. Talep yeniden sunuma açıldı.",
      },
      { status: 410 },
    );
  if (sonuc === "zaten-odendi")
    return NextResponse.json({ hata: "Bu siparişin ödemesi alınmış." }, { status: 409 });

  // Satıcı sayacın başladığını bilmeli.
  await bildirimEkle({
    id: kimlik(),
    kime: sonuc.satici,
    grup: "Bugün",
    tip: "sistem",
    harf: harfFor(sonuc.alici),
    avatar: "bg-primary-soft text-primary-hover",
    text: `${sonuc.alici} ödemeyi yaptı — kargo süren başladı.`,
    sub: `${sonuc.kargoSaat} saat içinde kargoya verip takip numarasını sohbete gir.`,
    zaman: "Az önce",
    href: "/mesajlar",
    yeni: true,
  });

  return NextResponse.json({ anlasma: sonuc, sonTarih: kargoSonTarih(sonuc) });
}
