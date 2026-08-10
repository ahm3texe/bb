"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { getTalep, KENDI_TALEP_ID, fiyatText } from "@/lib/data";
import type { Sunum } from "@/components/SunumOnizleme";
import {
  SunumKunye,
  SunumNotu,
  eslesmeOzeti,
  kunyeSatirlari,
} from "@/components/SunumOnizleme";

// Satıcının 6 adımda gönderdiği örnek sunum — alıcı tarafındaki varsayılan.
const varsayilanSunum: Sunum = {
  baslik: "Jelatininde Avrupa baskısı Dawn FM · imza kartlı",
  fiyatNum: 4250,
  urun: "The Weeknd Dawn FM",
  muadil: false,
  yil: "2022",
  durum: "Kutusu açılmamış",
  defoVar: false,
  kutu: true,
  fatura: false,
  aksesuar: true,
  teslim: "Bugün kargoda",
  kargo: "Kargo satıcıya ait",
  il: "İstanbul",
  ilce: "Beyoğlu",
  aciklama:
    "Jelatininde Avrupa baskısı Dawn FM. İmza kartla birlikte, COA sertifikası mevcut — sertifika numarası videoda ve 4. fotoğrafta görünüyor. Sigarasız evde saklandı, aynı gün kargolarım.",
  fotolar: 5,
  video: true,
};

const varsayilanFotoAdlari = [
  "ön kapak",
  "arka kapak",
  "imza kartı",
  "COA",
  "disk",
];

