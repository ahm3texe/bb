"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { profilYolu, useOturumSahibi } from "@/lib/aktif-kullanici";
import { ButtonLink } from "@/components/ui/Button";
import { Yildizlar, puanSayi } from "@/components/ui/Yildizlar";
import { fiyatText } from "@/lib/data";
import { gecenSureIso } from "@/lib/bildirimler";
import { sadeceFotograflar, sadeceVideolar } from "@/lib/gorsel";
import type { Talep } from "@/lib/data";
import type { Sunum } from "@/components/SunumOnizleme";
import {
  SunumKunye,
  SunumNotu,
  kunyeSatirlari,
} from "@/components/SunumOnizleme";

// UYDURMA VARSAYILAN SUNUM KALDIRILDI.
//
// Burada `varsayilanSunum` diye kodda yazılı bir Beyblade takımı (başlık,
// fiyat, açıklama, foto adları) duruyordu ve sayfa `?id` olmadan
// açıldığında bu kurgu sunum, kullanıcının GERÇEK talebinin üstüne
// bindirilerek gösteriliyordu. Sunum karşılaştırma ekranındaki "Sunumu aç"
// bağlantısı da id taşımadığı için gerçek sunumları karşılaştıran alıcı
// tam olarak buraya düşüyordu.
//
// Sunum artık ZORUNLU prop; id'siz istek sayfada 404 (bkz. page.tsx).

/**
 * Kimlik kartının dış kabuğu: ad varsa profile giden bağlantı, yoksa
 * (talebi silinmiş sunum) düz kutu.
 */
function KartSarmal({
  kullanici,
  aktifKullanici,
  etiket,
  children,
}: {
  kullanici: string;
  aktifKullanici: string;
  etiket: string;
  children: React.ReactNode;
}) {
  const cls =
    "group flex items-center gap-3.5 rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-primary";
  if (!kullanici) return <div className={cls}>{children}</div>;
  return (
    <Link
      href={profilYolu(kullanici, aktifKullanici)}
      className={cls}
      aria-label={`${etiket} ${kullanici} profiline git`}
    >
      {children}
    </Link>
  );
}

