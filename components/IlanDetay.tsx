"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Talep } from "@/lib/data";
import {
  fiyatText,
  talepGorselleri,
  talepVideolari,
  talepNo,
} from "@/lib/data";
import { Baloncuk } from "@/components/ui/Baloncuk";
import { Yildizlar } from "@/components/ui/Yildizlar";
import { ButtonLink } from "@/components/ui/Button";
import { TalepCard } from "@/components/TalepCard";
import { getKullanici } from "@/lib/kullanicilar";
import { profilYolu, useAktifKullanici } from "@/lib/aktif-kullanici";
import { gizlenmeyeKalanSaat } from "@/lib/talep-durum";
import { yenidenYayinlanabilirMi } from "@/lib/talep-durum";
import type { AnlasmaDurum } from "@/lib/anlasma";

// İlan Aç formundaki alanların birebir yansıması — alıcının aradığı ürünün
// tarifi. Değeri olmayan satırlar gizlenir.
const detaySatirlari = (t: Talep) => {
  const defo =
    t.defoKabul === undefined
      ? null
      : t.defoKabul
        ? "Defolu olabilir"
        : "Defosuz olmalı";
  return [
    { k: "Kategori", v: t.kategori },
    { k: "Tür", v: t.tur ?? null },
    { k: "Çeşit", v: t.cesit ?? null },
    { k: "Marka", v: t.marka },
    { k: "Model", v: t.model ?? null },
    { k: "Yıl", v: t.yil ?? null },
    { k: "Renk", v: t.renk ?? null },
    { k: "Kabul edilen durum", v: t.durum },
    { k: "Ürün defosu", v: defo },
    {
      k: "Muadil ürün",
      v:
        t.muadilKabul === undefined
          ? null
          : t.muadilKabul
            ? "Kabul ediliyor"
            : "Kabul edilmiyor",
    },
    // Konum yalnızca şehir/ilçe: mahalle ve cadde ilanda gösterilmez.
    //
    // KISALTILMAZ. Değer bir dönem 18 karakterde JS ile kesiliyordu
    // (`kisalt`) ve ekranda "İstanbul/Küçükçe..." yazıyordu; tamamı
    // yalnızca baloncuktaydı. Oysa alıcının ürünün nereden geleceğini
    // görmesi için fazladan bir hareket yapması gerekmemeli — ilçe adı
    // uzun diye bilgi yarıda kesilmez. Satır sarar (`sarsin`).
    { k: "Konum", v: `${t.il}/${t.ilce}`, sarsin: true },
  ].filter((r): r is { k: string; v: string; sarsin?: boolean } =>
    Boolean(r.v),
  );
};

/**
 * Künye değeri — baloncuk YALNIZCA metin gerçekten kesildiğinde çalışır.
 *
 * `Baloncuk` her değerin etrafına koşulsuz sarılıyordu: tamamı zaten
 * okunan kısa bir değerin ("Siyah", "2024") üstüne gelince de "tamamını
 * göster" kutucuğu açılıyordu. Gösterecek fazladan bir şey yokken bilgi
 * kutusu çıkarmak, kullanıcıya bir şey kaçırdığını düşündürüyor.
 *
 * Kesilip kesilmediği ölçülerek anlaşılır (`scrollWidth > clientWidth`);
 * tahmin edilemez, çünkü aynı metin sütun genişliğine göre bir ekranda
 * sığar başka ekranda sığmaz. `ResizeObserver` ile pencere boyutu
 * değiştikçe yeniden ölçülür.
 */
function KunyeDeger({
  metin,
  baslik,
  sarsin,
}: {
  metin: string;
  baslik: string;
  /** Değer kesilmesin, satıra sarsın (ör. konum). */
  sarsin?: boolean;
}) {
  const olcuRef = useRef<HTMLSpanElement>(null);
  const [kesik, setKesik] = useState(false);

  useEffect(() => {
    if (sarsin) return;
    const el = olcuRef.current;
    if (!el) return;
    const olc = () => setKesik(el.scrollWidth > el.clientWidth + 1);
    olc();
    const gozlemci = new ResizeObserver(olc);
    gozlemci.observe(el);
    return () => gozlemci.disconnect();
  }, [metin, sarsin]);

  if (sarsin)
    return (
      <span className="break-words text-sm font-bold leading-snug text-ink-900">
        {metin}
      </span>
    );

  return (
    // Pasifken de sarmalayıcı render edilir: ölçülen düğüm ağaçta yer
    // değiştirirse yeniden bağlanır ve ölçüm kendi kendini tetikler.
    <Baloncuk icerik={metin} baslik={baslik} className="min-w-0" pasif={!kesik}>
      <span
        ref={olcuRef}
        className="block truncate text-sm font-bold text-ink-900"
      >
        {metin}
      </span>
    </Baloncuk>
  );
}


