"use client";

import { useEffect, useRef, useState } from "react";
import { karsilastirmaAnahtari } from "@/lib/metin";

/**
 * Çok seçimli açılır kutu — filtre paneli için.
 *
 * `SecimKutusu` tek değer seçtirir (İlan Aç formu öyle çalışır: bir talep
 * tek marka, tek renk taşır). Filtre tarafında ise soru başka: "Acer VEYA
 * Apple", "İstanbul VEYA Ankara". Rozet dizisiyle denendi ama 81 il ya da
 * yüzlerce marka 256 piksellik panele sığmıyor; liste açılır pencereye
 * alındı ve sekiz seçenekten uzun listelerde arama kutusu açılıyor —
 * `SecimKutusu`'ndaki davranışın aynısı.
 */
/** Listedeki tek seçenek. Pencere AÇIK KALIR: çok seçimde arka arkaya
 *  birkaç seçenek işaretlemek olağan. */
function Satir({
  etiket,
  aktif,
  onSec,
}: {
  etiket: string;
  aktif: boolean;
  onSec: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={aktif}
      onClick={onSec}
      className={`flex w-full cursor-pointer items-center gap-[9px] px-2.5 py-2 text-left transition-colors ${
        aktif ? "bg-primary-soft" : "hover:bg-page"
      }`}
    >
      <span
        className={`flex h-4 w-4 flex-none items-center justify-center rounded-[5px] text-[10px] font-extrabold ${
          aktif ? "bg-primary text-white" : "border-[1.5px] border-border-input"
        }`}
      >
        {aktif ? "✓" : ""}
      </span>
      <span
        className={`flex-1 text-[13px] ${
          aktif ? "font-bold text-primary-hover" : "font-semibold text-ink-700"
        }`}
      >
        {etiket}
      </span>
    </button>
  );
}

export function CokluSecimKutusu({
  id,
  secenekler,
  gruplar,
  secili,
  onDegis,
  placeholder,
  kapali = false,
  kapaliMetin,
}: {
  id: string;
  secenekler: string[];
  /**
   * Seçenekler başlıklar altında gruplanacaksa. Model listesi böyle
   * kullanılıyor: birden çok marka seçiliyken düz bir liste "bu model
   * hangi markanın?" sorusunu cevapsız bırakıyordu; her marka başlık
   * oluyor, modelleri altına diziliyor.
   */
  gruplar?: { baslik: string; secenekler: string[] }[];
  secili: string[];
  onDegis: (deger: string) => void;
  placeholder: string;
  /** Önceki kademe seçilmediyse true. */
  kapali?: boolean;
  kapaliMetin?: string;
}) {
  const [open, setOpen] = useState(false);
  const [arama, setArama] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const anahtar = karsilastirmaAnahtari(arama.trim());
  // Ortak anahtar: "istanbul" yazınca "İstanbul" da bulunmalı.
  const suz = (liste: string[]) =>
    anahtar
      ? liste.filter((s) => karsilastirmaAnahtari(s).includes(anahtar))
      : liste;

  const suzulmus = suz(secenekler);
  // Arama sonrası boşalan grup hiç yazılmaz; başlık altı boş kalmasın.
  const suzulmusGruplar = gruplar
    ?.map((g) => ({ ...g, secenekler: suz(g.secenekler) }))
    .filter((g) => g.secenekler.length > 0);
  const bosMu = gruplar ? !suzulmusGruplar?.length : suzulmus.length === 0;

  // Kutunun üstündeki özet: hiç seçim yoksa ipucu, varsa seçilenler.
  const ozet = secili.length
    ? secili.length <= 2
      ? secili.join(", ")
      : `${secili.length} seçili`
    : placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        disabled={kapali}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((v) => !v);
          setArama("");
        }}
        className={`flex w-full box-border items-center justify-between gap-2 rounded-control border-[1.5px] px-2.5 py-[11px] text-left text-[13px] font-semibold outline-none transition-colors ${
          kapali
            ? "cursor-not-allowed border-border bg-subtle text-ink-300"
            : open
              ? "cursor-pointer border-primary bg-card text-ink-900"
              : "cursor-pointer border-border-input bg-card"
        } ${!kapali && !secili.length ? "text-ink-400" : ""} ${
          !kapali && secili.length ? "text-ink-900" : ""
        }`}
      >
        <span className="truncate">
          {kapali ? (kapaliMetin ?? placeholder) : ozet}
        </span>
        {!kapali && (
          <span
            className={`flex-none text-[10px] text-ink-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            ▼
          </span>
        )}
      </button>

      {open && !kapali && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute left-0 right-0 z-30 mt-1 max-h-[260px] overflow-y-auto rounded-control border border-border bg-card py-1 shadow-[var(--shadow-pop)]"
        >
          {secenekler.length > 8 && (
            <div className="px-2 pb-1.5 pt-1">
              <input
                autoFocus
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Ara…"
                aria-label={`${placeholder} içinde ara`}
                className="w-full box-border rounded-[9px] border-[1.5px] border-border-input px-2.5 py-1.5 text-[12.5px] font-medium text-ink-900 outline-none focus:border-primary"
              />
            </div>
          )}
          {bosMu ? (
            <div className="px-3 py-2 text-[12.5px] font-medium text-ink-400">
              Eşleşen seçenek yok.
            </div>
          ) : gruplar ? (
            suzulmusGruplar?.map((g) => (
              <div key={g.baslik}>
                <div className="px-2.5 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-400">
                  {g.baslik}
                </div>
                {g.secenekler.map((s) => (
                  <Satir
                    key={`${g.baslik}-${s}`}
                    etiket={s}
                    aktif={secili.includes(s)}
                    onSec={() => onDegis(s)}
                  />
                ))}
              </div>
            ))
          ) : (
            suzulmus.map((s) => {
              return (
                <Satir
                  key={s}
                  etiket={s}
                  aktif={secili.includes(s)}
                  onSec={() => onDegis(s)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
