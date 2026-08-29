import { NextResponse } from "next/server";
import {
  sunumlarOku,
  sunumEkle,
  taleplerOku,
  bildirimEkle,
  kimlik,
  metinKimlik,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { getKullanici } from "@/lib/kullanicilar";
import { fiyatText } from "@/lib/data";
import { gorselleriSuz, sadeceFotograflar, sadeceVideolar } from "@/lib/gorsel";
import { kullaniciMetrikleriGetir, saticiMetrikleriniTazele } from "@/lib/veri";
import { paraTutari, MAX_FIYAT } from "@/lib/para";
import { tekSatir, cokSatir, BASLIK_SINIR, BASLIK_EN_AZ } from "@/lib/metin";
import { KARGO_FIRMALARI } from "@/lib/anlasma";
import type { GelenSunum } from "@/lib/gelen-sunumlar";

export const dynamic = "force-dynamic";

/**
 * Sunumlar: /api/sunumlar?talep=<id>
 *
 * GİZLİLİK: sunum, satıcının rakiplerine kapalıdır — fiyatı ve açıklamayı
 * yalnızca talebi açan alıcı görebilir. Satıcı da yalnızca KENDİ
 * sunumlarını görür. Bu kural sunucuda uygulanır; aksi hâlde rakip satıcı
 * uç üzerinden teklifleri okuyup altına fiyat verebilirdi.
 */
export async function GET(istek: Request) {
  const talepId = new URL(istek.url).searchParams.get("talep");
  const ben = await istekKullaniciAdi();
  const [hamSunumlar, talepler] = await Promise.all([
    sunumlarOku(),
    taleplerOku(),
  ]);
  // Metrikler okuma anında tazelenir; kayda donmuş `satis` / `zamanindaKargo`
  // / `yanitSaat` değerleri kullanılmaz (bkz. lib/veri.ts).
  const hepsi = await saticiMetrikleriniTazele(hamSunumlar);

  const gorulebilir = hepsi.filter((s) => {
    if (s.satici === ben) return true;
    const talep = talepler.find((t) => t.id === s.talepId);
    return talep?.sahibi === ben;
  });

  return NextResponse.json({
    sunumlar: talepId
      ? gorulebilir.filter((s) => s.talepId === talepId)
      : gorulebilir,
  });
}

// Açık sunum tavanı `sunumEkle` içinde, yazma kilidinin altında uygulanır
// (bkz. MAX_ACIK_SUNUM). Uçta `talep.sunum` sayacına bakmak yetmiyordu:
// okuma kilidin dışındaydı ve eşzamanlı istekler tavanı birlikte aşabiliyordu.

export async function POST(istek: Request) {
  const satici0 = await istekKullaniciAdi();
  const hiz = hizSinirla(`sunum:${satici0}`, 30, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla sunum gönderdin. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
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

  const talepId = tekSatir(govde.talepId, 80);
  const baslik = tekSatir(govde.baslik, BASLIK_SINIR);
  const aciklama = cokSatir(govde.aciklama, 600);
  const fiyatNum = paraTutari(govde.fiyatNum);

  // Firma listede olmalı: satıcı adına tanımadığımız bir firmaya söz
  // veremeyiz ve gönderi o firmada oluşturulacak.
  const kargoFirma = KARGO_FIRMALARI.some((k) => k.ad === govde.kargoFirma)
    ? (govde.kargoFirma as string)
    : "";

  const talepler = await taleplerOku();
  const talep = talepler.find((t) => t.id === talepId);

  const hatalar: string[] = [];
  if (!talep) hatalar.push("Sunum yapılacak talep bulunamadı.");
  if (!kargoFirma) hatalar.push("Listeden bir kargo firması seç.");
  if (baslik.length < BASLIK_EN_AZ)
    hatalar.push(`Sunum başlığı en az ${BASLIK_EN_AZ} karakter olmalı.`);
  if (fiyatNum === null)
    hatalar.push(
      `Geçerli bir fiyat girilmeli (en fazla ${MAX_FIYAT.toLocaleString("tr-TR")} TL).`,
    );

  const satici = satici0;
  // Kendi talebine sunum yapılamaz — kural sunucuda uygulanır.
  if (talep && talep.sahibi === satici)
    hatalar.push("Kendi talebine sunum yapamazsın.");

  if (hatalar.length) {
    return NextResponse.json({ hata: hatalar[0], hatalar }, { status: 400 });
  }

  const kayit = getKullanici(satici);
  const metrik = await kullaniciMetrikleriGetir(satici);
  const sunum: GelenSunum = {
    id: metinKimlik(`${talepId}-${satici}`),
    olusturuldu: new Date().toISOString(),
    talepId,
    satici,
    harf: kayit?.harf ?? satici.slice(0, 2).toLocaleUpperCase("tr"),
    // Satıcılığına verilen yıldız — okuma anında yine tazelenir.
    puan: metrik.saticiPuan.toLocaleString("tr-TR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    degerlendirme: metrik.saticiDegerlendirme,
    // saticiTipi ve yanitSaat BİLEREK yazılmıyor: ikisi de ölçülmüyor,
    // eskiden herkese sabit "Bireysel" / "~2 saat" basılıyordu.
    //
    // `satis` ve `zamanindaKargo` da artık okuma anında tazeleniyor
    // (bkz. lib/veri.ts → saticiMetrikleriniTazele). Buraya yazılan değer
    // gönderim anının fotoğrafıdır ve eskir: satıcı aradan geçen sürede on
    // satış daha yapsa bile alıcı karşılaştırma tablosunda eski sayıyı
    // görüyordu. Yeni kayıtta alan hiç yazılmaz; okuyan taraf hesaplar.
    satis: metrik.tamamlananSatis,
    ne: tekSatir(govde.urun, 60) || talep!.baslik,
    baslik,
    // `hatalar` boşsa fiyat doğrulanmıştır (yukarıda erken dönülür).
    fiyatNum: fiyatNum!,
    urun: tekSatir(govde.urun, 60) || talep!.marka,
    marka: tekSatir(govde.marka, 40) || undefined,
    model: tekSatir(govde.model, 40) || undefined,
    muadil: govde.muadil === true,
    yil: tekSatir(govde.yil, 12),
    renk: tekSatir(govde.renk, 30) || undefined,
    durum: tekSatir(govde.durum, 40) || "Kullanılmış",
    defoVar: govde.defoVar === true,
    kutu: govde.kutu === true,
    fatura: govde.fatura === true,
    aksesuar: govde.aksesuar === true,
    teslim: tekSatir(govde.teslim, 40) || "Bugün kargoda",
    // KARGO FİRMASI SUNUMDA BEYAN EDİLİR, ZORUNLUDUR VE BAĞLAYICIDIR.
    //
    // Etiket gövdeden okunmaz, seçimden TÜRETİLİR: istemci "Aras Kargo ile
    // gönderilecek" yazıp `kargoFirma` göndermeyebilirdi ve alıcı, kayıtta
    // karşılığı olmayan bir firma sözü görürdü.
    kargoFirma,
    kargo: `${kargoFirma} ile gönderilecek`,
    il: tekSatir(govde.il, 40) || kayit?.konum.split(",")[1]?.trim() || "",
    ilce: tekSatir(govde.ilce, 40) || kayit?.konum.split(",")[0]?.trim() || "",
    aciklama,
    // FOTOĞRAF SAYISI VE VİDEO VARLIĞI BEYANDAN DEĞİL, YÜKLENEN
    // DOSYALARDAN TÜRETİLİR.
    //
    // İkisi de gövdeden okunuyordu: `fotolar` sayısı ve `video` bayrağı
    // gerçek `gorseller` dizisiyle hiç karşılaştırılmıyordu. Yani istek
    // `{fotolar: 6, video: true, gorseller: []}` gönderebiliyor, sunum
    // karşılaştırma tablosundaki "Fotoğraf & video" satırında "6 fotoğraf
    // · 1 video" görünüyor ama ortada tek dosya olmuyordu — alıcının
    // kanıt diye baktığı sayı uydurulabilirdi.
    //
    // "Gövdeden gelen her şey düşmandır" kuralının üçüncü maddesi
    // (bkz. BACKEND.md): biçim doğrulanıyordu ama içerik doğrulanmıyordu.
    ...(() => {
      const gorseller = gorselleriSuz(govde.gorseller, 6);
      return {
        fotolar: sadeceFotograflar(gorseller).length,
        video: sadeceVideolar(gorseller).length > 0,
        gorseller,
      };
    })(),
  };

  const sonuc = await sunumEkle(sunum);
  if (sonuc === "talep-kapali") {
    return NextResponse.json(
      { hata: "Bu talep artık mevcut değil; yeni sunum alınmıyor." },
      { status: 409 },
    );
  }
  if (sonuc === "sunum-siniri") {
    return NextResponse.json(
      {
        hata: "Bu talep sunum sınırına ulaştı; şimdilik yeni sunum alınmıyor.",
      },
      { status: 409 },
    );
  }
  if (sonuc === "talep-alinmiyor") {
    return NextResponse.json(
      {
        hata: "Bu talep şu anda yayında değil (dondurulmuş ya da kaldırılmış); sunum alınmıyor.",
      },
      { status: 409 },
    );
  }
  if (sonuc === "acik-sunum-var") {
    // 409: istek geçerli ama mevcut durumla çelişiyor.
    return NextResponse.json(
      {
        hata: "Bu talebe zaten bir sunum yaptın. Alıcı sunumunu reddetmeden yeni sunum gönderemezsin.",
      },
      { status: 409 },
    );
  }
  // Talep sahibine bildirim: tıklayınca doğrudan sunum detayına gider.
  // Bildirim yazılamazsa sunum yine de kaydedilmiş olur.
  try {
    await bildirimEkle({
      id: kimlik(),
      kime: talep!.sahibi,
      grup: "Bugün",
      tip: "sunum",
      harf: sunum.harf,
      avatar: "bg-primary-soft text-primary-hover",
      text: `Talebine yeni sunum geldi: ${talep!.baslik}`,
      sub: `${sunum.satici} · ${sunum.baslik} · ${fiyatText(sunum.fiyatNum)}`,
      zaman: "az önce",
      href: `/sunum-detay?id=${encodeURIComponent(sunum.id)}`,
      yeni: true,
    });
  } catch {
    // Bildirim hatası sunumu geçersiz kılmaz.
  }

  return NextResponse.json({ sunum: sonuc }, { status: 201 });
}
