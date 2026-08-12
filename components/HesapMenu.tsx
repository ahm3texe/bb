"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  hesapDegistir,
  secilebilirKullanicilar,
  useAktifKullanici,
} from "@/lib/aktif-kullanici";

/**
 * Header'daki avatar — tıklayınca hesap menüsü açılır. Menüden başka bir
 * hesaba geçilebilir; önizlemede siteyi hem alıcı hem satıcı gözünden
 * denemek için. Gerçek oturum sistemi gelene kadar geçiş tarayıcıda tutulur.
 */
export function HesapMenu() {
  const aktif = useAktifKullanici();
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    const disariTikla = (e: MouseEvent) => {
      if (!kutuRef.current?.contains(e.target as Node)) setAcik(false);
    };
    const escBas = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    document.addEventListener("mousedown", disariTikla);
    document.addEventListener("keydown", escBas);
    return () => {
      document.removeEventListener("mousedown", disariTikla);
      document.removeEventListener("keydown", escBas);
    };
  }, [acik]);

  return (
    <div ref={kutuRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`Hesap menüsü — aktif hesap ${aktif.kullanici}`}
        className={`flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full text-[13.5px] font-bold transition-colors ${
          acik
            ? "bg-primary text-white"
            : "bg-primary-soft text-primary hover:bg-primary-soft-hover"
        }`}
      >
        {aktif.harf}
      </button>

      {acik && (
        <div
          role="menu"
          className="absolute right-0 top-[52px] z-50 w-[288px] overflow-hidden rounded-card border border-border bg-card shadow-[var(--shadow-pop)]"
        >
          {/* Aktif hesap */}
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink-900 text-[13px] font-extrabold text-accent">
              {aktif.harf}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-extrabold text-ink-900">
                {aktif.kullanici}
              </div>
              <div className="mt-[2px] text-[11.5px] font-medium text-ink-400">
                ★ {aktif.puan.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}{" "}
                · {aktif.konum}
              </div>
            </div>
          </div>

          <div className="flex flex-col border-b border-hairline py-1.5">
            <Link
              href="/profil"
              onClick={() => setAcik(false)}
              className="px-4 py-2 text-[13px] font-semibold text-ink-700 hover:bg-page hover:text-primary"
            >
              Profilim
            </Link>
            <Link
              href="/ayarlar"
              onClick={() => setAcik(false)}
              className="px-4 py-2 text-[13px] font-semibold text-ink-700 hover:bg-page hover:text-primary"
            >
              Ayarlar
            </Link>
          </div>

          {/* Hesap değiştirme */}
          <div className="px-4 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-[1px] text-ink-300">
            Hesap değiştir
          </div>
          <div className="max-h-[268px] overflow-y-auto pb-1.5">
            {secilebilirKullanicilar.map((k) => {
              const secili = k.kullanici === aktif.kullanici;
              return (
                <button
                  key={k.kullanici}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    hesapDegistir(k.kullanici);
                    setAcik(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                    secili ? "bg-primary-soft" : "hover:bg-page"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                      secili
                        ? "bg-primary text-white"
                        : "bg-primary-soft text-primary-hover"
                    }`}
                  >
                    {k.harf}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-ink-900">
                      {k.kullanici}
                    </span>
                    <span className="block truncate text-[11px] font-medium text-ink-400">
                      {k.tamamlananSatis} satış · {k.aliciMetrik.tamamlananAlim}{" "}
                      alım
                    </span>
                  </span>
                  {secili && (
                    <span className="flex-none text-[12px] font-bold text-primary">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="border-t border-hairline px-4 py-2.5 text-[10.5px] font-medium leading-[1.45] text-ink-300">
            Önizleme özelliği: hesaplar arası geçiş siteyi iki taraflı denemek
            içindir.
          </p>
        </div>
      )}
    </div>
  );
}