export function SunumDetayClient({
  sunum = varsayilanSunum,
  talepId = KENDI_TALEP_ID,
  satici = "plakdukkani34",
  saticiHarf = "PD",
  saticiPuan = "4.8",
  fotoAdlari = varsayilanFotoAdlari,
  /** Sunum bana aitse: sağ panelde talep sahibinin bilgileri gösterilir. */
  sahip = false,
  talepSahibi = "Elif Doğan",
  talepSahibiHarf = "ED",
  talepSahibiPuan = "4.9",
}: {
  sunum?: Sunum;
  talepId?: string;
  satici?: string;
  saticiHarf?: string;
  saticiPuan?: string;
  fotoAdlari?: string[];
  sahip?: boolean;
  talepSahibi?: string;
  talepSahibiHarf?: string;
  talepSahibiPuan?: string;
} = {}) {
  const [aktifFoto, setAktifFoto] = useState(0);
  const [videoAcik, setVideoAcik] = useState(false);
  // Oynatma sayfayı bozmadan üstte açılan katmanda olur.
  const [oynat, setOynat] = useState(false);
  const [raporlandi, setRaporlandi] = useState(false);

  const talep = getTalep(talepId);
  const satirlar = kunyeSatirlari(sunum, talep);
  const { uyan, toplam, farkli } = eslesmeOzeti(satirlar, talep);

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

      {/* Video oynatma katmanı — sayfa düzeni bozulmadan üstte açılır. */}
      {oynat && (
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
              <span className="text-[13px] font-medium text-[#b4a8d6]">
                0:42 · imza ve jelatin kontrolü
              </span>
            </div>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-ink-900">
              <span className="text-[13px] font-semibold text-[#b4a8d6]">
                oynatılıyor... (temsili)
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-white/[0.18]">
                <div
                  className="h-full bg-accent"
                  style={{ animation: "bbSunumProgress 42s linear forwards" }}
                />
              </div>
            </div>
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
                href={`/ilan/${talepId}`}
                className="text-ink-400 hover:text-primary"
              >
                {talep?.baslik ?? "Talep"}
              </Link>
              <span aria-hidden>›</span>
              <span className="font-semibold text-ink-900">Sunumum</span>
            </>
          ) : (
            <>
              <Link
                href="/ilan-yonetimi"
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
        <div className={`flex items-center gap-2 ${sahip ? "hidden" : ""}`}>
          <span className="text-[13px] font-semibold text-ink-400">
            Sunum 1 / {talep?.sunum ?? 1}
          </span>
          <span
            aria-disabled
            title="İlk sunum"
            className="flex h-[32px] w-[32px] cursor-not-allowed items-center justify-center rounded-lg bg-[#efebf5] text-[15px] font-bold text-[#cdc2e0]"
          >
            ‹
          </span>
          <span
            aria-disabled
            title="Yakında"
            className="flex h-[32px] w-[32px] cursor-not-allowed items-center justify-center rounded-lg bg-[#efebf5] text-[15px] font-bold text-[#cdc2e0]"
          >
            ›
          </span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Sunumun kendisi: satıcının önizlemede onayladığı ekranın aynısı ── */}
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-panel border border-border bg-card p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-primary">
                  {sahip ? "Gönderdiğin sunum" : "Sana özel sunum"}
                </div>
                <h1 className="mt-1.5 text-[24px] font-extrabold leading-snug text-ink-900">
                  {sunum.baslik}
                </h1>
                <div className="mt-1.5 text-[13.5px] font-medium text-ink-400">
                  {sahip ? (
                    <span className="font-semibold text-ink-900">Sen</span>
                  ) : (
                    <Link
                      href="/satici-profili"
                      className="font-semibold text-ink-900 hover:text-primary"
                    >
                      {satici}
                    </Link>
                  )}{" "}
                  · 1 gün önce gönderdi · {sunum.fotolar} fotoğraf
                  {sunum.video ? " · 1 video" : ""}
                </div>
              </div>
              <span
                className={`flex-none rounded-full px-3.5 py-2 text-[13px] font-bold ${
                  farkli.length === 0
                    ? "bg-accent text-ink-900"
                    : "bg-primary-soft text-primary-hover"
                }`}
              >
                {uyan}/{toplam} kriterin uyuyor
              </span>
            </div>

            {/* Galeri + künye — sunum yap önizlemesiyle aynı düzen.
                Video da aynı pencerede açılır; oynatma tam ekran katmanda. */}
            <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row">
              <div className="flex w-full items-start gap-2.5 lg:w-[300px] lg:flex-none">
                <div className="flex flex-col gap-2">
                  {fotoAdlari.slice(1).map((ad, i) => (
                    <button
                      key={ad}
                      type="button"
                      onClick={() => {
                        setAktifFoto(i + 1);
                        setVideoAcik(false);
                      }}
                      aria-label={`${ad} fotoğrafı`}
                      className={`ref-image flex aspect-[3/4] w-[52px] flex-none items-center justify-center rounded-lg border-2 font-mono text-[9.5px] text-[#968cac] transition-colors ${
                        !videoAcik && aktifFoto === i + 1
                          ? "border-primary"
                          : "border-transparent hover:border-border-input"
                      }`}
                    >
                      foto {i + 2}
                    </button>
                  ))}
                  {sunum.video && (
                    <button
                      type="button"
                      onClick={() => setVideoAcik(true)}
                      aria-label="Satıcı videosunu oynat"
                      className={`flex aspect-[3/4] w-[52px] flex-none items-center justify-center rounded-lg border-2 bg-accent text-[11px] font-extrabold text-ink-900 transition-colors hover:brightness-95 ${
                        videoAcik ? "border-primary" : "border-transparent"
                      }`}
                    >
                      ▸ video
                    </button>
                  )}
                </div>

                <div
                  className={`relative flex aspect-[3/4] min-w-0 flex-1 items-center justify-center self-start overflow-hidden rounded-xl ${
                    videoAcik ? "bg-ink-900" : "ref-image"
                  }`}
                >
                  {videoAcik ? (
                    <>
                      <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/[0.14] px-2.5 py-1.5 text-[11px] font-semibold text-white">
                        Satıcı videosu · 0:42
                      </span>
                      <button
                        type="button"
                        onClick={() => setOynat(true)}
                        aria-label="Videoyu oynat"
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-[22px] font-extrabold text-ink-900 hover:brightness-95"
                      >
                        ▶
                      </button>
                      <span className="absolute bottom-3.5 left-3.5 text-[12px] font-semibold text-[#b4a8d6]">
                        imza ve jelatin kontrolü — temsili
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-ink-900/[0.82] px-2.5 py-1.5 text-[11px] font-semibold text-white">
                        {aktifFoto + 1} / {sunum.fotolar}
                      </span>
                      <span className="font-mono text-[11px] text-[#968cac]">
                        {fotoAdlari[aktifFoto]}
                      </span>
                    </>
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
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          {/* Sunum bana aitse en üstte lime şerit */}
          {sahip && (
            <div className="rounded-panel bg-accent px-5 py-4 text-center text-[16px] font-extrabold text-ink-900">
              Bu sunum size ait.
            </div>
          )}

          {/* Kimlik kartı: alıcı tarafında satıcı, kendi sunumumda talep sahibi */}
          <div className="rounded-panel border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-accent">
                {sahip ? talepSahibiHarf : saticiHarf}
              </div>
              <div className="flex-1">
                {sahip ? (
                  <>
                    <div className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-primary">
                      Talep sahibi
                    </div>
                    <div className="mt-0.5 text-[16px] font-bold leading-tight text-ink-900">
                      {talepSahibi}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-ink-400">
                      <span className="font-bold text-star">
                        ★ {talepSahibiPuan}
                      </span>{" "}
                      · 12 talep tamamladı
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/satici-profili"
                      className="block text-[16px] font-bold leading-tight text-ink-900 hover:text-primary"
                    >
                      {satici}
                    </Link>
                    <div className="mt-1 text-[13px] font-medium text-ink-400">
                      <span className="font-bold text-star">★ {saticiPuan}</span>{" "}
                      · 214 satış
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-ink-400">
                      2023&apos;ten beri
                    </div>
                  </>
                )}
              </div>
              <span className="rounded-full bg-primary-soft px-[9px] py-1.5 text-[11px] font-bold text-primary-hover">
                {sahip ? "Kimlik doğrulandı" : "Hızlı kargo"}
              </span>
            </div>
            <div className="mt-3.5 flex justify-between border-t border-hairline pt-3.5 text-[13.5px] font-medium">
              <span className="text-ink-400">
                {sahip ? "Teslimat konumu" : "Konum"}
              </span>
              <span className="font-semibold text-ink-900">
                {sahip
                  ? [talep?.ilce, talep?.il].filter(Boolean).join(", ")
                  : [sunum.ilce, sunum.il].filter(Boolean).join(", ")}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-[13.5px] font-medium">
              <span className="text-ink-400">
                {sahip ? "Alıcının bütçesi" : "Ort. kargolama"}
              </span>
              <span className="font-semibold text-ink-900">
                {sahip ? fiyatText(talep?.fiyatNum ?? 0) : "1 gün"}
              </span>
            </div>
          </div>

          {/* Beklentilerinle karşılaştırma */}
          <div className="rounded-panel bg-footer p-5">
            <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-accent">
              Kriter uyumu
            </div>
            <div className="mt-2 text-[15.5px] font-extrabold text-accent">
              {uyan}/{toplam} kriterin uyuyor
            </div>
            {farkli.length === 0 ? (
              <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-accent">
                {uyan === toplam
                  ? "✓ Bu sunum ilanında yazdığın her koşulu karşılıyor."
                  : "✓ Çelişen bir koşul yok; kalan kriterler sunumda belirtilmemiş."}
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {farkli.map((r) => (
                  <li
                    key={r.k}
                    className="text-[13.5px] font-medium leading-snug text-accent"
                  >
                    ⚠ <span className="font-bold">{r.k}:</span> {r.v} —{" "}
                    {r.beklenti}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fiyat + sohbet */}
          <div className="rounded-panel border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-primary">
                {sahip ? "Sunum fiyatın" : "Satıcının fiyatı"}
              </span>
              <span className="text-[22px] font-extrabold text-primary-hover">
                {fiyatText(sunum.fiyatNum)}
              </span>
            </div>

            <ButtonLink
              href="/mesajlar"
              variant="primary"
              size="lg"
              className="mt-2 w-full"
            >
              Sohbete Geç
            </ButtonLink>
            <p className="mt-2.5 text-center text-[12.5px] font-medium leading-relaxed text-ink-400">
              {sahip
                ? "Alıcıyla pazarlık sohbette sürer; teklifini orada revize edebilirsin."
                : "Teklifi kabul etmek, revize etmek veya reddetmek için sohbete git."}
            </p>

            <div
              className={`mt-3 flex items-center justify-center gap-4 ${
                sahip ? "hidden" : ""
              }`}
            >
              {!raporlandi ? (
                <button
                  type="button"
                  onClick={() => setRaporlandi(true)}
                  className="cursor-pointer text-[15px] font-bold text-ink-900 underline decoration-ink-900/30 underline-offset-4 hover:text-primary hover:decoration-primary"
                >
                  Sunumu bildir
                </button>
              ) : (
                <span className="text-[13px] font-semibold leading-snug text-accent-ink">
                  Bildirimin alındı, ekibimiz inceleyecek.
                </span>
              )}
            </div>
          </div>

          {/* İnceleme ipucu — yalnızca alıcı tarafında anlamlı */}
          <div
            className={`rounded-card border border-[#f1e3b8] bg-accent p-4 ${
              sahip ? "hidden" : ""
            }`}
          >
            <div className="text-[13px] font-bold leading-snug text-accent-ink">
              İnceleme ipucu
            </div>
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-accent-ink">
              İmzalı ürünlerde sertifika numarasını ve imza fotoğrafını mutlaka
              karşılaştır; şüphen varsa sohbete geçmeden önce sunumu bildir.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
