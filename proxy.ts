import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OTURUM_CEREZI, oturumCoz } from "@/lib/oturum-imza";
import { kapsamDisiMi, yolAcikMi } from "@/lib/korumali-yollar";
import { destekYetkisi } from "@/lib/roller";

// ── İstek kenarı korumaları ──────────────────────────────────────────────
// Buradaki iki kontrol de uçlara TEK TEK eklenemez: ikisi de istek gövdesi
// ayrıştırılmadan önce çalışmalı.

// ── 1. İstek gövdesi boyut sınırı ─────────────────────────────────────
// App Router'ın route handler'larında varsayılan bir gövde sınırı YOK.
// Uçlardaki alan sınırları (`tekSatir`, `paraTutari`, dizi tavanları)
// ancak `istek.json()` gövdeyi belleğe AYRIŞTIRDIKTAN sonra devreye
// giriyor — yani 100 MB'lık bir JSON önce belleğe açılıyor, sonra
// reddediliyor. Sınırı ayrıştırmadan ÖNCE uygulamak gerekiyor.

/** JSON uçları için üst sınır. En büyük alan 2000 karakterlik açıklama. */
const MAX_JSON_BYTE = 128 * 1024;

/**
 * Yükleme ucunun tavanı. Ucun kendi toplam sınırı 24 MB
 * (bkz. app/api/yukle/route.ts → MAX_TOPLAM_BYTE); buradaki pay form
 * sınırları ve başlıklar içindir.
 *
 * Eskiden 650 MB idi: uç dosya BAŞINA sınır uyguladığı için 6 × 100 MB'lık
 * bir istek buradan da geçiyor, hepsi belleğe açılıyordu. Değer
 * `next.config.ts` → `proxyClientMaxBodySize` ile hizalı tutulmalı.
 */
const MAX_YUKLEME_BYTE = 26 * 1024 * 1024;

// ── 2. İstek kaynağı (CSRF) ───────────────────────────────────────────
// Oturum çerezle taşınıyor, yani tarayıcı isteği KENDİLİĞİNDEN kimlik
// doğrulanmış hale getiriyor. Üç şey birleşince başka bir sitedeki sayfa,
// ziyaretçinin adına durum değiştirebiliyordu:
//
//   a. `istek.json()` gövdeyi Content-Type'a bakmadan ayrıştırıyor. Yani
//      `text/plain` ile gönderilen bir JSON da kabul ediliyor — o tür,
//      tarayıcının CORS ön-uçuşu YAPMADIĞI "basit istek" sınıfında.
//   b. Üç uç (odeme, teslim-aldim, teslim) gövde bile okumuyor; saldırgan
//      sayfanın düz bir <form method=POST> koyması yeterli.
//   c. Çerez yoksa `istekKullaniciAdi()` varsayılan hesaba düşüyor —
//      çerezsiz gelen bir cross-site istek bile bir hesap adına iş yapıyor.
//
// En ağır örnek: `POST /api/anlasmalar/<id>/odeme` gövdesiz çalışıyor ve
// siparişi "ödendi" işaretliyor; satıcının kargo sayacı başlıyor.
//
// Çözüm: durum değiştiren isteklerin AYNI KÖKENDEN geldiğini doğrula.
// `Sec-Fetch-Site` modern tarayıcılarda var ve sahtelenemez; yoksa
// `Origin` başlığı ana makineyle karşılaştırılır.

const GUVENLI_METOTLAR = new Set(["GET", "HEAD", "OPTIONS"]);

/** Kargo firmasının imzalı webhook'ları tarayıcıdan gelmez. */
const IMZA_BASLIGI = "x-bulbana-imza";

/**
 * Kargo firmasının çağırdığı uçlar. Yalnızca bunlar köken kontrolünden
 * muaf tutulur; imzalarını uçların kendisi doğrular (bkz. lib/roller.ts).
 */
const KARGO_WEBHOOK_YOLU = /^\/api\/anlasmalar\/[^/]+\/(teslim|iade)$/;

