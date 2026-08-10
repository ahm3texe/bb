"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Talep } from "@/lib/data";
import { fiyatText, talepGorselleri } from "@/lib/data";
import { Chip } from "@/components/ui/Chip";

export function TalepCard({
  talep,
  favoride = false,
}: {
  talep: Talep;
  /** Favori listesinden gelen kartlarda kalp dolu başlar. */
  favoride?: boolean;
}) {
  const gorseller = talepGorselleri(talep.id);
  const [idx, setIdx] = useState(0);
  const [favori, setFavori] = useState(favoride);
  const cokluGorsel = gorseller.length > 1;

  // Kart bir <Link>; okların ilana gitmesini engelle, sadece görsel değiştir.
  const gecis = (e: React.MouseEvent, yon: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + yon + gorseller.length) % gorseller.length);
  };

  return (
    <Link
      href={`/ilan/${talep.id}`}
      className={`group block overflow-hidden rounded-card border transition-colors hover:border-primary ${
        // Üst sıra: etiket yok — kart hafif yeşil zeminle standart ilanlardan ayrışır.
        talep.pazarlik
          ? "border-accent bg-accent/15"
          : "border-border bg-card"
      }`}
    >
      <div
        className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden ${
          gorseller.length ? "bg-subtle" : "ref-image"
        }`}
      >
        {gorseller.length ? (
          <Image
            src={gorseller[idx]}
            alt={talep.baslik}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="font-mono text-[10px] text-[#968cac]">
            referans görsel
          </span>
        )}

        {/* Sol üst: favori kalbi */}
        <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFavori((v) => !v);
            }}
            aria-pressed={favori}
            aria-label={favori ? "Favorilerden çıkar" : "Favorilere ekle"}
            title={favori ? "Favorilerden çıkar" : "Favorilere ekle"}
            className="group/fav flex h-7 w-7 items-center justify-center rounded-full bg-card/85 shadow-sm backdrop-blur transition-colors hover:bg-card"
          >
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-[15px] w-[15px] transition-colors ${
                favori
                  ? "fill-[#e11d48] text-[#e11d48]"
                  : "fill-none text-ink-700 group-hover/fav:fill-[#e11d48] group-hover/fav:text-[#e11d48]"
              }`}
              aria-hidden
            >
              <path d="M12 20.5s-7.3-4.6-9.3-9.2A5.1 5.1 0 0112 5.6a5.1 5.1 0 019.3 5.7c-2 4.6-9.3 9.2-9.3 9.2z" />
            </svg>
          </button>
        </div>

        {/* Sağ üst: doğrulanmış rozeti */}
        {talep.dogrulanmis && (
          <span className="absolute right-2.5 top-2.5 z-20 rounded-md bg-primary px-2 py-[5px] text-[10.5px] font-extrabold text-white shadow-sm">
            ✓ Doğrulanmış
          </span>
        )}

        {/* Görsel önizleme — sağa/sola geçiş */}
        {cokluGorsel && (
          <>
            <button
              type="button"
              aria-label="Önceki görsel"
              onClick={(e) => gecis(e, -1)}
              className="absolute left-1.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-card/85 text-[15px] font-bold leading-none text-ink-900 opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-card group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Sonraki görsel"
              onClick={(e) => gecis(e, 1)}
              className="absolute right-1.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-card/85 text-[15px] font-bold leading-none text-ink-900 opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-card group-hover:opacity-100"
            >
              ›
            </button>
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1 drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]">
              {gorseller.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-3.5 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-[15px]">
        {/* Fiyat */}
        <div className="text-[20px] font-extrabold leading-none text-ink-900">
          {fiyatText(talep.fiyatNum)}
        </div>
        {/* MARKA · başlık */}
        <div className="mt-[10px] text-[11px] font-extrabold uppercase tracking-[0.8px] text-primary">
          {talep.marka}
        </div>
        <div className="mt-1 text-[18px] font-bold leading-snug text-ink-900">
          {talep.baslik}
        </div>
        {/* Açıklama */}
        <div className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-ink-400">
          {talep.aciklama}
        </div>
        {/* Renkli sinyal etiketleri — kart gövdesinde (aşağıda) */}
        {/* Üst sıra bir sıralama önceliğidir — kartta etiket olarak gösterilmez. */}
        {(talep.acil || talep.muadilKabul) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {talep.acil && (
              <Chip variant="acil" className="px-3 py-[7px] text-[12.5px]">
                ! Acil
              </Chip>
            )}
            {talep.muadilKabul && (
              <Chip variant="violet" className="px-3 py-[7px] text-[12.5px]">
                Muadil kabul
              </Chip>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
