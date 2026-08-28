import { NextResponse } from "next/server";
import {
  gonderiHazirla,
  iadeAdimiIsle,
  bildirimEkle,
  kimlik,
  saticiLehineOdemeKaydet,
  iptalKaydet,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { harfFor } from "@/lib/sohbetler";
import { kargoWebhookGecerli } from "@/lib/roller";
import { iadeAdimi, KARGO_FIRMALARI } from "@/lib/anlasma";
import { tekSatir, cokSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sunumId: string }> };

/** İade gönderisini firmada oluşturur — alıcı→satıcı yönü. */
async function iadeGonderisi(
  _istek: Request,
  sunumId: string,
  g: Record<string, unknown>,
) {
  const firma = tekSatir(g.firma, 60);
  if (!KARGO_FIRMALARI.some((k) => k.ad === firma))
    return NextResponse.json(
      { hata: "Listeden bir kargo firması seç." },
      { status: 400 },
    );

  const takipNo = tekSatir(g.takipNo, 40);
  if (takipNo && takipNo.length < 6)
    return NextResponse.json(
      { hata: "Takip numarası en az 6 karakter olmalı." },
      { status: 400 },
    );

  const ben = await istekKullaniciAdi();
  const sonuc = await gonderiHazirla(
    sunumId,
    ben,
    firma,
    "iade",
    takipNo || undefined,
  );

  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json(
      { hata: "İade gönderisini yalnızca alıcı oluşturabilir." },
      { status: 403 },
    );
  if (sonuc === "sira-disi" || sonuc === "odeme-bekleniyor")
    return NextResponse.json(
      { hata: "Önceki adım tamamlanmadan bu adım işlenemez." },
      { status: 409 },
    );
  if (sonuc === "zaten-var")
    return NextResponse.json(
      { hata: "İade gönderisi zaten oluşturuldu." },
      { status: 409 },
    );
  if (sonuc === "kod-yok")
    return NextResponse.json(
      { hata: "Siparişin kodu üretilememiş. Destek ekibine bildir." },
      { status: 409 },
    );
  if (sonuc === "adres-yok")
    return NextResponse.json(
      {
        hata:
          "Satıcının kayıtlı adresi yok; iade gönderisi oluşturulamıyor. Destek ekibi devreye girecek.",
      },
      { status: 409 },
    );
  if (sonuc === "saglayici-yok")
    return NextResponse.json(
      {
        hata:
          "Kargo firması entegrasyonu bağlı değil; takip numarasını elle gir.",
      },
      { status: 503 },
    );
  if (sonuc === "saglayici-hatasi")
    return NextResponse.json(
      { hata: `${firma} gönderiyi oluşturamadı. Başka bir firma dene.` },
      { status: 502 },
    );

  await bildirimEkle({
    id: kimlik(),
    kime: sonuc.satici,
    grup: "Bugün",
    tip: "kargo",
    harf: harfFor(ben),
    avatar: "bg-primary-soft text-primary-hover",
    text: "Ürün iade için kargoya verildi",
    sub: `${firma} · Takip no: ${sonuc.iade?.takipNo}`,
    zaman: "az önce",
    href: "/mesajlar",
    yeni: true,
  }).catch(() => undefined);

  return NextResponse.json({ anlasma: sonuc });
}

/**
 * İtiraz/iade sürecinin adımlarını işler:
 *   { adim: "karar", karar: "alici-hakli" | "satici-hakli" }  → destek ekibi
 *   { adim: "kargo", firma, takipNo }                          → alıcı
 *   { adim: "teslim" }                                         → satıcı
 *   { adim: "odeme" }                                          → destek/sistem
 *
 * YETKİ: her adımın kimin yapabileceği `iadeAdimiIsle` içinde, yazma
 * kilidinin altında uygulanır (bkz. lib/depo.ts) — "karar", "ikinci-karar"
 * ve "odeme" destek yetkisi ister, "kargo" alıcıya, "satici-onay" satıcıya
 * aittir. Kontrol depoda olduğu için hiçbir çağrı yolu atlayamaz.
 *
 * Burada bir dönem "rol kontrolü auth katmanı gelince eklenmeli, şu an
 * yalnızca taraf olma kuralı uygulanıyor" yazıyordu; doğru değildi ve
 * denetimde var olmayan bir açık aranmasına yol açıyordu.
 */
