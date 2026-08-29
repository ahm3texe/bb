import { NextResponse } from "next/server";
import {
  anlasmalarOku,
  degerlendirmeEkle,
  degerlendirmelerOku,
  bildirimEkle,
  kimlik,
  metinKimlik,
} from "@/lib/depo";
import { siparisSuruyor } from "@/lib/anlasma";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { YORUM_SINIR } from "@/lib/degerlendirme";
import type { Degerlendirme } from "@/lib/degerlendirme";
import { harfFor } from "@/lib/sohbetler";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * Değerlendirmeler: /api/degerlendirmeler?sunum=<id> ya da ?kullanici=<ad>
 * Herkese açıktır — güven ortamının temeli bu kayıtların görünür olması.
 */
export async function GET(istek: Request) {
  const url = new URL(istek.url);
  const sunum = url.searchParams.get("sunum");
  const kullanici = url.searchParams.get("kullanici");
  const hepsi = await degerlendirmelerOku();

  return NextResponse.json({
    degerlendirmeler: hepsi.filter(
      (d) =>
        (!sunum || d.sunumId === sunum) &&
        (!kullanici || d.hakkinda === kullanici),
    ),
  });
}

/**
 * Değerlendirme bırakır. Kurallar sunucuda uygulanır:
 *   • Yalnızca o alışverişin tarafı yazabilir,
 *   • Yalnızca alışveriş tamamlandıysa (alıcı ürünü onayladıysa),
 *   • Her taraf bir kez.
 */
export async function POST(istek: Request) {
  const govde = (await istek.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const sunumId = typeof govde.sunumId === "string" ? govde.sunumId : "";
  const puan = Number(govde.puan);
  // Tek cümlelik izlenim; satır sonu ve görünmez karakter beklenmez.
  const yorum = tekSatir(govde.yorum, YORUM_SINIR);

  if (!sunumId || !Number.isFinite(puan) || puan < 1 || puan > 5)
    return NextResponse.json(
      { hata: "Yıldız puanı (1-5) gerekli." },
      { status: 400 },
    );

  const anlasma = (await anlasmalarOku()).find((a) => a.sunumId === sunumId);
  if (!anlasma)
    return NextResponse.json(
      { hata: "Alışveriş bulunamadı." },
      { status: 404 },
    );

  const ben = await istekKullaniciAdi();
  if (ben !== anlasma.alici && ben !== anlasma.satici)
    return NextResponse.json(
      { hata: "Bu alışverişin tarafı değilsin." },
      { status: 403 },
    );

  // Ölçüt "tamamlandı" DEĞİL, "sipariş bitti".
  //
  // Eskiden yalnızca alıcının onayladığı siparişler değerlendirilebiliyordu;
  // itirazla kapananlar dışarıda kalıyordu. Oysa değerlendirmenin en çok
  // gerektiği durum tam da o: taraflar bir sorun yaşadı ve süreç bitti.
  // Her iki itiraz sonucu da kapsanır — satıcı haklı çıktıysa da, ürün iade
  // edilip para geri döndüyse de alışveriş sona ermiştir.
  if (siparisSuruyor(anlasma))
    return NextResponse.json(
      {
        hata: "Değerlendirme, sipariş sonuçlandıktan sonra yapılabilir. Süren bir itiraz varsa önce o kapanmalı.",
      },
      { status: 409 },
    );

  const alici = ben === anlasma.alici;
  const hakkinda = alici ? anlasma.satici : anlasma.alici;
  const kayit: Degerlendirme = {
    id: metinKimlik("deg"),
    sunumId,
    talepId: anlasma.talepId,
    yazan: ben,
    hakkinda,
    rol: alici ? "alici" : "satici",
    puan: Math.round(puan),
    yorum,
    zaman: new Date().toISOString(),
  };

  const sonuc = await degerlendirmeEkle(kayit);
  if (sonuc === "zaten-var")
    return NextResponse.json(
      { hata: "Bu alışveriş için değerlendirmeni zaten yaptın." },
      { status: 409 },
    );

  // Değerlendirilen kişi haberdar olsun; profiline işlendi.
  await bildirimEkle({
    id: kimlik(),
    kime: hakkinda,
    grup: "Bugün",
    tip: "sistem",
    harf: harfFor(ben),
    avatar: "bg-accent text-ink-900",
    text: `${ben} seni değerlendirdi: ${kayit.puan} yıldız`,
    sub: kayit.yorum || "Yorum yazılmadı",
    zaman: "az önce",
    href: `/profil/${encodeURIComponent(hakkinda)}`,
    yeni: true,
  }).catch(() => undefined);

  return NextResponse.json({ degerlendirme: sonuc }, { status: 201 });
}
