import { NextResponse } from "next/server";
import { okunduYaz } from "@/lib/depo";
import { sohbetTaraflari } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/**
 * Sohbeti okundu işaretler — kullanıcı sohbeti açtığında çağrılır.
 *
 * Sohbet kimliği doğrulanmıyordu: uydurma bir kimlikle sınırsız "okundu"
 * kaydı yazılabiliyordu. Her yazma dosyanın tamamını yeniden yazdığı için
 * bu sadece çöp kayıt değil, yük demek. Artık sohbetin var olması ve
 * isteyenin o sohbetin tarafı olması aranıyor.
 */
export async function POST(istek: Request) {
  const govde = (await istek.json().catch(() => ({}))) as { sohbetId?: unknown };
  const sohbetId = typeof govde.sohbetId === "string" ? govde.sohbetId : "";
  if (!sohbetId)
    return NextResponse.json({ hata: "Sohbet kimliği gerekli." }, { status: 400 });

  const kisiler = await sohbetTaraflari(sohbetId);
  if (!kisiler)
    return NextResponse.json({ hata: "Sohbet bulunamadı." }, { status: 404 });

  const ben = await istekKullaniciAdi();
  if (!kisiler.includes(ben))
    return NextResponse.json(
      { hata: "Bu sohbete erişimin yok." },
      { status: 403 },
    );

  await okunduYaz(ben, sohbetId);
  return NextResponse.json({ okundu: sohbetId });
}
