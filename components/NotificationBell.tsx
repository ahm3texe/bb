"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useBildirimler } from "@/lib/bildirim-akisi";
import { gecenSure } from "@/lib/bildirimler";
import { useAktifKullanici } from "@/lib/aktif-kullanici";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Zil aktif hesabın bildirimlerini gösterir.
  const aktif = useAktifKullanici();
  const {
    bildirimler: hepsi,
    oku,
    sil,
  } = useBildirimler(aktif?.kullanici ?? "");
  const OKUNMAMIS = hepsi.filter((b) => b.yeni).length;
  const bildirimler = hepsi.slice(0, 3);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
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

  /*
   * ZİYARETÇİDE ZİL BİR BAĞLANTIDIR.
   *
   * Oturumsuz kullanıcıda zil yine açılıyor ve boş bir panel gösteriyordu:
   * ne bildirim vardı ne de giriş yapması gerektiğini söyleyen bir şey.
   * Artık doğrudan giriş ekranına götürüyor ve giriş sonrası bildirimlere
   * düşürüyor.
   */
  if (!aktif)
    return (
      <Link
        href={`/giris?devam=${encodeURIComponent("/bildirimler")}`}
        aria-label="Bildirimler — giriş yap"
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
      </Link>
    );

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
        {/* Sıfır rozet bilgi taşımıyor; hiç basılmıyor. */}
        {OKUNMAMIS > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-accent px-1 text-[10.5px] font-extrabold text-ink-900">
            {OKUNMAMIS}
          </span>
        )}
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
          {bildirimler.map((b) => (
            <Link
              // Anahtar dizi sırası değil KİMLİK: silme sonrası sıra
              // kayınca React yanlış satırı yeniden kullanırdı.
              key={b.id}
              href={b.href}
              onClick={() => {
                // Rozet ancak okundu bilgisi SUNUCUYA yazıldığı için
                // düşüyor; bir dönem `yeni` alanını değiştiren hiçbir kod
                // yoktu ve sayı hiç sıfırlanmıyordu.
                void oku(b.id);
                setOpen(false);
              }}
              className="flex items-start gap-2.5 border-b border-page px-4 py-3 hover:bg-subtle"
            >
              <span
                className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold ${b.avatar}`}
              >
                {b.harf}
              </span>
              <span className="flex-1">
                <span className="block text-[12.5px] font-semibold leading-snug text-ink-900">
                  {b.text}
                </span>
                <span className="mt-[3px] block text-[10.5px] font-medium text-ink-300">
                  {gecenSure(b)}
                </span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  // Satır bir bağlantı: tıklama yutulmazsa silerken
                  // bildirimin hedefine de gidilirdi.
                  e.preventDefault();
                  e.stopPropagation();
                  void sil(b.id);
                }}
                aria-label="Bildirimi sil"
                title="Bildirimi sil"
                className="-mr-1 flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full text-[14px] font-bold leading-none text-ink-300 transition-colors hover:bg-danger-soft hover:text-danger"
              >
                ×
              </button>
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
