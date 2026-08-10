"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { kategoriler } from "@/lib/data";
import { kategoriIkonlar } from "@/components/KategoriIkon";

const navItems = [
  { label: "Talepleri Keşfet", href: "/kesfet" },
  { label: "Profilim", href: "/profil" },
  { label: "Mesajlar", href: "/mesajlar" },
  { label: "Bildirimler", href: "/bildirimler" },
  { label: "Nasıl Çalışır?", href: "/nasil-calisir" },
  { label: "Yardım/Sorular", href: "/yardim" },
  { label: "Hakkımızda", href: "/hakkimizda" },
];

/**
 * Mobil (md altı) gezinme. Hamburger butonu + tam genişlik açılır panel.
 * Escape ve rota değişiminde kapanır.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Rota değişince kapat.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-card text-ink-700 transition-colors hover:border-primary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-[84px] z-40 bg-ink-900/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 top-[84px] z-50 max-h-[calc(100vh-84px)] overflow-y-auto border-t border-border bg-card px-6 pb-8 pt-4 shadow-[var(--shadow-pop)]">
            <Link
              href="/ilan-ac"
              className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-[14.5px] font-bold text-white hover:bg-primary-hover"
            >
              + Aradığını İlan Et
            </Link>

            <nav className="mt-4 flex flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-hairline py-3 text-[15px] font-semibold text-ink-900 hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Kategoriler
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {kategoriler.map((k) => {
                  const Ikon = kategoriIkonlar[k.ad];
                  return (
                  <Link
                    key={k.ad}
                    href={`/kesfet?kategori=${encodeURIComponent(k.ad)}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-semibold text-ink-700 hover:bg-page"
                  >
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-soft text-[11px] font-extrabold text-primary-hover">
                      {Ikon ? <Ikon className="h-[13px] w-[13px]" /> : k.harf}
                    </span>
                    {k.ad}
                  </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
