import { NextResponse } from "next/server";
import { teslimIsaretle, bildirimEkle, kimlik } from "@/lib/depo";
import { harfFor } from "@/lib/sohbetler";
import { kargoWebhookGecerli } from "@/lib/roller";

export const dynamic = "force-dynamic";

/**
 * Kargonun teslim edildiğini bildirir.
 *
 * BU UÇ KARGO FİRMASI İÇİNDİR — kullanıcı arayüzünden çağrılmaz. Firma
 * teslim anında burayı çağırır, bilgi sohbete düşer ve alıcıya "ürün
 * anlatıldığı gibi mi?" sorusu açılır.
 *
 * ÜRETİM ÖNCESİ ZORUNLU: burada firmanın imzası/paylaşılan gizli anahtarı
 * doğrulanmalı. Şu hâliyle uç açıktır; imza doğrulaması eklenmeden
 * yayına alınmamalı (bkz. BACKEND.md).
 */
export async function POST(
  istek: Request,
  { params }: { params: Promise<{ sunumId: string }> },
) {
  // Kargo firmasının paylaşılan anahtarı doğrulanır (bkz. lib/roller.ts).
  if (!kargoWebhookGecerli(istek))
    return NextResponse.json({ hata: "İmza doğrulanamadı." }, { status: 401 });

  const { sunumId } = await params;
  const sonuc = await teslimIsaretle(sunumId);

  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (sonuc === "kargoda-degil")
    return NextResponse.json(
      { hata: "Gönderi henüz kargoya verilmemiş." },
      { status: 409 },
    );

  // Bildirim YALNIZCA ilk bildirimde. Webhook'lar yeniden denenir; aynı
  // teslim için ikinci çağrı kaydı değiştirmiyor, dolayısıyla haber de
  // vermemeli.
  if (sonuc.durum === "zaten-teslim")
    return NextResponse.json({ anlasma: sonuc.anlasma, tekrar: true });

  // Alıcı teslimi ve kendisinden beklenen yanıtı bilmeli.
  await bildirimEkle({
    id: kimlik(),
    kime: sonuc.anlasma.alici,
    grup: "Bugün",
    tip: "kargo",
    harf: harfFor(sonuc.anlasma.satici),
    avatar: "bg-accent-soft text-accent-ink",
    text: "Kargon teslim edildi.",
    sub: "Ürün anlatıldığı gibi mi? Sohbetten yanıtla.",
    zaman: "Az önce",
    href: "/mesajlar",
    yeni: true,
  });

  return NextResponse.json({ anlasma: sonuc.anlasma });
}
