"use client";

import { useAktifKullanici } from "@/lib/aktif-kullanici";

/** Performans panelinin başlığı — aktif hesabın adını ve rozetini gösterir. */
export function SaticiPerformansiBaslik() {
  const aktif = useAktifKullanici();

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Satıcı Performansım
        </h1>
        <div className="mt-[5px] text-[13px] font-medium text-ink-400">
          Son 90 gün · {aktif.kullanici}
        </div>
      </div>
      {aktif.rozet && (
        <span className="rounded-full bg-accent px-3 py-2 text-[11.5px] font-bold text-accent-ink">
          {aktif.rozet}
        </span>
      )}
    </div>
  );
}