export async function PATCH(istek: Request, { params }: Params) {
  const { sunumId } = await params;
  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const adim = g.adim;

  /*
   * İADE KARGOSU AYRI BİR YOLDAN GİDER.
   *
   * Diğer adımlar yalnızca kayda damga basar; bu adım kargo firmasında
   * GÖNDERİ OLUŞTURUR. Eskiden alıcı `?yon=iade` ile satıcının tam
   * adresini çekiyor, ürünü kendisi kargolayıp takip numarasını elle
   * giriyordu. Gidiş yönünde kapatılan şeyin aynısı burada da kapandı:
   * satıcının kapı numarası alıcının tarayıcısına inmez, iade de sipariş
   * koduyla yapılır (bkz. lib/kargo-gonderi.ts).
   */
  if (adim === "kargo") return iadeGonderisi(istek, sunumId, g);


  let islem;
  if (adim === "karar") {
    const karar = g.karar === "satici-hakli" ? "satici-hakli" : "alici-hakli";
    islem = { adim: "karar", karar } as const;
  } else if (adim === "kargo-teslim") {
    // İade kargosunun teslim bildirimi de kargo firmasından gelir.
    if (!kargoWebhookGecerli(istek))
      return NextResponse.json({ hata: "İmza doğrulanamadı." }, { status: 401 });
    islem = { adim: "kargo-teslim" } as const;
  } else if (adim === "satici-onay") {
    const onay = g.onay === "hayir" ? "hayir" : "evet";
    islem = { adim: "satici-onay", onay, aciklama: cokSatir(g.aciklama, 300) } as const;
  } else if (adim === "ikinci-karar") {
    const karar = g.karar === "ret" ? "ret" : "iade";
    islem = { adim: "ikinci-karar", karar } as const;
  } else if (adim === "teslim") {
    islem = { adim: "teslim" } as const;
  } else if (adim === "odeme") {
    islem = { adim: "odeme" } as const;
  } else {
    return NextResponse.json({ hata: "Geçersiz adım." }, { status: 400 });
  }

  /*
   * Kimlik ADIMA GÖRE çözülür.
   *
   * `kargo-teslim` adımı kargo firmasının webhook'undan gelir: ortada oturum
   * yoktur ve olmamalıdır — çağrıyı imza doğrular (yukarıda). Kimliği koşulsuz
   * istemek bu adımı 500 ile düşürüyordu, çünkü `istekKullaniciAdi()` oturum
   * yoksa hata fırlatır. `iadeAdimiIsle` bu adımda kimliğe zaten bakmıyor.
   */
  const ben = islem.adim === "kargo-teslim" ? "" : await istekKullaniciAdi();
  const sonuc = await iadeAdimiIsle(sunumId, ben, islem);

  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (sonuc === "itiraz-yok")
    return NextResponse.json(
      { hata: "Bu siparişte açık bir itiraz yok." },
      { status: 409 },
    );
  if (sonuc === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu adımı bu hesap işleyemez." },
      { status: 403 },
    );
  if (sonuc === "sira-disi")
    return NextResponse.json(
      { hata: "Önceki adım tamamlanmadan bu adım işlenemez." },
      { status: 409 },
    );

  // İtiraz satıcı lehine kapandıysa alışveriş tamamlanmış demektir: ürün
  // alıcıda kalır ve bedelini o öder. Para kaydı bu yolda hiç oluşmuyordu —
  // satıcı haklı çıksa bile parası ne alıcıya dönüyor ne bakiyesine geçiyor,
  // havuzda asılı kalıyordu.
  //
  // Hem ilk karar ("satici-hakli") hem karşı itirazın reddi ("ikinci-karar":
  // "ret") aynı noktaya çıkar; ikisini de `iadeAdimi` üzerinden yakalıyoruz.
  const yeniAdim = iadeAdimi(sonuc);
  if (yeniAdim === "satici-hakli") {
    const zaman =
      sonuc.iade?.ikinciKararZamani ??
      sonuc.iade?.kararZamani ??
      new Date().toISOString();
    await saticiLehineOdemeKaydet(sonuc, zaman).catch(() => undefined);
    // İtiraz reddedildi: kusur alıcıda. ("İade edilmedi" hâli ayrı bir
    // sebeple, zaman aşımı temizleyicisinde kaydedilir.)
    if (!sonuc.iade?.kargoSuresiAsildi)
      await iptalKaydet(sonuc, "itiraz-satici-hakli").catch(() => undefined);
  }

  // Para alıcıya iade edildi: ürün anlatıldığı gibi değilmiş, kusur
  // satıcıda (bkz. lib/iptal.ts → KUSUR).
  if (yeniAdim === "tamamlandi")
    await iptalKaydet(sonuc, "itiraz-alici-hakli").catch(() => undefined);

  // Karşı tarafa haber ver: süreç ilerledi.
  const mesajlar: Record<string, [string, string]> = {
    karar: ["İtirazda karar verildi", "Destek ekibi kararını bildirdi."],
    kargo: ["Ürün iade için kargoya verildi", "Takip numarası sohbette."],
    "kargo-teslim": [
      "İade kargosu satıcıya ulaştı",
      "Satıcının ürün kontrolü bekleniyor.",
    ],
    "ikinci-karar": [
      "Karşı itiraz sonuçlandı",
      "Destek ekibi kararını bildirdi.",
    ],
    "satici-onay":
      islem.adim === "satici-onay" && islem.onay === "hayir"
        ? ["Satıcı karşı itiraz açtı", "Ürün gönderildiği gibi değil; destek inceleyecek."]
        : ["Satıcı iade ürününü onayladı", "Para iadesi işleme alınıyor."],
    teslim: ["Satıcı iade ürününü teslim aldı", "Para iadesi işleme alınıyor."],
    odeme: ["Para iadesi tamamlandı", "İtiraz süreci sonlandı."],
  };
  const [baslik, alt] = mesajlar[islem.adim];
  for (const kime of [sonuc.alici, sonuc.satici]) {
    if (kime === ben) continue;
    await bildirimEkle({
      id: kimlik(),
      kime,
      grup: "Bugün",
      tip: "sistem",
      harf: harfFor(ben),
      avatar: "bg-primary-soft text-primary-hover",
      text: baslik,
      sub: alt,
      zaman: "az önce",
      href: "/mesajlar",
      yeni: true,
    }).catch(() => undefined);
  }

  return NextResponse.json({ anlasma: sonuc });
}
