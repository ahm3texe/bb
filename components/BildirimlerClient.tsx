"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Tip = "sunum" | "teklif" | "kargo" | "sistem";
type Grup = "Bugün" | "Dün" | "Daha önce";

type Bildirim = {
  id: number;
  grup: Grup;
  tip: Tip;
  harf: string;
  avatar: string; // tailwind bg + text classes for the round icon
  text: string;
  sub: string;
  zaman: string;
  href: string;
  yeni: boolean;
};

const veri: Bildirim[] = [
  {
    id: 1,
    grup: "Bugün",
    tip: "sunum",
    harf: "S",
    avatar: "bg-primary-soft text-primary-hover",
    text: 'Dawn FM talebine 2 yeni sunum geldi',
    sub: 'İmzalı The Weeknd "Dawn FM" CD',
    zaman: "12 dk önce",
    href: "/ilan/dawn-fm-imzali-cd",
    yeni: true,
  },
  {
    id: 2,
    grup: "Bugün",
    tip: "teklif",
    harf: "T",
    avatar: "bg-accent-soft text-accent-ink",
    text: "aysenur.a sunumundan teklif istedi — fiyatını ver",
    sub: "Nokia 3310 — kutulu",
    zaman: "1 saat önce",
    href: "/mesajlar",
    yeni: true,
  },
  {
    id: 3,
    grup: "Bugün",
    tip: "kargo",
    harf: "K",
    avatar: "bg-ink-900 text-accent",
    text: "Commodore 64 — kargoya vermen için son 2 gün",
    sub: "3 gün kuralı hatırlatması",
    zaman: "3 saat önce",
    href: "/siparis",
    yeni: true,
  },
  {
    id: 4,
    grup: "Dün",
    tip: "kargo",
    harf: "O",
    avatar: "bg-primary-soft text-primary-hover",
    text: "Sipariş #BB-78412 — kargo transfer merkezinde",
    sub: "Aras Kargo · TR728439104",
    zaman: "Dün 11:20",
    href: "/siparis",
    yeni: true,
  },
  {
    id: 5,
    grup: "Dün",
    tip: "teklif",
    harf: "T",
    avatar: "bg-accent-soft text-accent-ink",
    text: "plakdukkani34 ile 4.500 TL üzerinde anlaşıldı",
    sub: "Ödeme adımına geçildi",
    zaman: "Dün 10:40",
    href: "/siparis",
    yeni: false,
  },
  {
    id: 6,
    grup: "Dün",
    tip: "sistem",
    harf: "B",
    avatar: "bg-[#efebf5] text-ink-500",
    text: "Kraftwerk plak talebinin süresi 15 gün sonra doluyor",
    sub: "Dilediğinde uzatabilirsin",
    zaman: "Dün 09:05",
    href: "/ilan-yonetimi",
    yeni: false,
  },
  {
    id: 7,
    grup: "Daha önce",
    tip: "sunum",
    harf: "S",
    avatar: "bg-primary-soft text-primary-hover",
    text: "koleksiyoner.mert sunumunu güncelledi",
    sub: "Yeni fotoğraf eklendi",
    zaman: "Salı",
    href: "/sunum-detay",
    yeni: false,
  },
  {
    id: 8,
    grup: "Daha önce",
    tip: "kargo",
    harf: "O",
    avatar: "bg-primary-soft text-primary-hover",
    text: "Polaroid 600 — ödeme satıcıya aktarıldı",
    sub: "İşlem tamamlandı, değerlendirmen yayında",
    zaman: "Salı",
    href: "/siparis",
    yeni: false,
  },
  {
    id: 9,
    grup: "Daha önce",
    tip: "sistem",
    harf: "B",
    avatar: "bg-[#efebf5] text-ink-500",
    text: "Kimlik doğrulaman onaylandı",
    sub: "Profilinde rozet olarak görünüyor",
    zaman: "Geçen hafta",
    href: "/profil",
    yeni: false,
  },
];

