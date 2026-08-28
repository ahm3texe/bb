"use client";

import { useOturumSahibi } from "@/lib/aktif-kullanici";

/** Performans panelinin başlığı — aktif hesabın adını gösterir. */
export function SaticiPerformansiBaslik() {
  const aktif = useOturumSahibi();

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Satıcı Performansım
        </h1>
        {/* "Son 90 gün" YAZIYORDU ama sayfada öyle bir filtre yok: huni ve
            güven sinyalleri TÜM kayıtlardan sayılıyor, kazanç grafiği son
            6 ayı gösteriyor. Kapsamı yanlış söyleyen bir başlık, altındaki
            doğru sayıları da yanlış okutur. */}
        <div className="mt-[5px] text-[13px] font-medium text-ink-400">
          Tüm zamanlar · {aktif.kullanici}
        </div>
      </div>
    </div>
  );
}
