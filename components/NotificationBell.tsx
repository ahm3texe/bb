"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Bildirim = {
  harf: string;
  renk: string; // tailwind bg + text classes for the avatar dot
  text: string;
  zaman: string;
  href: string;
};

const bildirimler: Bildirim[] = [
  {
    harf: "S",
    renk: "bg-primary-soft text-primary-hover",
    text: 'Dawn FM talebine 2 yeni sunum geldi',
    zaman: "12 dk önce",
    href: "/ilan/dawn-fm-imzali-cd",
  },
  {
    harf: "T",
    renk: "bg-accent-soft text-accent-ink",
    text: "aysenur.a sunumundan teklif istedi — fiyat ver",
    zaman: "1 saat önce",
    href: "/mesajlar",
  },
  {
    harf: "K",
    renk: "bg-ink-900 text-accent",
    text: "Commodore 64 — kargo için son 2 gün",
    zaman: "3 saat önce",
    href: "/siparis",
  },
];

// Okunmamış bildirim sayısı — /bildirimler'deki yeni:true sayısıyla aynı.
const OKUNMAMIS = 4;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Bildirimler"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-[44px] w-[44px] items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[22px] w-[22px] text-ink-700"
          aria-hidden
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-accent px-1 text-[10.5px] font-extrabold text-ink-900">
          {OKUNMAMIS}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[46px] z-50 w-[340px] overflow-hidden rounded-card border border-border bg-card shadow-[var(--shadow-pop)]">
          <div className="flex items-baseline justify-between border-b border-hairline px-4 py-[13px]">
            <span className="text-[13.5px] font-extrabold text-ink-900">
              Bildirimler
            </span>
            <span className="text-[11px] font-semibold text-ink-400">
              {OKUNMAMIS} yeni
            </span>
          </div>
          {bildirimler.map((b, i) => (
            <Link
              key={i}
              href={b.href}
              onClick={() => setOpen(false)}
              className="flex gap-2.5 border-b border-page px-4 py-3 hover:bg-subtle"
            >
              <span
                className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold ${b.renk}`}
              >
                {b.harf}
              </span>
              <span className="flex-1">
                <span className="block text-[12.5px] font-semibold leading-snug text-ink-900">
                  {b.text}
                </span>
                <span className="mt-[3px] block text-[10.5px] font-medium text-ink-300">
                  {b.zaman}
                </span>
              </span>
            </Link>
          ))}
          <Link
            href="/bildirimler"
            onClick={() => setOpen(false)}
            className="block bg-page py-3 text-center text-[12.5px] font-bold text-primary-hover"
          >
            Tüm bildirimleri gör
          </Link>
        </div>
      )}
    </div>
  );
}
