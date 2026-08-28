"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAktifKullanici } from "@/lib/aktif-kullanici";

/**
 * Başlıktaki mesaj ikonu ve okunmamış sayısı.
 *
 * Sayı sabit yazılıydı ("3") — hiç mesajı olmayan kullanıcıya da üç
 * mesajı varmış gibi görünüyordu. Artık sunucudan geliyor ve sıfırsa
 * rozet hiç basılmıyor: boş bir rozet bilgi değil, gürültü.
 */
export function MesajRozeti() {
  const aktif = useAktifKullanici();
  const [okunmamis, setOkunmamis] = useState(0);

  useEffect(() => {
    let iptal = false;
    fetch("/api/okunmamis")
      .then((r) => (r.ok ? r.json() : { okunmamis: 0 }))
      .then((v: { okunmamis?: number }) => {
        if (!iptal) setOkunmamis(v.okunmamis ?? 0);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [aktif?.kullanici]);

  return (
    <Link
      href="/mesajlar"
      aria-label={
        okunmamis > 0 ? `Mesajlar — ${okunmamis} okunmamış` : "Mesajlar"
      }
      className="relative hidden h-[44px] w-[44px] items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary md:flex"
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
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
      {okunmamis > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-accent px-1 text-[10.5px] font-extrabold text-ink-900">
          {okunmamis}
        </span>
      )}
    </Link>
  );
}