/**
 * Köken kontrolünden muaf mı?
 *
 * DİKKAT — burada bir açık vardı: muafiyet `x-bulbana-imza` başlığının
 * yalnızca VARLIĞINA bakıyordu ve bu kontrol TÜM `/api` yollarına
 * uygulanıyordu. Yani uydurma bir başlık değeri, sitedeki her uç için
 * köken doğrulamasını atlatıyordu. Başlığın değeri burada zaten
 * doğrulanamaz (imza karşılaştırması ucun işi), o yüzden doğru çözüm
 * muafiyeti başlığa değil YOLA bağlamak: yalnızca kargo firmasının
 * çağırdığı iki uç muaf, gerisi her zaman köken doğrulaması ister.
 */
function kargoWebhookMu(istek: NextRequest, yol: string): boolean {
  return KARGO_WEBHOOK_YOLU.test(yol) && !!istek.headers.get(IMZA_BASLIGI);
}

function ayniKokenMi(istek: NextRequest): boolean {
  const site = istek.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";

  // Eski tarayıcı ya da tarayıcı dışı istemci: Origin'e düş.
  const kaynak = istek.headers.get("origin");
  if (!kaynak) return false;
  try {
    return new URL(kaynak).host === istek.headers.get("host");
  } catch {
    return false;
  }
}

// ── 3. Oturum kapısı ──────────────────────────────────────────────────
// Oturumu olmayan ziyaretçi vitrini görebilir, hesabı göremez. Kapı burada
// duruyor — tek bir yerde — çünkü 17 sayfa ve 28 API ucu kimliği okuyor ve
// her birine ayrı ayrı kontrol koymak, birini unutmak demektir.
//
// Kapının arkasındaki kod `istekKullaniciAdi()` çağırdığında oturumun VAR
// olduğuna güvenebilir; yine de o fonksiyon oturum yoksa hata fırlatır
// (bkz. lib/oturum-sunucu.ts) — kapı yanlış yapılandırılırsa istek sessizce
// yanlış hesap adına çalışmasın diye.

/**
 * Oturum gerektirmeyen API uçları.
 *
 * `/api/oturum` giriş akışının kendisi. Vitrin uçları herkese açık veri
 * döndürüyor. Teslim ve iade uçları kargo firmasının webhook'u tarafından
 * çağrılıyor; onları oturum değil, paylaşılan anahtarın imzası doğrular
 * (bkz. lib/roller.ts → kargoWebhookGecerli).
 */
const ACIK_UCLAR: readonly string[] = [
  "/api/oturum",
  // Parola sıfırlama zaten giriş yapamayan kullanıcı içindir.
  "/api/sifre-sifirlama",
  "/api/talepler",
  "/api/kategori-sayilari",
  "/api/mahalleler",
  "/api/degerlendirmeler",
];

function acikUcMu(yol: string, metot: string): boolean {
  // Vitrin uçlarında yalnızca OKUMA açık; yazma her zaman oturum ister.
  if (GUVENLI_METOTLAR.has(metot) && ACIK_UCLAR.includes(yol)) return true;
  if (yol === "/api/oturum" || yol === "/api/sifre-sifirlama") return true;
  // Önizleme hesap geçişi: ziyaretçiden bir demo hesabına geçiş için
  // oturumsuzken de çağrılabilmeli. Kendi kapısı var — kapalıyken 404 döner
  // (bkz. lib/onizleme.ts).
  if (yol === "/api/oturum/gecis") return true;
  // Kargo firması webhook'ları: imzayı ucun kendisi doğrular.
  return KARGO_WEBHOOK_YOLU.test(yol);
}

