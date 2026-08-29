import { NextResponse } from "next/server";
import {
  aktarimlarOku,
  aktarimTalebiOlustur,
  aktarimSonucla,
  islemlerOku,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { destekYetkisi } from "@/lib/roller";
import { bakiyedekiTutar } from "@/lib/islemler";
import { cekilebilirTutar } from "@/lib/aktarim";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/** Kullanıcının aktarım talepleri + çekilebilir bakiye. */
export async function GET() {
  const ben = await istekKullaniciAdi();
  const [talepler, islemler] = await Promise.all([
    aktarimlarOku(ben),
    islemlerOku(ben),
  ]);
  const bakiye = bakiyedekiTutar(islemler, ben);

  return NextResponse.json({
    aktarimlar: talepler,
    bakiye,
    cekilebilir: cekilebilirTutar(bakiye, talepler),
  });
}

/**
 * Bakiyeyi IBAN'a aktarma talebi açar.
 *
 * Para anında gönderilmez: talep "işlemde" olarak kaydedilir, muhasebe
 * tarafı sonuçlandırır. Bekleyen ve tamamlanmış talepler çekilebilir
 * tutardan düşülür ki aynı bakiye iki kez talep edilemesin.
 *
 * Bakiye kontrolü BURADA DEĞİL, `aktarimTalebiOlustur` içinde — yazma
 * kuyruğunun içinde — yapılır: kontrolü uçta yapmak eşzamanlı iki isteğin
 * aynı bakiyeyi görmesine izin veriyordu.
 */
export async function POST(istek: Request) {
  const ben = await istekKullaniciAdi();
  const hiz = hizSinirla(`aktarim:${ben}`, 5, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      { hata: "Çok fazla aktarım talebi açtın. Biraz sonra tekrar dene." },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;

  // Tutar verilmezse çekilebilir bakiyenin tamamı istenmiş sayılır.
  const istenen =
    typeof g.tutar === "number" && Number.isFinite(g.tutar)
      ? Math.floor(g.tutar)
      : null;
  const sonuc = await aktarimTalebiOlustur(ben, istenen);

  if ("hata" in sonuc && sonuc.hata === "iban-yok")
    return NextResponse.json(
      {
        hata:
          "Önce Ayarlar > IBAN bölümünden aktarım yapılacak banka hesabını kaydet.",
      },
      { status: 409 },
    );

  if ("hata" in sonuc && sonuc.hata === "az-tutar")
    return NextResponse.json(
      { hata: `En az ${sonuc.enAz} TL aktarım talebi açabilirsin.` },
      { status: 400 },
    );
  if ("hata" in sonuc && sonuc.hata === "yetersiz-bakiye")
    return NextResponse.json(
      {
        hata: `Çekilebilir bakiyen ${sonuc.cekilebilir.toLocaleString("tr-TR")} TL. Bekleyen ve tamamlanan talepler bu tutardan düşülür.`,
      },
      { status: 409 },
    );

  return NextResponse.json({ aktarim: sonuc }, { status: 201 });
}

/** Muhasebe/destek tarafı: PATCH { id, durum: "tamamlandi" | "reddedildi" } */
export async function PATCH(istek: Request) {
  const ben = await istekKullaniciAdi();
  if (!destekYetkisi(ben))
    return NextResponse.json(
      { hata: "Bu işlemi yalnızca destek ekibi yapabilir." },
      { status: 403 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof g.id === "string" ? g.id : "";
  const durum = g.durum === "reddedildi" ? "reddedildi" : "tamamlandi";
  const not = tekSatir(g.not, 200) || undefined;

  const sonuc = await aktarimSonucla(id, durum, not);
  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Aktarım bulunamadı." }, { status: 404 });

  return NextResponse.json({ aktarim: sonuc });
}