/** Güvence baloncuğunun metni — panelde başlık, üstüne gelince tamamı. */
const GUVENCE_METNI =
  "Kazancınız, alıcı ürünü onaylayana kadar güvenli ödeme sisteminde korunur. " +
  "İade durumunda ücret, ürün size eksiksiz ulaştıktan sonra alıcıya geri ödenir. " +
  "İade tamamlanmazsa ücret iadesi yapılmaz. Böylece kazancınız ve ürününüz korunur.";

export function IlanDetay({
  talep,
  benzer,
  kendiIlanim,
  acikSunumumId,
  sunumumKabulEdildi = false,
  sunumumDurumu,
  sunumumItirazKapandi = false,
  surecDevam = false,
  sahipEpostaOnayli = false,
  sahipTelefonOnayli = false,
  kapandi,
}: {
  talep: Talep;
  benzer: Talep[];
  /**
   * İlan bana mı ait? Sunucuda çözülür: istemcide çözülünce ilk boyamada
   * varsayılan hesap görünüyor ve kapanan ilanda talep sahibine bir an
   * "mevcut değil" yazısı düşüyordu. Hesap değişiminde sayfa zaten
   * tazeleniyor (bkz. HesapMenu).
   */
  kendiIlanim: boolean;
  /** Bu talepte sonuçlanmamış sunumumun kimliği — varsa yeni sunum yapılamaz. */
  acikSunumumId?: string;
  /** Sunumum kabul edildi mi — kapanan talepte de sunuma erişim kalır. */
  sunumumKabulEdildi?: boolean;
  /** Kabul edilen sunumun sipariş adımı — kutudaki metin buna göre değişir. */
  sunumumDurumu?: AnlasmaDurum;
  /** İtiraz/iade süreci kapandı mı — kutu metni buna göre değişir. */
  sunumumItirazKapandi?: boolean;
  /** Talepte süren bir sipariş var mı — varsa yeniden yayına alınamaz. */
  surecDevam?: boolean;
  /**
   * Talep sahibinin e-postası doğrulanmış mı? Sunucudan gelir
   * (bkz. lib/depo.ts → hesapEpostasiOku); güven rozeti buna bakar.
   */
  sahipEpostaOnayli?: boolean;
  /**
   * Talep sahibinin telefonu doğrulanmış mı? Sunucudan gelir
   * (bkz. app/api/telefon). Rozet YALNIZCA gerçekten doğrulanmış numarada
   * çıkar — alan bir dönem hiç dolmadığı için bu dal ölüydü.
   */
  sahipTelefonOnayli?: boolean;
  /** Talebin kapandığı an — doluysa sunum da favori de kapalıdır. */
  kapandi?: string;
}) {
  // Sahiplik aktif hesaba göre belirlenir — hesap değişince ilan da el değiştirir.
  const aktif = useAktifKullanici();
  // Talep sahibinin profil kaydı — kart bilgileri buradan gelir.
  const sahip = getKullanici(talep.sahibi);
  // Kapanan ilanın herkese açık kalma süresi — bilgilendirme için.
  const kalanGorunurlukSaat = gizlenmeyeKalanSaat(talep);
  const [aktifFoto, setAktifFoto] = useState(0);
  // Favori sunucuda tutulur; sayfa yenilenince kaybolmaz.
  const [takip, setTakip] = useState(false);
  useEffect(() => {
    let iptal = false;
    fetch("/api/favoriler")
      .then((r) => (r.ok ? r.json() : { favoriler: [] }))
      .then((v: { favoriler?: string[] }) => {
        if (!iptal) setTakip((v.favoriler ?? []).includes(talep.id));
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [talep.id, aktif?.kullanici]);

  async function favoriDegistir() {
    // Önce ekranda çevir (hızlı geri bildirim), sunucu reddederse geri al.
    const yeni = !takip;
    setTakip(yeni);
    const r = await fetch("/api/favoriler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talepId: talep.id }),
    }).catch(() => undefined);
    if (!r?.ok) {
      setTakip(!yeni);
      return;
    }
    const { favoride } = (await r.json()) as { favoride: boolean };
    setTakip(favoride);
  }
  const [kopyalandi, setKopyalandi] = useState(false);
  const [bildirildi, setBildirildi] = useState(false);
  // Dondurma / yeniden yayına alma — talebi silmeden yayından çekme yolu.
  const [yayinIsliyor, setYayinIsliyor] = useState(false);
  const [yayinHatasi, setYayinHatasi] = useState("");
  // Satışı tamamlanan talebi yeniden açmak bilinçli bir karar olmalı.
  const [yayinSoru, setYayinSoru] = useState(false);
  const router = useRouter();
  const [lightbox, setLightbox] = useState(false);
  // Galeri yalnızca fotoğrafları alır; videolar ayrı oynatıcıda.
  const gorseller = talepGorselleri(talep);
  const videolar = talepVideolari(talep);
  /** Ana alanda video açıksa indisi; fotoğraf gösteriliyorsa `null`. */
  const [aktifVideo, setAktifVideo] = useState<number | null>(null);
  const varMi = gorseller.length > 0;

  // Satıcının kendi sunumunun durumu: pazarlık sürüyor mu, ödeme alındı mı,
  // ürün yolda mı? Sipariş adımına göre tek cümlede özetlenir.
  const [sunumBasligi, sunumAciklamasi] = (():
    | [string, string]
    | [string, string] => {
    if (!sunumumKabulEdildi)
      return [
        "Sunumun inceleniyor",
        "Bu talebe zaten sunum yaptın. Alıcı sunumunu reddederse yeniden sunum yapabilirsin.",
      ];
    switch (sunumumDurumu) {
      case "odeme-bekleniyor":
        return [
          "Sunumun kabul edildi",
          "Alıcının ödemesi bekleniyor; ödeme alınınca kargo süren başlar.",
        ];
      case "kargo-bekleniyor":
        return [
          "Ödeme yapıldı",
          "Ürünü kargoya ver; alıcının ürünü onaylaması bekleniyor.",
        ];
      case "kargoda":
        return [
          "Ürün kargoda",
          "Teslimat sonrası alıcının ürünü onaylaması bekleniyor.",
        ];
      case "teslim-edildi":
        return [
          "Kargo teslim edildi",
          "Alıcının ürünü onaylaması bekleniyor; onaydan sonra ödeme hesabına aktarılır.",
        ];
      case "tamamlandi":
        return [
          "Alışveriş tamamlandı",
          "Alıcı ürünü onayladı; ödemen hesabına aktarıldı.",
        ];
      case "sorunlu":
        // İtiraz kapandıysa (iade tamamlandı ya da satıcı lehine bitti)
        // artık "başladı" demek yanlış olur.
        return sunumumItirazKapandi
          ? [
              "İtiraz süreci sonuçlandı",
              "Süreç kapandı; ayrıntıları sohbetten görebilirsin.",
            ]
          : [
              "İtiraz süreci başladı",
              "Alıcı üründe sorun bildirdi; süreci sohbetten takip et.",
            ];
      default:
        return [
          "Sunumun kabul edildi",
          "Alıcı sunumunu kabul etti; süreci sohbetten takip et.",
        ];
    }
  })();

  const ileri = () => setAktifFoto((i) => (i + 1) % gorseller.length);
  const geri = () =>
    setAktifFoto((i) => (i - 1 + gorseller.length) % gorseller.length);

  useEffect(() => {
    if (!lightbox) return;
    const n = gorseller.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") setAktifFoto((i) => (i + 1) % n);
      else if (e.key === "ArrowLeft") setAktifFoto((i) => (i - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, gorseller.length]);

  /** Talebi dondurur ya da yeniden yayına alır. */
  async function yayinDurumu(islem: "dondur" | "yayinla") {
    if (yayinIsliyor) return;
    setYayinIsliyor(true);
    setYayinHatasi("");
    try {
      const r = await fetch(`/api/talepler/${talep.id}/yayin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islem }),
      });
      if (!r.ok) {
        const v = await r.json().catch(() => ({}));
        throw new Error(v.hata ?? "İşlem tamamlanamadı.");
      }
      router.refresh();
    } catch (e) {
      setYayinHatasi(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setYayinIsliyor(false);
    }
  }

  const talebiPaylas = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setKopyalandi(true);
        setTimeout(() => setKopyalandi(false), 2000);
      });
    }
  };

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-5">
      {/* Kapanan talep 12 saat daha görünür kalır — o sırada sohbete
          girenler ilan bağlamını görebilsin diye. Kalan süreyi söylemek
          bunu tahmin işi olmaktan çıkarır; sayfayı hâlâ görebilen herkes
          (sahibi ve sunum yapanlar) bilmeli, o yüzden en üstte.
          (bkz. lib/talep-durum.ts → gizlenmeyeKalanSaat) */}
      {kalanGorunurlukSaat !== undefined && (
        <div className="mb-4 rounded-control border border-border bg-subtle px-4 py-3 text-[12.5px] font-semibold text-ink-500">
          {kalanGorunurlukSaat > 0
            ? `Bu talep kapandı. Sayfa ${kalanGorunurlukSaat} saat sonra herkese açık listelerden kalkacak; senin ve sunum yapanların kayıtlarında durmaya devam eder.`
            : "Bu talep kapandı ve herkese açık listelerden kalktı; senin ve sunum yapanların kayıtlarında durmaya devam ediyor."}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <nav
          aria-label="Sayfa yolu"
          className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-ink-400"
        >
          <Link href="/" className="text-ink-400 hover:text-primary">
            Ana Sayfa
          </Link>
          {/* Ürün yolu: kategori › tür › çeşit › marka › model › başlık.
              Boş olan kademe atlanır (her talepte hepsi doldurulmuş
              olmayabilir). */}
          {[talep.kategori, talep.tur, talep.cesit, talep.marka, talep.model]
            .map((p) => p?.trim())
            .filter((p): p is string => !!p)
            // Kademeler aynı metni taşıyabilir ("Saat" hem kategori hem tür
            // olabilir); key sıra numarasıyla benzersizleştirilir.
            .map((p, i) => (
              <span key={`${i}-${p}`} className="flex items-center gap-1.5">
                <span aria-hidden>›</span>
                <span>{p}</span>
              </span>
            ))}
          <span aria-hidden>›</span>
          <span className="font-semibold text-ink-900">{talep.baslik}</span>
        </nav>
        <span className="whitespace-nowrap text-[11.5px] font-medium text-ink-400">
          Talep no:{" "}
          <span className="font-semibold text-ink-500">{talepNo(talep.id)}</span>
        </span>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── Sol sütun ── */}
        <div className="flex flex-col gap-4">
          {/* Galeri + Talep detayları (yan yana) */}
          <section className="rounded-panel border border-border bg-card p-5">
            {/* BAŞLIK EN ÜSTTE, TAM GENİŞLİKTE — sunum ekranındaki düzenin
                aynısı. Burada fotoğrafın ALTINDA ve galeri sütununun içinde
                duruyordu: aynı ürünün talebi ile sunumu arka arkaya
                açıldığında iki ekran farklı okunuyor, kullanıcı hangi ilana
                baktığını görmek için aşağı inmek zorunda kalıyordu. Başlık,
                sayfanın ne hakkında olduğunu söyleyen ilk şeydir; görselden
                sonra da bir sütunun içine sıkışmış olarak da gelmez. */}
            <p className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-primary">
              Talep
            </p>
            <h1 className="mt-1 text-[27px] font-extrabold leading-[1.15] tracking-[-0.7px] text-ink-900">
              {talep.baslik}
            </h1>

            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
              {/* Galeri: dikey küçük görsel rayı + ana görsel. */}
              {/*
                GALERİ: ana görsel üstte, küçük kutucuklar ALTINDA.
                Kutucuklar bir dönem ana görselin SOLUNDA dikey bir raydı:
                görsel sayısı arttıkça ray uzuyor, galeri künyeden uzun hâle
                geliyor ve iki sütunun hizası bozuluyordu. Altta yatay
                dizildiğinde sayı arttıkça satır sarar, düzenin yüksekliği
                değişmez. Sunum ekranındaki galeriyle de aynı düzen.

                TEK BİR GÖRSEL OLSA DA KUTUCUK ÇIKAR. Ray "ikinci görselden
                itibaren" çizilmiyor; aktif olan da kendi kutusuyla listede
                duruyor, yoksa kullanıcı kaç görsel olduğunu ve hangisine
                baktığını yalnızca sayaçtan tahmin ediyordu.

                VİDEO DA BİR KUTUCUK. Videolar künyenin altında ayrı bir
                oynatıcı listesindeydi; fotoğraflarla aynı galerinin parçası
                olmadıkları için gözden kaçıyorlardı. Artık kutucuğa
                tıklayınca ana alanda açılıyorlar — sunum ekranındaki
                desenin aynısı.
              */}
              <div className="flex w-full flex-col gap-3 lg:w-[290px] lg:flex-none">
                {aktifVideo !== null ? (
                  <div className="relative aspect-[3/4] w-full max-w-[290px] overflow-hidden rounded-2xl border border-border bg-ink-900">
                    <video
                      src={videolar[aktifVideo]}
                      controls
                      preload="metadata"
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  disabled={!varMi}
                  aria-label="Görseli büyüt ve incele"
                  className={`group relative aspect-[3/4] w-full max-w-[290px] overflow-hidden rounded-2xl border border-border ${
                    varMi
                      ? "cursor-zoom-in bg-subtle"
                      : "ref-image flex cursor-default items-center justify-center"
                  }`}
                >
                  {varMi ? (
                    <Image
                      src={gorseller[aktifFoto]}
                      alt={`${talep.baslik} — görsel ${aktifFoto + 1}`}
                      fill
                      sizes="290px"
                      className="object-contain"
                      priority
                    />
                  ) : (
                    <span className="font-mono text-[11px] text-ink-400">
                      referans görsel {aktifFoto + 1}
                    </span>
                  )}
                  {varMi && (
                    <span className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-ink-900/75 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                      🔍 İncele
                    </span>
                  )}
                </button>
                )}

                <div className="flex flex-wrap gap-2.5">
                  {(varMi ? gorseller : ["", "", ""]).map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAktifFoto(i);
                        setAktifVideo(null);
                      }}
                      aria-label={`${i + 1}. görsel`}
                      className={`relative h-14 w-14 flex-none overflow-hidden rounded-lg border-2 transition-colors ${
                        varMi ? "bg-subtle" : "ref-image"
                      } ${
                        aktifVideo === null && aktifFoto === i
                          ? "border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]"
                          : "border-border hover:border-border-input"
                      }`}
                    >
                      {varMi && (
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-contain"
                        />
                      )}
                    </button>
                  ))}
                  {videolar.map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAktifVideo(i)}
                      aria-label={`${i + 1}. video`}
                      className={`flex h-14 w-14 flex-none items-center justify-center rounded-lg border-2 bg-accent text-[11px] font-extrabold text-ink-900 transition-colors hover:brightness-95 ${
                        aktifVideo === i
                          ? "border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]"
                          : "border-border"
                      }`}
                    >
                      ▸
                    </button>
                  ))}
                </div>
              </div>

              {/* Talep detayları */}
              <div className="min-w-0 flex-1 lg:border-l lg:border-hairline lg:pl-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-primary">
                      Beklentiler
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-ink-900">
                      Talep detayları
                    </h2>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-5">
                  {(() => {
                    const detay = detaySatirlari(talep);
                    // Son satırdaki hücrelerin alt çizgisini kaldır (2 sütun).
                    const sonSatirBasi = Math.floor((detay.length - 1) / 2) * 2;
                    return detay.map((row, i) => (
                      <div
                        key={row.k}
                        className={`py-2.5 ${
                          i < sonSatirBasi ? "border-b border-hairline" : ""
                        }`}
                      >
                        <dt className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-400">
                          {row.k}
                        </dt>
                        <dd className="mt-1 flex min-w-0">
                          <KunyeDeger
                            metin={row.v}
                            baslik={row.k}
                            sarsin={row.sarsin}
                          />
                        </dd>
                      </div>
                    ));
                  })()}
                </dl>
                <p className="mt-3 rounded-card bg-subtle px-3.5 py-3 text-[13.5px] font-semibold leading-relaxed text-ink-900">
                  Görseller yalnızca modeli ve beklenen genel kondisyonu anlatmak
                  için eklendi; teslimatta{" "}
                  <strong className="font-extrabold text-primary-hover">
                    ürünün açıklamaya uygunluğu esastır
                  </strong>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Talep notu */}
          <section className="rounded-panel border border-border bg-card p-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-primary">
              Talep notu
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-ink-900">
              Aradığım ürün hakkında
            </h2>
            <div className="mt-3 space-y-3 break-words text-[14px] leading-relaxed text-ink-700">
              {/* Alıcının kendi yazdığı not — satır araları korunur. */}
              {(talep.aciklama ?? "")
                .split(/\n+/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
            <div className="mt-5 rounded-2xl border border-accent-soft bg-accent-soft/60 p-4">
              <h3 className="text-sm font-bold text-ink-900">Olmazsa olmazlar</h3>
              <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-ink-700">
                <li>
                  ✓ {talep.defoKabul ? "Defolu ürün kabul edilir" : "Ürün defosuz olmalı"}
                </li>
                <li>
                  ✓{" "}
                  {talep.muadilKabul
                    ? "Muadil (eşdeğer) ürün de olur"
                    : "Açıklamaya uygun kondisyon"}
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* ── Sağ sütun (sticky) ── */}
        <aside className="lg:sticky lg:top-[150px]">
          <div className="rounded-[24px] border border-primary/25 bg-gradient-to-b from-primary-soft/40 to-card p-6 shadow-[var(--shadow-pop)]">
            {/* Talep sahibi — tıklayınca profiline gider */}
            <Link
              href={profilYolu(talep.sahibi, aktif?.kullanici)}
              className="group flex items-center gap-3.5 rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Talep sahibi ${talep.sahibi} profiline git`}
            >
              <div className="relative flex-none">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-[18px] font-extrabold text-primary">
                  {sahip?.harf ?? "??"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-primary">
                  Talep sahibi
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  <h3 className="text-[19px] font-extrabold leading-tight text-ink-900 group-hover:text-primary">
                    {talep.sahibi}
                  </h3>
                  {sahip && (
                    <span className="flex items-center gap-1.5">
                      <Yildizlar puan={sahip.puan} />
                      <span className="text-[14px] font-extrabold leading-none text-ink-900">
                        {sahip.puan.toLocaleString("tr-TR", {
                          minimumFractionDigits: 1,
                        })}
                      </span>
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[13px] font-medium text-ink-400">
                  {sahip?.aliciMetrik.tamamlananAlim ?? 0} alım tamamladı
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-ink-400">
                  {sahip?.konum ?? ""}
                </div>
              </div>
            </Link>
            {/* Güven rozeti — YALNIZCA gerçekten doğrulanmış e-posta için.
                Telefon rozeti bir dönem kaldırılmıştı: doğrulama diye bir
                mekanizma yoktu ve dal hiç render edilmiyordu. Akış kurulduğu
                için geri geldi — ama yine YALNIZCA gerçekten doğrulanmış
                numarada. */}
            {(sahipEpostaOnayli || sahipTelefonOnayli) && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {sahipEpostaOnayli && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent-ink">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-[15px] w-[15px] flex-none"
                      aria-hidden
                    >
                      <path d="M4 4h16v16H4z" />
                      <path d="m4 6 8 6 8-6" />
                    </svg>
                    E-posta onaylı
                  </span>
                )}
                {sahipTelefonOnayli && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent-ink">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-[15px] w-[15px] flex-none"
                      aria-hidden
                    >
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
                    </svg>
                    Telefon onaylı
                  </span>
                )}
              </div>
            )}

            {/* İlan tarihi satırı KALDIRILDI: sunum kartında karşılığı yok,
                iki kart yan yana konduğunda tek başına duran bir satırdı.
                Tarih zaten künyede. */}
            <p className="mt-5 border-t border-hairline pt-5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400">
              Alıcının belirlediği fiyat
            </p>
            {/* "! Acil" rozeti fiyatın yanından KALDIRILDI: aynı işaret zaten
                ilan kartının üzerinde duruyor, detayda ikinci kez göstermek
                fiyatın okunmasını bölüyordu. */}
            <div className="mt-2 text-[38px] font-extrabold tracking-[-1px] text-ink-900">
              {fiyatText(talep.fiyatNum)}
            </div>

            {/* Sunumu kabul edilen talep kapanır. Ama kapanış ANLAŞAN iki
                tarafı bağlamaz: alıcı kendi ilanını, satıcı da kabul edilen
                sunumunu görmeye devam eder — süreç sohbette sürüyor. */}
            {kendiIlanim ? (
              <div className="mt-5 w-full cursor-default rounded-control bg-primary px-6 py-4 text-center text-[15.5px] font-extrabold text-white">
                Bu ilan size ait.
              </div>
            ) : acikSunumumId ? (
              <div className="mt-5 w-full rounded-control bg-primary-soft px-6 py-4 text-center">
                <span className="block text-[15.5px] font-extrabold text-primary-hover">
                  {sunumBasligi}
                </span>
                <span className="mt-1 block text-[13px] font-medium leading-snug text-ink-500">
                  {sunumAciklamasi}
                </span>
                <Link
                  href={`/sunum-detay?id=${encodeURIComponent(acikSunumumId)}`}
                  className="mt-2 inline-block text-[13.5px] font-bold text-primary-hover underline underline-offset-2 hover:text-primary"
                >
                  Sunumu görüntüle ›
                </Link>
              </div>
            ) : kapandi ? (
              <div className="mt-5 w-full cursor-default rounded-control border border-border bg-subtle px-6 py-4 text-center">
                <span className="block text-[15.5px] font-extrabold text-ink-500">
                  Bu talep artık mevcut değil.
                </span>
              </div>
            ) : (
              <>
                {/* Sunum yapıp yapmadığım sunucudan geliyor (acikSunumumId);
                    eski statik liste kontrolü hiçbir zaman doğru olmuyordu. */}
                <ButtonLink
                  href={`/sunum-yap/${talep.id}`}
                  variant="lime"
                  size="lg"
                  className="mt-5 w-full"
                >
                  Sunum Yap
                </ButtonLink>
                {/* Favori — kalp üzerine gelince kırmızıya döner. */}
                <button
                  type="button"
                  onClick={() => void favoriDegistir()}
                  aria-pressed={takip}
                  className={`group/fav mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border px-6 py-[15px] text-[15px] font-bold leading-none transition-colors ${
                    takip
                      ? "border-acil-line bg-acil-soft text-acil"
                      : "border-border-input bg-card text-ink-900 hover:border-acil hover:text-acil"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className={`h-[18px] w-[18px] flex-none transition-colors ${
                      takip
                        ? "fill-acil text-acil"
                        : "fill-none group-hover/fav:fill-acil group-hover/fav:text-acil"
                    }`}
                  >
                    <path d="M12 20.5s-7.3-4.6-9.3-9.2A5.1 5.1 0 0112 5.6a5.1 5.1 0 019.3 5.7c-2 4.6-9.3 9.2-9.3 9.2z" />
                  </svg>
                  {takip ? "Favorilerimde ✓" : "Talebi Favorilerime Ekle"}
                </button>
              </>
            )}

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-accent-soft/50 p-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[24px] w-[24px] flex-none text-accent-ink"
                aria-hidden
              >
                <path d="M12 3l7 3v5c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {/* Açıklama metni baloncuğa alındı: paneli üç paragrafla
                  uzatmak yerine başlığın yanındaki "i" işaretine gelince
                  (ya da klavyeyle odaklanınca) anında açılır. */}
              <div className="flex items-center gap-2 text-[15px] font-extrabold leading-snug text-ink-900">
                Kazancınız Güvence Altında
                <Baloncuk
                  icerik={GUVENCE_METNI}
                  baslik="Kazancınız Güvence Altında"
                  className="inline-flex flex-none"
                >
                  <span
                    aria-hidden
                    className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-accent-ink/40 text-[11px] font-extrabold text-accent-ink"
                  >
                    i
                  </span>
                </Baloncuk>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 text-[12px] font-semibold text-ink-400">
              <button
                type="button"
                onClick={talebiPaylas}
                className="transition-colors hover:text-primary"
              >
                {kopyalandi ? "Bağlantı kopyalandı ✓" : "Talebi paylaş"}
              </button>
              <span aria-hidden className="text-ink-300">
                ·
              </span>
              {kendiIlanim ? (
                <>
                  {/* "Talebi yayından kaldır" düğmesi buradaydı. Kaldırıldı:
                      dondurma zaten talebi yayından çekiyor ve kaydı
                      profildeki "Yayından Kalkanlar" bölümüne taşıyor. İki
                      ayrı düğmenin ikisi de aynı yere çıkınca kullanıcı
                      hangisinin ne yaptığını bilemiyordu. Kalıcı silme de
                      artık orada — yani kayıt yayından kalktıktan SONRA. */}
                  {/* Yayındaki talep dondurulur; durmuş talep geri açılır. */}
                  {yenidenYayinlanabilirMi(talep) && !surecDevam ? (
                    <button
                      type="button"
                      disabled={yayinIsliyor}
                      onClick={() => {
                        // Satış tamamlandıysa önce onay sorulur.
                        if (talep.kapandi) setYayinSoru(true);
                        else void yayinDurumu("yayinla");
                      }}
                      className="font-bold text-primary transition-colors hover:brightness-90 disabled:opacity-60"
                    >
                      {yayinIsliyor ? "Yayınlanıyor…" : "Talebi tekrar yayına al"}
                    </button>
                  ) : (
                    !talep.kapandi &&
                    !surecDevam && (
                      <button
                        type="button"
                        disabled={yayinIsliyor}
                        onClick={() => void yayinDurumu("dondur")}
                        // Buz mavisi: dondurma eylemini diğer bağlantılardan ayırır.
                        className="font-bold text-[#38bdf8] transition-colors hover:text-[#0ea5e9] disabled:opacity-60"
                      >
                        {yayinIsliyor ? "Donduruluyor…" : "Talebi dondur"}
                      </button>
                    )
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={bildirildi}
                  onClick={() => {
                    // Şikâyet gerçekten kaydedilir; destek ekibi listesinde
                    // görünür (eskiden yalnızca ekranda teşekkür yazıyordu).
                    setBildirildi(true);
                    void fetch("/api/destek", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        konu: "İlan şikâyeti",
                        refNo: talep.id,
                        baslik: `İlan şikâyeti: ${talep.baslik}`.slice(0, 120),
                        aciklama: `Kullanıcı bu ilanı şikâyet etti. Talep: ${talep.id} · Sahibi: ${talep.sahibi}`,
                      }),
                    }).catch(() => undefined);
                  }}
                  className="transition-colors hover:text-danger disabled:cursor-default"
                >
                  {bildirildi ? "Bildirimin alındı ✓" : "Şikâyet et"}
                </button>
              )}
            </div>

            {kendiIlanim && yayinSoru && (
              <div className="mt-3 rounded-control border border-primary/40 bg-primary-soft/50 p-3.5 text-center">
                <p className="text-[13px] font-bold leading-relaxed text-primary-hover">
                  Bu talep ile aradığın ürüne ulaştın. Yeni bir arayış olarak
                  bu talebi tekrar yayına almak istediğine emin misin?
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    type="button"
                    disabled={yayinIsliyor}
                    onClick={() => {
                      setYayinSoru(false);
                      void yayinDurumu("yayinla");
                    }}
                    className="cursor-pointer rounded-control bg-primary px-4 py-2.5 text-[13px] font-extrabold text-white transition-opacity disabled:opacity-60"
                  >
                    {yayinIsliyor ? "Yayınlanıyor…" : "Evet, yeniden yayınla"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setYayinSoru(false)}
                    className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-4 py-2.5 text-[13px] font-bold text-ink-900"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}

            {kendiIlanim && yayinHatasi && (
              <p role="alert" className="mt-2 text-center text-[12.5px] font-bold text-acil">
                {yayinHatasi}
              </p>
            )}

            {/* Silme onayı buradaydı; düğmesiyle birlikte kalktı.
                Yayından çekme artık dondurma, kalıcı silme ise
                profildeki "Yayından Kalkanlar" bölümünde. */}
          </div>
        </aside>
      </div>

      {/* Benzer talepler */}
      {benzer.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold text-ink-900">
              Benzer Talepler
            </h2>
            <Link href="/kesfet" className="text-[13px] font-semibold">
              Tümünü gör ›
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {benzer.map((t) => (
              <TalepCard key={t.id} talep={t} />
            ))}
          </div>
        </section>
      )}

      {/* Görsel inceleme (lightbox) */}
      {lightbox && varMi && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-ink-900/95 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Görsel inceleme"
        >
          {/* Üst bar */}
          <div className="flex items-center justify-between gap-4 px-5 py-4 text-white">
            <span className="truncate text-sm font-semibold">
              {talep.baslik}
            </span>
            <div className="flex flex-none items-center gap-4">
              <span className="text-[13px] font-medium text-white/70">
                {aktifFoto + 1} / {gorseller.length}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(false);
                }}
                aria-label="Kapat"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white transition-colors hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Görsel + oklar */}
          <div className="relative flex flex-1 items-center justify-center px-4">
            {gorseller.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  geri();
                }}
                aria-label="Önceki görsel"
                className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20 sm:left-6"
              >
                ‹
              </button>
            )}
            <div
              className="relative h-full w-full max-w-[900px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={gorseller[aktifFoto]}
                alt={`${talep.baslik} — görsel ${aktifFoto + 1}`}
                fill
                sizes="(max-width: 900px) 92vw, 900px"
                className="object-contain"
              />
            </div>
            {gorseller.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ileri();
                }}
                aria-label="Sonraki görsel"
                className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20 sm:right-6"
              >
                ›
              </button>
            )}
          </div>

          {/* Küçük görsel şeridi */}
          {gorseller.length > 1 && (
            <div className="flex justify-center gap-2 px-4 pb-6 pt-4">
              {gorseller.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAktifFoto(i);
                  }}
                  aria-label={`${i + 1}. görsel`}
                  className={`relative h-14 w-14 flex-none overflow-hidden rounded-lg border-2 transition ${
                    aktifFoto === i
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
