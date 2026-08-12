"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { bildirimlerimFor } from "@/lib/bildirimler";
import type { Bildirim, BildirimTip, BildirimGrup } from "@/lib/bildirimler";
import { useAktifKullanici } from "@/lib/aktif-kullanici";

type Tip = BildirimTip;
type Grup = BildirimGrup;

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

  // Bildirimler aktif hesaba aittir; hesap değişince liste de değişir.
  const aktif = useAktifKullanici();
  const veri: Bildirim[] = bildirimlerimFor(aktif.kullanici);

  const yeniIds = useMemo(
    () => veri.filter((b) => b.yeni).map((b) => b.id),
    [veri],
  );
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
