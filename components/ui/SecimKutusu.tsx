"use client";

import { karsilastirmaAnahtari } from "@/lib/metin";
import { useEffect, useRef, useState } from "react";

/**
 * Tek seçimlik açılır kutu — Tür / Marka / Model zinciri için.
 *
 * Üç durumu vardır:
 *  1. `kapali` → önceki kademe seçilmemiş; tıklanamaz, sebebi yazılı.
 *  2. Liste dolu → açılır menüden seçilir, arama kutusu ile filtrelenir.
 *  3. Liste boş → serbest metin kutusuna düşer, kullanıcı kendi yazar.
 *     Böylece veri eksik diye kimse takılıp kalmaz.
 *
 * Escape ve dışarı tıklamada kapanır; klavyeyle yönetilebilir.
 */
export function SecimKutusu({
  id,
  deger,
  onDegis,
  secenekler,
  placeholder,
  serbestPlaceholder,
  kapali = false,
  kapaliMetin,
  kompakt = false,
  inputCls,
}: {
  id: string;
  deger: string;
  onDegis: (yeni: string) => void;
  secenekler: string[];
  placeholder: string;
  /** Liste boşken serbest metin kutusunda görünecek ipucu. */
  serbestPlaceholder?: string;
  /** Önceki kademe seçilmediyse true. */
  kapali?: boolean;
  /** Kapalıyken kutuda görünecek açıklama. */
  kapaliMetin?: string;
  /**
   * Dar panellerde (ör. Talep Alarmı formu) kutuyu oradaki input
   * ölçüsüne indirir — İlan Aç formundaki büyük ölçü olduğu gibi kalır.
   */
  kompakt?: boolean;
  /** Serbest metin moduna düşerken kullanılacak ortak input sınıfı. */
  inputCls: string;
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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Liste yoksa serbest metin: kullanıcı kendi değerini yazar.
  if (!kapali && secenekler.length === 0) {
    return (
      <input
        id={id}
        value={deger}
        onChange={(e) => onDegis(e.target.value.slice(0, 40))}
        placeholder={serbestPlaceholder ?? placeholder}
        className={inputCls}
      />
    );
  }

  const suzulmus = arama.trim()
    ? secenekler.filter((s) =>
        // Ortak anahtar: "istanbul" yazınca "İstanbul" da bulunmalı.
        karsilastirmaAnahtari(s).includes(karsilastirmaAnahtari(arama)),
      )
    : secenekler;

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
        className={`flex w-full box-border items-center justify-between gap-2 border-[1.5px] text-left font-medium outline-none transition-colors ${
          kompakt
            ? "rounded-[11px] px-[13px] py-3 text-[14px]"
            : "rounded-control px-4 py-[15px] text-[16.5px]"
        } ${
          kapali
            ? "cursor-not-allowed border-border bg-subtle text-ink-300"
            : open
              ? "border-primary bg-card text-ink-900"
              : "border-border-input bg-card"
        } ${!kapali && !deger ? "text-ink-300" : ""} ${
          !kapali && deger ? "text-ink-900" : ""
        }`}
      >
        <span className="truncate">
          {kapali ? (kapaliMetin ?? placeholder) : deger || placeholder}
        </span>
        {!kapali && (
          <span
            className={`flex-none text-[10px] text-ink-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            ▾
          </span>
        )}
      </button>

      {open && !kapali && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-card border border-border bg-card shadow-pop">
          {secenekler.length > 8 && (
            <div className="border-b border-hairline p-2">
              <input
                autoFocus
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Ara…"
                className="w-full box-border rounded-[10px] border-[1.5px] border-border-input px-3 py-2 text-[14px] font-medium text-ink-900 outline-none focus:border-primary"
              />
            </div>
          )}

          <div role="listbox" className="max-h-[260px] overflow-y-auto py-1">
            {suzulmus.length === 0 ? (
              <div className="px-3.5 py-3 text-[14px] font-medium text-ink-400">
                Eşleşen seçenek yok
              </div>
            ) : (
              suzulmus.map((s) => {
                const secili = s === deger;
                return (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={secili}
                    onClick={() => {
                      onDegis(secili ? "" : s);
                      setOpen(false);
                    }}
                    className={`block w-full px-3.5 py-2.5 text-left text-[15px] hover:bg-subtle ${
                      secili
                        ? "font-bold text-primary-hover"
                        : "font-semibold text-ink-700"
                    }`}
                  >
                    {s}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
