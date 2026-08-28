import { NextResponse } from "next/server";
import {
  onayKaydet,
  bildirimEkle,
  islemEkle,
  sunumlarOku,
  taleplerOku,
  kimlik,
} from "@/lib/depo";
import { islemOlustur } from "@/lib/islem-olustur";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { harfFor } from "@/lib/sohbetler";

export const dynamic = "force-dynamic";

/**
 * Teslim sonrası alıcının yanıtı: ürün anlatıldığı gibi mi?
 * "evet" alışverişi başarıyla bitirir, "hayir" destek kaydı açar.
 */
export async function POST(
  istek: Request,
  { params }: { params: Promise<{ sunumId: string }> },
) {
  const { sunumId } = await params;

  let govde: { onay?: unknown };
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const onay = govde.onay;
  if (onay !== "evet" && onay !== "hayir")
    return NextResponse.json(
      { hata: "Yanıt yalnızca 'evet' veya 'hayir' olabilir." },
      { status: 400 },
    );

  const sonuc = await onayKaydet(sunumId, await istekKullaniciAdi(), onay);
  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu yanıtı yalnızca alıcı verebilir." },
      { status: 403 },
    );
  if (sonuc === "teslim-edilmedi")
    return NextResponse.json(
      { hata: "Kargo teslim edilmeden yanıt verilemez." },
      { status: 409 },
    );
  if (sonuc === "zaten-yanitlandi")
    return NextResponse.json(
      { hata: "Bu sipariş için yanıt zaten verildi." },
      { status: 409 },
    );

  // Onay alışverişi kapatır: kayıt Aldıklarım / Sattıklarım / Cüzdan'a
  // buradan düşer. Hata olursa sipariş yine tamamlanmış sayılır.
  if (onay === "evet") {
    try {
      const [sunumlar, talepler] = await Promise.all([
        sunumlarOku(),
        taleplerOku(),
      ]);
      const sunum = sunumlar.find((s) => s.id === sonuc.sunumId);
      if (sunum) {
        const talep = talepler.find((t) => t.id === sonuc.talepId);
        await islemEkle(islemOlustur(sonuc, sunum, talep));
      }
    } catch {
      // İşlem kaydı yazılamadıysa sipariş akışı bozulmaz.
    }
  }

  await bildirimEkle({
    id: kimlik(),
    kime: sonuc.satici,
    grup: "Bugün",
    tip: onay === "evet" ? "sistem" : "sistem",
    harf: harfFor(sonuc.alici),
    avatar:
      onay === "evet"
        ? "bg-accent-soft text-accent-ink"
        : "bg-danger-soft text-danger",
    text:
      onay === "evet"
        ? `${sonuc.alici} ürünü onayladı — satış tamamlandı.`
        : `${sonuc.alici} üründe sorun bildirdi.`,
    sub:
      onay === "evet"
        ? "Ödemen hesabına aktarılmak üzere işleme alındı."
        : "Destek ekibi kaydı inceleyecek; sohbetten iletişimde kal.",
    zaman: "Az önce",
    href: "/mesajlar",
    yeni: true,
  });

  return NextResponse.json({ anlasma: sonuc });
}
