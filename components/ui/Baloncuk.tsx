"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * Kesilen metnin tamamını gösteren bilgi baloncuğu.
 *
 * NEDEN `title` YETMİYOR: tarayıcının kendi ipucu geç açılır, biçimlenemez
 * ve dokunmatik cihazda hiç görünmez. Uzun bir model adı ya da konum
 * ekranda "İstanbul/Küçükçekm…" diye kesiliyorsa, kullanıcının tamamını
 * görmesinin BAŞKA bir yolu olmalı.
 *
 * NEDEN `fixed`: baloncuklar `overflow-x-auto` ya da `overflow-hidden` olan
 * kapsayıcıların (karşılaştırma tablosu, künye ızgarası) içinde açılıyor;
 * hücreye göre konumlanan bir katman oralarda kırpılırdı. Konum
 * `getBoundingClientRect` ile hesaplanıp ekran kenarlarına sığdırılır.
 *
 * Klavyeyle de açılır: yalnızca fareyle erişilen bir bilgi, klavye kullanan
 * için hiç yok demektir.
 */
export function Baloncuk({
  icerik,
  baslik,
  genislik = 320,
  className = "",
  pasif = false,
  children,
}: {
  /** Baloncukta gösterilecek tam metin. */
  icerik: string;
  /** Baloncuğun üstündeki küçük etiket (ör. "Satıcının notu"). */
  baslik?: string;
  genislik?: number;
  className?: string;
  /**
   * İçerik ZATEN TAM GÖRÜNÜYORSA baloncuk çalışmaz.
   *
   * Bileşen her değerin etrafına koşulsuz sarılıyordu: kesilmemiş, tamamı
   * okunan bir değerin üstüne gelince de "tamamını göster" baloncuğu
   * açılıyordu — gösterecek fazladan bir şey olmadığı hâlde. Üstelik her
   * hücre `tabIndex={0}` ve `role="button"` taşıdığı için klavye
   * kullanıcısı hiçbir şey açmayan onlarca durakta geziyordu.
   *
   * Pasifken sarmalayıcı yine render edilir (ölçüm yapan çocuk düğüm yer
   * değiştirmesin diye) ama ne olay dinleyicisi ne odak durağı kalır.
   */
  pasif?: boolean;
  /** Ekranda görünen (kesilmiş) içerik. */
  children: ReactNode;
}) {
  const [acik, setAcik] = useState(false);
  const [konum, setKonum] = useState<{
    ust: number;
    sol: number;
    yukari: boolean;
  } | null>(null);
  const kutuRef = useRef<HTMLSpanElement>(null);
  const baloncukRef = useRef<HTMLSpanElement>(null);

  const yerlestir = useCallback(() => {
    const el = kutuRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const g = Math.min(genislik, window.innerWidth - 24);
    // Tetikleyicinin ortasına hizala, sonra ekrana sığdır.
    const sol = Math.min(
      Math.max(12, r.left + r.width / 2 - g / 2),
      window.innerWidth - g - 12,
    );
    // Altta yer yoksa üstte aç. Buradaki 140 yalnız ilk tahmin; baloncuk
    // render edildikten sonra gerçek yüksekliğiyle yeniden değerlendirilir.
    const yukari = window.innerHeight - r.bottom <= 140;
    setKonum({ ust: yukari ? r.top - 8 : r.bottom + 8, sol, yukari });
  }, [genislik]);

  const ac = useCallback(() => {
    yerlestir();
    setAcik(true);
  }, [yerlestir]);

  const kapat = useCallback(() => setAcik(false), []);

  // Sayfa kaydırılır ya da pencere boyutlanırsa baloncuk hedefinden kopar.
  useEffect(() => {
    if (!acik) return;
    const kapatVeGec = () => kapat();
    window.addEventListener("scroll", kapatVeGec, true);
    window.addEventListener("resize", kapatVeGec);
    return () => {
      window.removeEventListener("scroll", kapatVeGec, true);
      window.removeEventListener("resize", kapatVeGec);
    };
  }, [acik, kapat]);

  /**
   * Yönü metnin gerçek yüksekliğiyle karara bağla.
   *
   * Yön eskiden "tetikleyicinin altında 140px var mı" tahminiyle seçiliyordu:
   * uzun bir metin (ör. güvence açıklaması) aşağı açılıp ekranın altından
   * taşıyor, okunamıyordu. Baloncuk render edildikten sonra ölçüp aşağıya
   * sığmıyorsa ve yukarıda yer varsa yukarı çeviriyoruz.
   */
  useLayoutEffect(() => {
    if (!acik || !konum) return;
    const el = kutuRef.current;
    const balon = baloncukRef.current;
    if (!el || !balon) return;
    const r = el.getBoundingClientRect();
    const h = balon.offsetHeight;
    const altaSigar = r.bottom + 8 + h <= window.innerHeight - 12;
    const usteSigar = r.top - 8 - h >= 12;
    const yukari = konum.yukari ? !(!usteSigar && altaSigar) : !altaSigar && usteSigar;
    if (yukari === konum.yukari) return;
    setKonum({ ust: yukari ? r.top - 8 : r.bottom + 8, sol: konum.sol, yukari });
  }, [acik, konum]);

  const g = typeof window === "undefined" ? genislik : Math.min(genislik, window.innerWidth - 24);

  return (
    <span
      ref={kutuRef}
      {...(pasif
        ? {}
        : {
            tabIndex: 0,
            role: "button",
            "aria-expanded": acik,
            "aria-label": `Tamamını göster: ${icerik}`,
            onMouseEnter: ac,
            onMouseLeave: kapat,
            onFocus: ac,
            onBlur: kapat,
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === "Escape") kapat();
            },
          })}
      className={`min-w-0 outline-none ${
        pasif
          ? ""
          : "cursor-help focus-visible:ring-2 focus-visible:ring-primary/40"
      } ${className}`}
    >
      {children}

      {!pasif && acik && konum && (
        <span
          ref={baloncukRef}
          role="tooltip"
          style={{
            top: konum.ust,
            left: konum.sol,
            width: g,
            transform: konum.yukari ? "translateY(-100%)" : undefined,
          }}
          className="fixed z-50 block max-h-[50vh] overflow-y-auto rounded-card border border-border bg-card p-3.5 text-[13px] font-medium leading-relaxed text-ink-700 shadow-[var(--shadow-pop)] [overflow-wrap:anywhere]"
        >
          {baslik && (
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.8px] text-ink-400">
              {baslik}
            </span>
          )}
          {icerik}
        </span>
      )}
    </span>
  );
}
