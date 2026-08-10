"use client";

import { useState } from "react";
import Link from "next/link";
import { getTalep, fiyatText } from "@/lib/data";
import type { Talep } from "@/lib/data";
import { TalepCard } from "@/components/TalepCard";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/Button";
import { HesapNav } from "@/components/HesapNav";
import { HesapKart } from "@/components/HesapKart";
import { eslesmeOzeti, kunyeSatirlari } from "@/components/SunumOnizleme";
import { GELEN_TALEP_ID, gelenSunumlar } from "@/lib/gelen-sunumlar";
import { sunumlarim } from "@/lib/sunumlarim";

type Tab = "talepler" | "gelen" | "sunumlar" | "takip" | "yorumlar";

const pill =
  "inline-flex flex-none items-center rounded-full px-[11px] py-[7px] text-[11.5px] font-bold leading-none";

// Kendi açık taleplerim (3) ve takip ettiklerim (3) — seed'ten seçili.
const taleplerimIds = [
  "dawn-fm-imzali-cd",
  "kraftwerk-man-machine-plak",
  "tutunamayanlar-ilk-baski",
];
const takipIds = [
  "daft-punk-discovery-plak",
  "nokia-3310-kutulu",
  "polaroid-600-film",
];


const yorumlar = [
  {
    ad: "analogmarket",
    harf: "AM",
    rol: "Satıcıdan",
    rolVariant: "violet" as const,
    urun: "Polaroid 600 talebi",
    tarih: "Haziran 2026",
    text: "Hızlı karar verdi, ödeme anında onaylandı. Kargo adresi ve iletişim netti — harika bir alıcı.",
  },
  {
    ad: "retrodukkan",
    harf: "RD",
    rol: "Satıcıdan",
    rolVariant: "violet" as const,
    urun: "Sega Dreamcast talebi",
    tarih: "Mayıs 2026",
    text: "İletişimi çok net, pazarlık centilmence geçti. Teslimat onayını hiç geciktirmedi.",
  },
  {
    ad: "cdkolik",
    harf: "CK",
    rol: "Alıcıdan",
    rolVariant: "lime" as const,
    urun: 'Radiohead "OK Computer" CD satışı',
    tarih: "Nisan 2026",
    text: "Ürün anlatıldığı gibi geldi, paketleme çok özenliydi. Güvenilir satıcı, teşekkürler.",
  },
];



// Küçük, sade çizgi ikonlar (renkli/zıplayan değil — işi tatlandıran dokunuş).
function TabIcon({ tip }: { tip: Tab }) {
  const cls = "h-[17px] w-[17px] flex-none";
  const p = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (tip === "talepler")
    // büyüteç — aradıklarım
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M20 20l-4.5-4.5" />
      </svg>
    );
  if (tip === "sunumlar")
    // koli — sattıklarım / sunumlarım
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3.3 8L12 13l8.7-5M12 13v8.5" />
      </svg>
    );
  if (tip === "gelen")
    // gelen kutusu — ilanıma gelen sunumlar
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M3 13h5l1.5 2.5h5L16 13h5" />
        <path d="M5.5 5h13l2.5 8v6H3v-6z" />
      </svg>
    );
  if (tip === "takip")
    // kalp — favorilerim
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M12 20.3l-7.1-7.1a4.5 4.5 0 116.4-6.4l.7.7.7-.7a4.5 4.5 0 116.4 6.4z" />
      </svg>
    );
  // yıldız — değerlendirmeler
  return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
      <path d="M12 3l2.7 5.8 6.3.6-4.8 4.2 1.5 6.2L12 16.9 6.3 20l1.5-6.2L3 9.6l6.3-.6z" />
    </svg>
  );
}

// Rol rengi: alıcı=mor, satıcı=yeşil, favoriler=kırmızı (kalp), nötr (yorumlar).
type TabRenk = "mor" | "yesil" | "kirmizi" | "notr";
const tabs: { value: Tab; label: string; renk: TabRenk }[] = [
  { value: "talepler", label: "Taleplerim (3)", renk: "mor" },
  {
    value: "gelen",
    label: `Gelen Sunumlar (${gelenSunumlar.length})`,
    renk: "mor",
  },
  { value: "sunumlar", label: "Sunumlarım (4)", renk: "yesil" },
  { value: "takip", label: "Favorilerim (3)", renk: "kirmizi" },
  // Değerlendirmeler sekmesi yok; kimlik kartındaki "15 değerlendirme"
  // bağlantısı (?tab=yorumlar) bu panele götürür.
];