export function SunumDetayClient({
  sunum,
  sunumId = "",
  talep,
  talepId,
  // Uydurma varsayılanlar KALDIRILDI: burada "plakdukkani34" / "4.8" gibi
  // sabitler vardı. Bugün sayfa hepsini geçiyor, ama bileşen bir gün
  // propsuz render edilirse sessizce sahte kimlik göstermemeli.
  satici = "",
  saticiHarf = "",
  saticiPuan = "",
  saticiDegerlendirme = 0,
  saticiSatis = 0,
  fotoAdlari = [],
  gonderildi,
  /** Sunum bana aitse: sağ panelde talep sahibinin bilgileri gösterilir. */
  sahip = false,
  talepSahibi = "",
  talepSahibiHarf = "",
  talepSahibiPuan = "",
  talepSahibiDegerlendirme = 0,
  talepSahibiAlim = 0,
}: {
  sunum: Sunum;
  /** Sunum kaydının kimliği — sohbet bağlantısı bunun üzerinden kurulur. */
  sunumId?: string;
  /** Sunumun ait olduğu talep — sunucudan gelir. */
  talep?: Talep;
  talepId?: string;
  satici?: string;
  saticiHarf?: string;
  saticiPuan?: string;
  /** Kaç değerlendirme — 0 ise yıldız yerine durum yazılır. */
  saticiDegerlendirme?: number;
  /** Satıcının tamamlanmış satış sayısı (ölçülür, kayda donmaz). */
  saticiSatis?: number;
  fotoAdlari?: string[];
  /** Sunumun gönderilme anı (ISO) — "3 gün önce gönderdi" bundan türer. */
  gonderildi?: string;
  sahip?: boolean;
  talepSahibi?: string;
  talepSahibiHarf?: string;
  talepSahibiPuan?: string;
  talepSahibiDegerlendirme?: number;
  /** Talep sahibinin tamamlanmış alım sayısı. */
  talepSahibiAlim?: number;
}) {
  // Kendi adına tıklayan kullanıcı "Profilim"e gitsin.
  const aktif = useOturumSahibi();
  const [aktifFoto, setAktifFoto] = useState(0);
  // Videolar ve fotoğraflar aynı `gorseller` dizisinde taşınıyor; galeriye
  // yalnızca fotoğraflar, oynatıcıya yalnızca videolar gider.
  const fotograflar = sadeceFotograflar(sunum.gorseller);
  const videolar = sadeceVideolar(sunum.gorseller);
  const [videoAcik, setVideoAcik] = useState(false);
  // Oynatma sayfayı bozmadan üstte açılan katmanda olur.
  const [oynat, setOynat] = useState(false);
  const [aktifVideo, setAktifVideo] = useState(0);
  const [raporNo, setRaporNo] = useState("");
  const [raporlaniyor, setRaporlaniyor] = useState(false);
  const [raporHatasi, setRaporHatasi] = useState("");

  /** Sunumu destek ekibine bildirir — gerçek kayıt açar. */
  async function sunumuBildir() {
    if (raporlaniyor) return;
    setRaporlaniyor(true);
    setRaporHatasi("");
    try {
      const r = await fetch("/api/destek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          konu: "Sunum bildirimi",
          refNo: talepId ?? satici,
          baslik: `Sunum bildirimi: ${sunum.baslik}`,
          aciklama: `${satici} kullanıcısının "${sunum.baslik}" sunumu bildirildi. Destek ekibi sunumu incelemeli.`,
        }),
      });
      const v = (await r.json().catch(() => ({}))) as {
        hata?: string;
        kayit?: { no: string };
      };
      if (!r.ok || !v.kayit) {
        setRaporHatasi(v.hata ?? "Bildirim gönderilemedi.");
        return;
      }
      setRaporNo(v.kayit.no);
    } catch {
      setRaporHatasi("Sunucuya ulaşılamadı.");
    } finally {
      setRaporlaniyor(false);
    }
  }

  // Kimlik kartında gösterilen kullanıcı: kendi sunumumda talep sahibi,
  // alıcı tarafında satıcı.
  const kartKullanici = sahip ? talepSahibi : satici;
  const kartDegerlendirme = sahip
    ? talepSahibiDegerlendirme
    : saticiDegerlendirme;
  const kartPuan = sahip ? talepSahibiPuan : saticiPuan;

  // Talep sunucudan prop olarak gelir; yoksa künye karşılaştırmasız çalışır.
  const satirlar = kunyeSatirlari(sunum, talep, {
    kendiSunumum: sahip,
    fiyatGizli: true,
  });

  // Katman açıkken Esc ile kapanır.
  useEffect(() => {
    if (!oynat) return;
    const kapat = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOynat(false);
    };
    window.addEventListener("keydown", kapat);
    return () => window.removeEventListener("keydown", kapat);
  }, [oynat]);

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[18px]">
      <style>{`@keyframes bbSunumProgress{from{width:0}to{width:100%}}`}</style>

      {/*
        Video oynatma katmanı — GERÇEK oynatıcı.

        Burası bir dönem tamamen kurguydu: "oynatılıyor... (temsili)" yazan
        bir kutu ve 42 saniyeye ayarlanmış SAHTE bir ilerleme çubuğu vardı;
        süre ("0:42") ve içerik açıklaması ("imza ve jelatin kontrolü") de
        kodda yazılıydı. Satıcı kanıt videosunu yüklüyor, alıcı ise onu
        hiçbir zaman izleyemiyordu — üstelik video, alıcının satın alma
        kararındaki en güçlü kanıt.
      */}
      {oynat && videolar[0] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Satıcı videosu"
          onClick={() => setOynat(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[900px]"
          >
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[15px] font-extrabold text-white">
                Satıcı videosu
              </span>
              {videolar.length > 1 && (
                <span className="text-[13px] font-medium text-[#b4a8d6]">
                  {aktifVideo + 1} / {videolar.length}
                </span>
              )}
            </div>
            <video
              key={videolar[aktifVideo]}
              src={videolar[aktifVideo]}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-xl bg-ink-900"
            />
            {videolar.length > 1 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {videolar.map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAktifVideo(i)}
                    className={`rounded-lg px-3 py-2 text-[12px] font-bold ${
                      i === aktifVideo
                        ? "bg-accent text-ink-900"
                        : "bg-white/[0.14] text-white hover:bg-white/[0.24]"
                    }`}
                  >
                    video {i + 1}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setOynat(false)}
              aria-label="Videoyu kapat"
              className="absolute -top-1 right-0 flex h-9 w-9 -translate-y-full items-center justify-center rounded-full bg-white/[0.14] text-[16px] font-bold text-white hover:bg-white/[0.24]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb + sunumlar arası gezinme */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1.5 pb-3.5">
        <nav
          aria-label="Sayfa yolu"
          className="flex flex-wrap items-center gap-1.5 text-[14px] font-medium text-ink-400"
        >
          {sahip ? (
            <>
              <Link
                href="/profil?tab=sunumlar"
                className="text-ink-400 hover:text-primary"
              >
                Sunumlarım
              </Link>
              <span aria-hidden>›</span>
              <Link
                href={`/ilan/${talep?.id ?? talepId ?? ""}`}
                className="text-ink-400 hover:text-primary"
              >
                {talep?.baslik ?? "Talep"}
              </Link>
              <span aria-hidden>›</span>
              <span className="font-semibold text-ink-900">Sunumum</span>
            </>
          ) : (
            <>
              {/* Başlığı yazan bağlantı O ilana gitmeli; id'siz hâli
                  kullanıcının başka bir ilanını açıyordu. */}
              <Link
                href={
                  talep?.id
                    ? `/ilan-yonetimi?id=${encodeURIComponent(talep.id)}`
                    : "/ilan-yonetimi"
                }
                className="text-ink-400 hover:text-primary"
              >
                İlanım: {talep?.baslik ?? "İlanım"}
              </Link>
              <span aria-hidden>›</span>
              <Link
                href="/sunum-karsilastirma"
                className="text-ink-400 hover:text-primary"
              >
                Gelen Sunumlar ({talep?.sunum ?? 0})
              </Link>
              <span aria-hidden>›</span>
              <span className="font-semibold text-ink-900">{satici}</span>
            </>
          )}
        </nav>
        {/* SUNUM SAYACI VE OKLARI KALDIRILDI.

            Burada "Sunum 1 / N" yazan bir sayaç ve iki gezinme oku vardı.
            Oklar bir düğme bile değildi (title="Yakında"): sunumlar arası
            geçiş diye bir şey yok. Sayaç da uydurmaydı — açılan sunumun
            listede kaçıncı olduğu hiç hesaplanmıyor, her zaman "1"
            yazılıyordu. Sunumlar arası geçiş istenirse gerçek sıra
            bilgisiyle geri gelir. */}
      </div>

      {/* Sütunlar aynı hizada bitsin: sol panel satır yüksekliğine uzar,
          sağdaki karar paneli yapışkan kaldığı için kendi hizasında durur. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Sunumun kendisi: satıcının önizlemede onayladığı ekranın aynısı ── */}
        <div className="flex min-w-0 flex-col gap-4">
          <section className="flex flex-1 flex-col rounded-panel border border-border bg-card p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-primary">
                  Sunum
                </div>
                <h1 className="mt-1.5 break-words text-[24px] font-extrabold leading-snug text-ink-900">
                  {sunum.baslik}
                </h1>
                {/* Muadil sunum, alıcının aradığı ürünün birebir aynısı
                    değildir — başlığın hemen altında açıkça söylenir. */}
                {sunum.muadil && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-star px-2.5 py-1.5 text-[11px] font-bold leading-none text-ink-900">
                    MUADİL ÜRÜN
                  </span>
                )}
                <div className="mt-1.5 text-[13.5px] font-medium text-ink-400">
                  {sahip ? (
                    <span className="font-semibold text-ink-900">Sen</span>
                  ) : (
                    <Link
                      href={profilYolu(satici, aktif.kullanici)}
                      className="font-semibold text-ink-900 hover:text-primary"
                    >
                      {satici}
                    </Link>
                  )}{" "}
                  {/* "1 gün önce" YAZIYORDU — kodda sabit. Sunumun
                      gönderilme damgası kayıtta duruyor. */}
                  {gonderildi
                    ? ` · ${gecenSureIso(gonderildi)} önce gönderdi`
                    : ""}{" "}
                  · {sunum.fotolar} fotoğraf
                  {videolar.length > 0 ? ` · ${videolar.length} video` : ""}
                </div>
              </div>
            </div>

            {/* Galeri + künye — sunum yap önizlemesiyle aynı düzen.
                Video da aynı pencerede açılır; oynatma tam ekran katmanda. */}
            <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row">
              {/* Galerinin üst hizası künyenin ilk etiketiyle (FİYAT TEKLİFİ)
                  aynı olsun diye künye hücrelerinin üst dolgusu kadar iner. */}
              <div className="flex w-full flex-col gap-2.5 pt-2.5 lg:w-[300px] lg:flex-none">
                {/* Çerçeve ilan sayfasındaki galerinin AYNISI
                    (`rounded-2xl border border-border`). Burada çerçeve hiç
                    yoktu: fotoğraf `object-contain` ile sığdığı için
                    yanlarda kalan boşluk sayfa zeminine karışıyor, görselin
                    nerede başlayıp bittiği belli olmuyordu. Aynı bileşenin
                    iki ekranda iki farklı görünmesi de tutarsızdı. */}
                <div
                  className={`relative flex aspect-[3/4] min-w-0 flex-1 items-center justify-center self-start overflow-hidden rounded-2xl border border-border ${
                    videoAcik
                      ? "bg-ink-900"
                      : fotograflar[aktifFoto]
                        ? "bg-subtle"
                        : "ref-image"
                  }`}
                >
                  {videoAcik && videolar[0] ? (
                    <>
                      {/* Süre ("0:42") ve içerik açıklaması ("imza ve
                          jelatin kontrolü — temsili") burada kodda
                          yazılıydı; ikisi de uydurmaydı. Kare gerçek
                          videodan geliyor, oynatma tam ekran katmanda. */}
                      <video
                        src={videolar[0]}
                        preload="metadata"
                        muted
                        playsInline
                        className="h-full w-full object-cover opacity-70"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAktifVideo(0);
                          setOynat(true);
                        }}
                        aria-label="Videoyu oynat"
                        className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-accent text-[22px] font-extrabold text-ink-900 hover:brightness-95"
                      >
                        ▶
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-ink-900/[0.82] px-2.5 py-1.5 text-[11px] font-semibold text-white">
                        {aktifFoto + 1} / {sunum.fotolar}
                      </span>
                      {fotograflar[aktifFoto] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fotograflar[aktifFoto]}
                          alt={`Fotoğraf ${aktifFoto + 1}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="font-mono text-[11px] text-ink-400">
                          {fotoAdlari[aktifFoto]}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* KÜÇÜK GÖRSELLER ANA GÖRSELİN ALTINDA.
                    Dikey bir raydı ve ana görselin SOLUNDA duruyordu:
                    fotoğraf sayısı arttıkça ray uzuyor, galeri künyeden
                    daha uzun hâle geliyor ve iki sütunun hizası bozuluyordu.
                    Altta yatay dizildiğinde sayı arttıkça satır sarar,
                    düzenin yüksekliği değişmez. */}
                <div className="flex flex-wrap gap-2">
                  {/* TEK FOTOĞRAF OLSA DA KUTUCUK ÇIKAR.
                      Ray `slice(1)` ile çiziliyordu, yani AKTİF olan
                      listede hiç yer almıyordu: tek fotoğraflı bir sunumda
                      ortada hiç kutucuk olmuyor, birden fazlasında da
                      kullanıcı hangisine baktığını yalnızca "1 / 3"
                      sayacından çıkarabiliyordu. Artık aktif olan da kendi
                      kutusuyla listede ve seçili hâliyle işaretli. */}
                  {fotoAdlari.map((ad, i) => (
                    <button
                      key={ad}
                      type="button"
                      onClick={() => {
                        setAktifFoto(i);
                        setVideoAcik(false);
                      }}
                      aria-label={`${ad} fotoğrafı`}
                      className={`flex aspect-[3/4] w-[52px] flex-none items-center justify-center overflow-hidden rounded-lg border-2 font-mono text-[9.5px] text-ink-400 transition-colors ${
                        fotograflar[i] ? "" : "ref-image"
                      } ${
                        !videoAcik && aktifFoto === i
                          ? "border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]"
                          : "border-border hover:border-border-input"
                      }`}
                    >
                      {fotograflar[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fotograflar[i]}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        `foto ${i + 1}`
                      )}
                    </button>
                  ))}
                  {videolar.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setVideoAcik(true)}
                      aria-label="Satıcı videosunu oynat"
                      className={`flex aspect-[3/4] w-[52px] flex-none items-center justify-center rounded-lg border-2 bg-accent text-[11px] font-extrabold text-ink-900 transition-colors hover:brightness-95 ${
                        videoAcik
                          ? "border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]"
                          : "border-border"
                      }`}
                    >
                      ▸ video
                    </button>
                  )}
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-1 flex-col self-stretch">
                <SunumKunye satirlar={satirlar} />
              </div>
            </div>

            <div className="mt-4">
              <SunumNotu metin={sunum.aciklama ?? ""} baslik="Satıcının notu" />
            </div>
          </section>
        </div>

        {/* ── Karar paneli ── */}
        <aside className="flex flex-col gap-3.5 self-start lg:sticky lg:top-[150px]">
          {/* Kimlik kartı: alıcı tarafında satıcı, kendi sunumumda talep sahibi.
              Düzen, ilan detayındaki "talep sahibi" kartıyla aynı: aynı avatar
              boyu, aynı üst etiket, aynı yıldız dizisi ve aynı fiyat hiyerarşisi
              (küçük etiket + büyük rakam). İki ekran arasında gezinen kullanıcı
              aynı kartı okuduğunu hissetsin. */}
          <div className="rounded-[24px] border border-primary/25 bg-gradient-to-b from-primary-soft/40 to-card p-6 shadow-[var(--shadow-pop)]">
            {/* Kart başlığı bütünüyle bağlantı: ilan detayındaki talep sahibi
                kartında olduğu gibi avatar da, ad da profile gider. Kendi
                sunumuna bakan satıcı da böylece talep sahibinin profiline
                geçebiliyor. */}
            {/* Talebi silinmiş sunumda ad boş kalabiliyor; o durumda kart
                bağlantı DEĞİL düz kutudur. Bir dönem `href="#"` + engellenen
                tıklama vardı: etkisizdi ama yine de bağlantı gibi
                görünüyordu. */}
            <KartSarmal
              kullanici={kartKullanici}
              aktifKullanici={aktif.kullanici}
              etiket={sahip ? "Talep sahibi" : "Satıcı"}
            >
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-primary-soft text-[18px] font-extrabold text-primary">
                {sahip ? talepSahibiHarf : saticiHarf}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-primary">
                  {sahip ? "Talep sahibi" : "Satıcı"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  <h3 className="text-[19px] font-extrabold leading-tight text-ink-900 group-hover:text-primary">
                    {kartKullanici}
                  </h3>
                  {/* Puan ROLE GÖRE: alıcı tarafında satıcılık puanı, kendi
                      sunumumda talep sahibinin ALICILIK puanı. Hiç
                      değerlendirme yoksa "0,0" yerine durum yazılır. */}
                  {kartDegerlendirme > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <Yildizlar puan={puanSayi(kartPuan)} />
                      <span className="text-[14px] font-extrabold leading-none text-ink-900">
                        {kartPuan}
                      </span>
                      <span className="text-[12.5px] font-semibold text-ink-400">
                        ({kartDegerlendirme})
                      </span>
                    </span>
                  ) : (
                    <span className="text-[12.5px] font-semibold text-ink-400">
                      {sahip ? "Alıcı" : "Satıcı"} olarak henüz
                      değerlendirilmemiş
                    </span>
                  )}
                </div>
                {/* "12 talep tamamladı" / "214 satış" KODDA YAZILIYDI:
                    her satıcıya 214 satış, her alıcıya 12 talep. Alıcı tam
                    da bu sayılara bakarak satıcı seçiyor. İkisi de artık
                    ölçülen değerden geliyor. */}
                <div className="mt-1 text-[13px] font-medium text-ink-400">
                  {sahip
                    ? `${talepSahibiAlim} alım tamamladı`
                    : `${saticiSatis} satış tamamladı`}
                </div>
                {/* Konum, ilan detayındaki talep sahibi kartındaki gibi ismin
                    hemen altında: kendi sunumumda alıcının teslimat yeri,
                    alıcı tarafında satıcının gönderi yeri. */}
                <div className="mt-0.5 text-[13px] font-medium text-ink-400">
                  {sahip
                    ? [talep?.ilce, talep?.il].filter(Boolean).join(", ")
                    : [sunum.ilce, sunum.il].filter(Boolean).join(", ")}
                </div>
              </div>
            </KartSarmal>

            {/* "Hızlı kargo" rozeti KALDIRILDI: kodda yazılı sabitti,
                satıcının gerçek kargolama hızıyla ilgisi yoktu. */}

            {/* Ayrı "Teslimat konumu" satırı KALDIRILDI: konum artık ismin
                altında, ilan detayındaki kartla aynı yerde. */}
            {/* "Alıcının bütçesi" satırı KALDIRILDI: aynı rakam hemen
                altta "Alıcının ilan fiyatı" olarak zaten yazıyor. */}

            {/* Fiyat — ilan detayındaki gibi: üstte küçük etiket, altında
                büyük rakam. İlan fiyatı hemen altında ince bir satır olarak
                durur ki karşılaştırma tek bakışta okunsun. */}
            <div className="mt-5 border-t border-hairline pt-5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400">
                {sahip ? "Sunum fiyatın" : "Satıcının fiyatı"}
              </p>
              <div className="mt-2 text-[38px] font-extrabold leading-none tracking-[-1px] text-ink-900">
                {fiyatText(sunum.fiyatNum)}
              </div>
              {/* Alıcının ilan fiyatı doğrudan sunum fiyatının ALTINDA ve
                  ona yakın bir boyutta durur: iki rakam alt alta, aynı sol
                  hizada okunsun. Mor renk, karşılaştırılan ikinci değer
                  olduğunu belli eder. */}
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="text-[26px] font-extrabold leading-none tracking-[-0.5px] text-primary">
                  {fiyatText(talep?.fiyatNum ?? 0)}
                </span>
                <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-primary">
                  Alıcının ilan fiyatı
                </span>
              </div>
            </div>

            {/* "⚠ 15.000 TL pahalı teklif" uyarısı buradaydı. Kaldırıldı:
                iki fiyat zaten üst üste yazılı (satıcının teklifi ve
                alıcının ilan fiyatı), farkı ayrıca kırmızıyla söylemek
                pazarlığın normal bir adımını hata gibi gösteriyordu. */}

            {/* Sohbet, sunumun KENDİ sohbetidir. Bağlantı `?satici=` ile
                kuruluyordu; satıcı kendi sunumuna bakarken bu kendi adı
                oluyor, mesajlar ekranı eşleşme bulamayıp listenin İLK
                sohbetini açıyordu — alakasız bir alıcının konuşması. */}
            <ButtonLink
              href={`/mesajlar?sunum=${encodeURIComponent(sunumId)}`}
              variant="primary"
              size="lg"
              className="mt-5 w-full"
            >
              Sohbete Geç
            </ButtonLink>
            {/* Satıcı kendi sunumuna bakarken buradaki cümle kaldırıldı;
                düğmenin kendisi zaten sohbete götürüyor. */}
            {!sahip && (
              <p className="mt-2.5 text-center text-[12.5px] font-medium leading-relaxed text-ink-400">
                Teklifi kabul etmek, revize etmek veya reddetmek için sohbete
                git.
              </p>
            )}

            <div
              className={`mt-3 flex items-center justify-center gap-4 ${
                sahip ? "hidden" : ""
              }`}
            >
              {/* GERÇEK destek kaydı açar. Eskiden yalnızca yerel state
                  çevirip "Bildirimin alındı" yazıyordu; aldatıcı bir sunumu
                  bildirmenin işleyen bir yolu yoktu. */}
              {!raporNo ? (
                <button
                  type="button"
                  disabled={raporlaniyor}
                  onClick={sunumuBildir}
                  className="cursor-pointer text-[15px] font-bold text-ink-900 underline decoration-ink-900/30 underline-offset-4 hover:text-primary hover:decoration-primary disabled:opacity-60"
                >
                  {raporlaniyor ? "Gönderiliyor…" : "Sunumu bildir"}
                </button>
              ) : (
                <span className="text-[13px] font-semibold leading-snug text-accent-ink">
                  Bildirimin alındı ({raporNo}), ekibimiz inceleyecek.
                </span>
              )}
              {raporHatasi && (
                <span
                  role="alert"
                  className="text-[13px] font-bold text-danger"
                >
                  {raporHatasi}
                </span>
              )}
            </div>

            {/* Kriter uyumu kutusu ("5 kriterden 5'i uyuyor") KALDIRILDI:
                künyedeki satırların yanında zaten uyum/uyumsuzluk işareti
                var, bu kutu aynı şeyi ikinci kez özetliyordu. */}
            {sahip && (
              <div className="mt-2.5 rounded-2xl bg-accent px-4 py-3.5 text-center text-[15px] font-extrabold text-ink-900">
                Bu sunum size ait.
              </div>
            )}

            {/* İnceleme ipucu — yalnızca alıcı tarafında anlamlı. Kartın
                dışında ayrı bir kutu olarak duruyordu; ilan detayındaki
                güvence bloğu gibi kartın son bloğu oldu. */}
            {!sahip && (
              <div className="mt-2.5 rounded-2xl bg-accent p-4">
                <div className="text-[13px] font-bold leading-snug text-accent-ink">
                  İnceleme ipucu
                </div>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-accent-ink">
                  İmzalı ürünlerde sertifika numarasını ve imza fotoğrafını
                  mutlaka karşılaştır; şüphen varsa sohbete geçmeden önce sunumu
                  bildir.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
