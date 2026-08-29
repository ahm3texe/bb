"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAktifKullanici } from "@/lib/aktif-kullanici";

/**
 * Header'daki avatar — tıklayınca hesap menüsü açılır.
 *
 * Burada bir dönem HESAP DEĞİŞTİRİCİ vardı: menüden herhangi bir hesaba
 * geçilebiliyordu ve seçim imzasız bir çereze yazılıyordu. Sunucu kimliği o
 * çerezden okuduğu için "hesap seçmek" ile "kimlik seçmek" aynı şeydi —
 * yani menü, kimlik doğrulamasının kendisini atlatan bir araçtı.
 *
 * Yerine gerçek çıkış geldi. Hesap değiştirmek artık çıkıp yeniden giriş
 * yapmayı gerektiriyor.
 */
export function HesapMenu() {
  const aktif = useAktifKullanici();
  const [acik, setAcik] = useState(false);
  const [cikisIsliyor, setCikisIsliyor] = useState(false);
  const [cikisHatasi, setCikisHatasi] = useState("");
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

  // Oturumsuz ziyaretçi de vitrini geziyor (ana sayfa, keşfet, ilan detayı,
  // ziyaretçi profili). Onlara avatar değil giriş bağlantısı gösterilir.
  if (!aktif) {
    return (
      <Link
        href="/giris"
        className="hidden items-center rounded-full bg-primary px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-primary-hover md:flex"
      >
        Giriş yap
      </Link>
    );
  }

  async function cikisYap() {
    if (cikisIsliyor) return;
    setCikisIsliyor(true);
    try {
      const r = await fetch("/api/oturum", { method: "DELETE" });
      if (!r.ok) throw new Error();
      setAcik(false);
      // Girişteki gerekçenin aynısı: kimlik değiştiğinde sunucu ağacının
      // tamamı yeniden çizilmeli. İstemci yönlendirmesi yerleşimi
      // önbellekten alır ve çıkış yapılmış hesap ekranda kalırdı.
      window.location.assign("/");
    } catch {
      // `catch` eksikti: bağlantı koparsa çıkış sessizce yarıda kalıyor,
      // kullanıcı hâlâ giriş yapmış oluyor ama ekranda hiçbir uyarı
      // görünmüyordu.
      setCikisHatasi("Çıkış yapılamadı. Bağlantını kontrol et.");
    } finally {
      setCikisIsliyor(false);
    }
  }

  return (
    <div ref={kutuRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`Hesap menüsü — ${aktif.kullanici}`}
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
          {/* Oturumdaki hesap */}
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

          <div className="py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={cikisYap}
              disabled={cikisIsliyor}
              className="w-full cursor-pointer px-4 py-2 text-left text-[13px] font-semibold text-danger transition-colors hover:bg-page disabled:cursor-default disabled:opacity-60"
            >
              {cikisIsliyor ? "Çıkılıyor…" : "Çıkış yap"}
            </button>
            {cikisHatasi && (
              <p role="alert" className="px-4 pb-1 text-[11.5px] font-bold text-danger">
                {cikisHatasi}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
