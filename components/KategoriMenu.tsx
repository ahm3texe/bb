"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { kategoriler } from "@/lib/data";
import { kategoriIkonlar } from "@/components/KategoriIkon";

/**
 * Header kategori mega-menüsü. Hem üstüne gelince (fare) hem tıklayınca/klavyeyle
 * (Enter/Space) açılır; Escape ve dışarı tıklamada kapanır.
 */
export function KategoriMenu() {
  const [open, setOpen] = useState(false);
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

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Kategoriler"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-900 hover:text-primary"
      >
        <span className="grid grid-cols-2 gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-[5px] w-[5px] rounded-[1.5px] bg-current" />
          ))}
        </span>
        Kategoriler
        <span
          className={`text-[10px] text-ink-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 pt-3" role="menu">
          <div className="w-[500px] rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-pop)]">
            <div className="grid grid-cols-2 gap-1">
              {kategoriler.map((k) => {
                const Ikon = kategoriIkonlar[k.ad];
                return (
                <Link
                  key={k.ad}
                  href={`/kesfet?kategori=${encodeURIComponent(k.ad)}`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-page"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-soft text-[14px] font-extrabold text-primary-hover">
                    {Ikon ? <Ikon className="h-[18px] w-[18px]" /> : k.harf}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink-900">
                      {k.ad}
                    </span>
                    <span className="block text-[11px] font-medium text-ink-400">
                      {k.sayi} açık talep
                    </span>
                  </span>
                </Link>
                );
              })}
            </div>
            <Link
              href="/kesfet"
              onClick={() => setOpen(false)}
              className="mt-1.5 flex items-center justify-center gap-1 rounded-xl bg-primary-soft py-2.5 text-[12.5px] font-bold text-primary-hover transition-colors hover:bg-primary-soft-hover"
            >
              Tüm talepleri keşfet ›
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