const tipler: { id: "tumu" | Tip; ad: string }[] = [
  { id: "tumu", ad: "Tümü" },
  { id: "sunum", ad: "Sunumlar" },
  { id: "teklif", ad: "Teklifler" },
  { id: "kargo", ad: "Kargo & Sipariş" },
  { id: "sistem", ad: "Sistem" },
];

const gruplarSira: Grup[] = ["Bugün", "Dün", "Daha önce"];

export function BildirimlerClient() {
  const [filtre, setFiltre] = useState<"tumu" | Tip>("tumu");
  const [okunanlar, setOkunanlar] = useState<number[]>([]);

  const yeniIds = useMemo(() => veri.filter((b) => b.yeni).map((b) => b.id), []);
  const okunmamisSayi = yeniIds.filter((id) => !okunanlar.includes(id)).length;

  const filtreli = veri.filter((b) => filtre === "tumu" || b.tip === filtre);

  const gruplar = gruplarSira
    .map((ad) => ({ ad, items: filtreli.filter((b) => b.grup === ad) }))
    .filter((g) => g.items.length > 0);

  function oku(id: number) {
    setOkunanlar((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function tumunuOku() {
    setOkunanlar(yeniIds);
  }

  return (
    <main className="mx-auto max-w-[760px] px-6 pb-6 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Bildirimler
        </h1>
        {okunmamisSayi > 0 ? (
          <button
            type="button"
            onClick={tumunuOku}
            className="cursor-pointer py-1.5 text-[13px] font-bold text-primary hover:text-primary-hover"
          >
            Tümünü okundu say ({okunmamisSayi})
          </button>
        ) : (
          <span className="text-[12.5px] font-semibold text-ink-300">
            Tümü okundu ✓
          </span>
        )}
      </div>

      {/* ── Tip filtreleri ── */}
      <div className="my-4 flex flex-wrap gap-1.5">
        {tipler.map((t) => {
          const sayi =
            t.id === "tumu"
              ? veri.length
              : veri.filter((b) => b.tip === t.id).length;
          const active = filtre === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFiltre(t.id)}
              className={`cursor-pointer rounded-full px-[13px] py-[9px] text-xs transition-colors ${
                active
                  ? "bg-primary font-bold text-white"
                  : "bg-card font-semibold text-ink-500 ring-1 ring-inset ring-border hover:text-primary"
              }`}
            >
              {t.ad} · {sayi}
            </button>
          );
        })}
      </div>

      {/* ── Gruplar ── */}
      {gruplar.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-10 text-center text-[13.5px] font-semibold text-ink-400">
          Bu kategoride bildirim yok.
        </div>
      ) : (
        gruplar.map((g) => (
          <div key={g.ad}>
            <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-[1.4px] text-ink-400">
              {g.ad}
            </div>
            <div className="divide-y divide-hairline overflow-hidden rounded-card border border-border bg-card">
              {g.items.map((b) => {
                const okunmadi = b.yeni && !okunanlar.includes(b.id);
                return (
                  <Link
                    key={b.id}
                    href={b.href}
                    onClick={() => oku(b.id)}
                    className={`flex items-start gap-3 px-[18px] py-[15px] transition-colors hover:bg-subtle ${
                      okunmadi ? "bg-[#faf8ff]" : "bg-card"
                    }`}
                  >
                    <span
                      className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[12px] font-extrabold ${b.avatar}`}
                    >
                      {b.harf}
                    </span>
                    <span className="flex-1">
                      <span
                        className={`block text-[13.5px] leading-[1.45] ${
                          okunmadi
                            ? "font-bold text-ink-900"
                            : "font-semibold text-ink-700"
                        }`}
                      >
                        {b.text}
                      </span>
                      <span className="mt-[3px] block text-[11.5px] font-medium leading-tight text-ink-400">
                        {b.sub} · {b.zaman}
                      </span>
                    </span>
                    {okunmadi && (
                      <span className="mt-1.5 h-[9px] w-[9px] flex-none rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </main>
  );
}