export function proxy(istek: NextRequest) {
  const yol = istek.nextUrl.pathname;

  if (
    !GUVENLI_METOTLAR.has(istek.method) &&
    !kargoWebhookMu(istek, yol) &&
    !ayniKokenMi(istek)
  )
    return NextResponse.json(
      { hata: "İstek kaynağı doğrulanamadı." },
      { status: 403 },
    );

  const uzunluk = Number(istek.headers.get("content-length") ?? 0);
  if (uzunluk) {
    const sinir = yol.startsWith("/api/yukle")
      ? MAX_YUKLEME_BYTE
      : MAX_JSON_BYTE;
    if (uzunluk > sinir)
      return NextResponse.json(
        { hata: "İstek gövdesi çok büyük." },
        { status: 413 },
      );
  }

  // Oturum kapısı. Kapsam dışı yollar (derleyici çıktısı, yüklenen dosyalar,
  // üstveri) hiç sorgulanmaz.
  if (kapsamDisiMi(yol) && !yol.startsWith("/api/")) return NextResponse.next();

  const apiMi = yol.startsWith("/api/");
  if (apiMi && acikUcMu(yol, istek.method)) return NextResponse.next();
  if (!apiMi && yolAcikMi(yol)) return NextResponse.next();

  const oturum = oturumCoz(istek.cookies.get(OTURUM_CEREZI)?.value);
  if (oturum) {
    // Moderasyon paneli: yetkisiz kullanıcı için sayfa VAR OLMAMALI.
    //
    // Kontrol sayfanın içinde `notFound()` ile de yapılıyor ama o yol
    // yanıtı 200 ile kapatıyordu: gerçekten olmayan bir adres 404
    // dönerken /admin 200 dönüyor, üstelik sayfanın kendi `metadata`'sı
    // gövdeden bağımsız üretildiği için sekme başlığı da farklı çıkıyordu.
    // İkisi de "burada bir şey var" sinyaliydi.
    //
    // Burada var olmayan bir yola yeniden yazıyoruz: yanıt, yanlış
    // yazılmış herhangi bir adresten AYIRT EDİLEMEZ hâle geliyor.
    if (yol === "/admin" || yol.startsWith("/admin/")) {
      if (!destekYetkisi(oturum))
        return NextResponse.rewrite(new URL("/_bulunamadi", istek.url));
    }
    return NextResponse.next();
  }

  // API: yönlendirme değil, düz 401 — çağıran bir tarayıcı sayfası değil,
  // `fetch`. Giriş sayfasının HTML'ini JSON bekleyen koda göndermek
  // ayrıştırma hatasına dönüşürdü.
  if (apiMi)
    return NextResponse.json(
      { hata: "Bu işlem için giriş yapmalısın." },
      { status: 401 },
    );

  // Sayfa: girişe yönlendir ve nereye gitmek istediğini taşı ki giriş
  // sonrası kullanıcı başladığı yere dönsün.
  const giris = new URL("/giris", istek.url);
  giris.searchParams.set("devam", yol + istek.nextUrl.search);
  return NextResponse.redirect(giris);
}

export const config = {
  /**
   * Hem API hem sayfalar.
   *
   * `matcher` verilmezse proxy `_next/static` ve `public/` dâhil HER isteğe
   * çalışır ve oturum kapısı CSS/JS/görsel yüklenmesini engeller
   * (bkz. Next 16 proxy belgeleri — "auth logic or redirects can
   * unintentionally block CSS, JS, or images from loading").
   *
   * STATİK DOSYA UZANTILARI DA MUAF OLMAK ZORUNDA. Liste bir dönem yalnızca
   * `_next/`, `yuklemeler/` ve birkaç üstveri dosyasını dışarıda
   * bırakıyordu; `public/` altındaki diğer her şey — logo dâhil — korumalı
   * yol sayılıp `/giris`'e YÖNLENDİRİLİYORDU. Sonuç: `/logo.png` isteği 307
   * dönüyor, Next'in görsel iyileştiricisi dosyayı çekemiyor ("The
   * requested resource isn't a valid image", 400) ve site başlığındaki logo
   * HERKESTE kırık görünüyordu. Oturum açmak da çözmüyordu: iyileştirici
   * dosyayı sunucu tarafından, çerezsiz istiyor.
   *
   * Uzantıya göre elemek yol adına göre elemekten güvenli: `public/` altına
   * yarın eklenecek bir dosya için listeyi güncellemek gerekmez.
   */
  matcher: [
    "/((?!_next/|yuklemeler/|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|txt|xml|webmanifest|mp4|webm|mov|woff2?|ttf)$).*)",
  ],
};
