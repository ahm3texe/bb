import { NextResponse } from "next/server";
import { anlasmalarOku, teslimatOku } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

/**
 * Siparişin teslimat adresi: /api/teslimat?sunum=<sunumId>
 *
 * ADRES YALNIZCA SAHİBİNE DÖNER. Karşı taraf — ödemesini yapmış olsa,
 * kargoyu hazırlayacak olsa bile — bu ucu çağırdığında 403 alır.
 *
 * Eskiden kural şuydu: "ödeme alındıysa satıcı adresi görebilir", çünkü
 * kargoyu satıcı hazırlıyordu. Ayrıca `?yon=iade` ile ters yönü de
 * açıyordu: itiraz sürecinde satıcının kayıtlı adresi alıcıya iniyordu.
 * İkisi de aynı varsayıma dayanıyordu ve varsayım yanlıştı — adresi
 * bilmesi gereken taraf gönderen değil, KARGO FİRMASIDIR. Firma adresi
 * sunucudan alır, gönderen elindeki sipariş koduyla şubeye gider
 * (bkz. lib/kargo-gonderi.ts).
 *
 * Uç tamamen kaldırılmadı çünkü alıcının kendi adresini görmesi hâlâ
 * anlamlı: "ürün nereye gelecek?" sorusunun cevabı sipariş ekranında
 * durmalı.
 */
export async function GET(istek: Request) {
  const url = new URL(istek.url);
  const sunumId = url.searchParams.get("sunum") ?? "";
  if (!sunumId)
    return NextResponse.json({ hata: "Sunum belirtilmedi." }, { status: 400 });

  const anlasma = (await anlasmalarOku()).find((a) => a.sunumId === sunumId);
  if (!anlasma)
    return NextResponse.json({ hata: "Anlaşma bulunamadı." }, { status: 404 });

  const ben = await istekKullaniciAdi();
  // Adres alıcınındır; satıcıya da üçüncü kişiye de aynı yanıt döner.
  // "Bu anlaşma senin değil" demek satıcıya siparişin varlığını
  // doğrulardı ama adresi vermediği için sızıntı değil; yine de tek bir
  // gerekçe döndürmek, kuralın istisnası olmadığını açıkça söyler.
  if (ben !== anlasma.alici)
    return NextResponse.json(
      { hata: "Teslimat adresi yalnızca sahibine gösterilir." },
      { status: 403 },
    );

  const adres = await teslimatOku(anlasma.talepId);
  if (!adres)
    return NextResponse.json(
      { hata: "Bu talep için kayıtlı teslimat adresi yok." },
      { status: 404 },
    );

  return NextResponse.json({ teslimat: adres });
}