// Aktif ve hover renk sınıfları — renk eşlemesini hissettirir.
const tabRenkCls: Record<TabRenk, { aktif: string; pasif: string }> = {
  mor: {
    aktif: "border-primary font-bold text-primary",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-primary",
  },
  yesil: {
    aktif: "border-accent-ink font-bold text-accent-ink",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-accent-ink",
  },
  kirmizi: {
    aktif: "border-danger font-bold text-danger",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-danger",
  },
  notr: {
    aktif: "border-ink-900 font-bold text-ink-900",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-ink-900",
  },
};

const tabValues: Tab[] = [
  "talepler",
  "gelen",
  "sunumlar",
  "takip",
  "yorumlar",
];

export function ProfilClient({ baslangicTab }: { baslangicTab?: string }) {
  const [tab, setTab] = useState<Tab>(
    tabValues.includes(baslangicTab as Tab)
      ? (baslangicTab as Tab)
      : "talepler",
  );

  const gelenTalep = getTalep(GELEN_TALEP_ID);
  const taleplerim = taleplerimIds
    .map((id) => getTalep(id))
    .filter((t): t is Talep => Boolean(t));
  const takipEttiklerim = takipIds
    .map((id) => getTalep(id))
    .filter((t): t is Talep => Boolean(t));

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <HesapNav active="/profil" />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <HesapKart />

        {/* ── Sağ: sekmeler + içerik ── */}
        <div className="min-w-0">
      {/* Başlık + sağda hızlı erişim butonları */}
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink-900">
            Profilim
          </h1>
        </div>
        <div className="ml-auto flex flex-none flex-col items-end gap-2">
          <ButtonLink
            href="/satici-performansi"
            variant="primary"
            size="sm"
            className="min-h-[42px] w-[172px] text-[14px]"
          >
            Performans Panelim
          </ButtonLink>
          <ButtonLink
            href="/talep-alarmlari"
            variant="lime"
            size="sm"
            className="min-h-[42px] w-[172px] text-[14px]"
          >
            Talep Alarmı Kur
          </ButtonLink>
        </div>
      </div>
      {/* ── Sekmeler ── */}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = tab === t.value;
          const renk = tabRenkCls[t.renk];
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              className={`-mb-px flex cursor-pointer items-center gap-1.5 border-b-[2.5px] px-[11px] py-2.5 text-[15px] leading-none transition-colors ${
                active ? renk.aktif : renk.pasif
              }`}
            >
              <TabIcon tip={t.value} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Taleplerim ── */}
      {tab === "talepler" && (
        <section className="mt-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-end gap-2">
            <ButtonLink
              href="/ilan-ac"
              variant="primary"
              size="sm"
              className="min-h-[42px] w-[172px] text-[14px]"
            >
              + Yeni Talep Aç
            </ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {taleplerim.map((t) => (
              <TalepCard key={t.id} talep={t} />
            ))}
          </div>
        </section>
      )}

      {/* ── Gelen Sunumlar — kendi ilanıma satıcıların gönderdikleri ── */}
      {tab === "gelen" && (
        <section className="mt-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-end gap-2">
            <ButtonLink
              href="/sunum-karsilastirma"
              variant="lime"
              size="sm"
              className="min-h-[42px] text-[14px]"
            >
              ⇄ Sunum Karşılaştırma
            </ButtonLink>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gelenSunumlar.map((s) => {
              const satirlar = kunyeSatirlari(s, gelenTalep);
              const { uyan, toplam, farkli } = eslesmeOzeti(satirlar, gelenTalep);
              return (
                <Link
                  key={s.satici}
                  href="/sunum-detay"
                  className="group flex flex-col overflow-hidden rounded-card border border-border bg-card transition-colors hover:border-primary"
                >
                  <div className="ref-image relative flex aspect-[3/4] items-center justify-center">
                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-ink-900/[0.82] px-2 py-1 text-[10.5px] font-semibold text-white">
                      {s.fotolar} foto{s.video ? " · video" : ""}
                    </span>
                    <span
                      className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        farkli.length === 0
                          ? "bg-accent text-ink-900"
                          : "bg-primary-soft text-primary-hover"
                      }`}
                    >
                      {uyan}/{toplam} uyuyor
                    </span>
                    <span className="font-mono text-[10.5px] text-[#968cac]">
                      sunum görseli
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <div className="text-[19px] font-extrabold text-primary-hover">
                      {fiyatText(s.fiyatNum)}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-ink-900">
                      {s.satici}{" "}
                      <span className="font-bold text-star">★ {s.puan}</span>
                    </div>
                    {/* Sabit yükseklikler: "Sunumu incele" her kartta aynı hizada. */}
                    <p className="mt-1.5 line-clamp-2 h-[38px] text-[13.5px] font-medium leading-snug text-ink-700">
                      {s.baslik}
                    </p>
                    <div className="mt-2 line-clamp-2 h-[34px] text-[12.5px] font-medium leading-snug text-ink-400">
                      {s.durum} · {s.teslim} · {s.ne}
                    </div>
                    <div className="mt-1.5 line-clamp-1 h-[17px] text-[12.5px] font-semibold leading-[17px] text-danger">
                      {farkli.length > 0
                        ? `⚠ ${farkli.map((r) => r.k).join(", ")} farklı`
                        : ""}
                    </div>
                    <span className="mt-3 text-[13px] font-bold text-primary group-hover:text-primary-hover">
                      Sunumu incele ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sunumlarım ── */}
      {tab === "sunumlar" && (
        <section className="mt-3">
          {/* Kart ölçüsü Taleplerim sekmesiyle birebir aynı. */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {sunumlarim.map((s) => (
              <article
                key={s.id}
                className="relative flex flex-col overflow-hidden rounded-card border border-border bg-card transition-colors hover:border-primary"
              >
                <div className="ref-image relative flex aspect-[3/4] items-center justify-center">
                  <span className="font-mono text-[10px] text-[#968cac]">
                    sunum görseli
                  </span>
                  <span className={`absolute left-2.5 top-2.5 ${pill} ${s.stCls}`}>
                    {s.st}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {/* Kartın tamamı ilanın inceleme sayfasına gider. */}
                  <Link
                    href={`/sunumum/${s.id}`}
                    className="text-[13.5px] font-bold leading-snug text-ink-900 after:absolute after:inset-0 after:content-[''] hover:text-primary"
                  >
                    {getTalep(s.talepId)?.baslik ?? s.sunum.baslik}
                  </Link>
                  <div className="mt-1.5 text-[11.5px] font-medium text-ink-400">
                    İlan sahibi:{" "}
                    <span className="font-semibold text-ink-900">
                      {s.sahibi}
                    </span>{" "}
                    · {s.tarih}
                  </div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-ink-400">
                    Alıcının fiyatı:{" "}
                    <span className="font-bold text-ink-900">
                      {fiyatText(getTalep(s.talepId)?.fiyatNum ?? 0)}
                    </span>
                  </div>
                  <p className="mt-2 text-[11.5px] font-medium leading-snug text-ink-400">
                    {s.not}
                  </p>
                  <div className="relative z-10 mt-auto pt-3.5">
                    {s.aksiyon ? (
                      <ButtonLink
                        href={s.aksiyon.href}
                        variant={s.aksiyon.variant}
                        size="sm"
                        className="w-full"
                      >
                        {s.aksiyon.label}
                      </ButtonLink>
                    ) : (
                      <span className="block rounded-xl bg-page py-2.5 text-center text-[12px] font-semibold text-ink-400">
                        Yanıt bekleniyor
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Favorilerim ── */}
      {tab === "takip" && (
        <section className="mt-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {takipEttiklerim.map((t) => (
              <TalepCard key={t.id} talep={t} favoride />
            ))}
          </div>
        </section>
      )}

      {/* ── Değerlendirmeler ── */}
      {tab === "yorumlar" && (
        <section className="mt-3">
          <div className="mb-3.5 flex items-center gap-2 text-[13px] font-semibold text-ink-500">
            <span className="text-[15px] font-extrabold text-star">★ 4,9</span>
            <span>· 15 değerlendirme — alım ve satış işlemlerinden</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {yorumlar.map((y) => (
              <article
                key={y.ad}
                className="rounded-card border border-border bg-card px-[18px] py-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-soft text-[11.5px] font-bold text-primary-hover">
                    {y.harf}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-bold text-ink-900">
                        {y.ad}
                      </span>
                      <Chip variant={y.rolVariant}>{y.rol}</Chip>
                    </div>
                    <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                      {y.urun} · {y.tarih}
                    </div>
                  </div>
                  <span className="flex-none text-[13px] font-bold text-star">
                    ★★★★★
                  </span>
                </div>
                <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink-700">
                  {y.text}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
        </div>
      </div>
    </main>
  );
}
