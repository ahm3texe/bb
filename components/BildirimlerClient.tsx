"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useBildirimler } from "@/lib/bildirim-akisi";
import type { BildirimTip, BildirimGrup } from "@/lib/bildirimler";
import { bildirimGrubu, gecenSure } from "@/lib/bildirimler";
import { useOturumSahibi } from "@/lib/aktif-kullanici";

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
  const [temizleSoru, setTemizleSoru] = useState(false);

  // Bildirimler aktif hesaba aittir; hesap değişince liste de değişir.
  const aktif = useOturumSahibi();
  const {
    bildirimler: veri,
    oku,
    tumunuOku,
    sil,
    tumunuSil,
  } = useBildirimler(aktif.kullanici);

  // OKUNDU BİLGİSİ ARTIK SUNUCUDA. Burada bir `okunanlar` dizisi vardı:
  // "okundu" yalnızca bu bileşenin belleğinde yaşıyordu, sayfa yeninilince
  // hepsi geri geliyor, başlıktaki zil rozeti ise hiç sıfırlanmıyordu.
  const okunmamisSayi = useMemo(
    () => veri.filter((b) => b.yeni).length,
    [veri],
  );

  const filtreli = veri.filter((b) => filtre === "tumu" || b.tip === filtre);

  const gruplar = gruplarSira
    // Grup da damgadan hesaplanır: dünkü bildirim bugün "Dün" başlığına düşer.
    .map((ad) => ({ ad, items: filtreli.filter((b) => bildirimGrubu(b) === ad) }))
    .filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto max-w-[760px] px-6 pb-6 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Bildirimler
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          {okunmamisSayi > 0 ? (
            <button
              type="button"
              onClick={() => void tumunuOku()}
              className="cursor-pointer py-1.5 text-[13px] font-bold text-primary hover:text-primary-hover"
            >
              Tümünü okundu say ({okunmamisSayi})
            </button>
          ) : (
            <span className="text-[12.5px] font-semibold text-ink-300">
              Tümü okundu ✓
            </span>
          )}
          {veri.length > 0 && (
            <button
              type="button"
              onClick={() => setTemizleSoru(true)}
              className="cursor-pointer py-1.5 text-[13px] font-bold text-danger hover:opacity-80"
            >
              Tümünü sil
            </button>
          )}
        </div>
      </div>

      {/* Toplu silme geri alınamaz; onay sorulur. */}
      {temizleSoru && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-card border border-danger-line bg-danger-soft px-4 py-3">
          <p className="min-w-[200px] flex-1 text-[13px] font-semibold leading-snug text-danger">
            {veri.length} bildirimin tamamı silinecek. Bu işlem geri alınamaz.
          </p>
          <button
            type="button"
            onClick={() => {
              setTemizleSoru(false);
              void tumunuSil();
            }}
            className="cursor-pointer rounded-control bg-danger px-4 py-2.5 text-[12.5px] font-extrabold text-white transition-opacity hover:opacity-90"
          >
            Evet, sil
          </button>
          <button
            type="button"
            onClick={() => setTemizleSoru(false)}
            className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-4 py-2.5 text-[12.5px] font-bold text-ink-500 transition-colors hover:border-primary hover:text-primary"
          >
            Vazgeç
          </button>
        </div>
      )}

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
                const okunmadi = b.yeni;
                return (
                  // Satır bir bağlantı; silme düğmesi onun İÇİNDE duruyor.
                  // Bu yüzden düğme tıklamayı yutmak zorunda, yoksa silerken
                  // bildirimin hedefine de gidilirdi.
                  <Link
                    key={b.id}
                    href={b.href}
                    onClick={() => void oku(b.id)}
                    className={`group/bildirim relative flex items-start gap-3 px-[18px] py-[15px] transition-colors hover:bg-subtle ${
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
                        {b.sub} · {gecenSure(b)}
                      </span>
                    </span>
                    {okunmadi && (
                      <span className="mt-1 h-[9px] w-[9px] flex-none rounded-full bg-primary" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        // Satırın kendisi bir bağlantı: tıklamayı burada
                        // durdurmazsak silerken bildirimin hedefine de
                        // gidilirdi.
                        e.preventDefault();
                        e.stopPropagation();
                        void sil(b.id);
                      }}
                      aria-label="Bildirimi sil"
                      title="Bildirimi sil"
                      className="-mr-1.5 -mt-1 flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full text-[15px] font-bold leading-none text-ink-300 transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft focus-visible:text-danger"
                    >
                      ×
                    </button>
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
