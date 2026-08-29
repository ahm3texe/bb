"use client";

import { useState } from "react";
import type { AliciKalite } from "@/lib/alici-kalitesi";
import { SEVIYE_STIL } from "@/lib/alici-kalitesi";

/**
 * Kullanıcı Kalitesi'nin GEREKÇESİ.
 *
 * `aliciKalitesi()` beş sinyali ağırlıklandırıp 0-100 arası bir puan,
 * sinyal kırılımı, güçlü/zayıf yanlar ve "yeni alıcı" bayrağı üretiyordu;
 * ekrana çıkan tek şey seviye rozetiydi. Yani hesaplanan verinin neredeyse
 * tamamı hiçbir yerde görünmüyordu — üstelik tipin kendi dokümanı "kartta
 * 'yeni alıcı' uyarısı gösterilir" diye söz veriyordu ve o uyarı yoktu.
 *
 * Kırılım katlı duruyor: rozet tek satırlık cevabı veriyor, merak eden
 * açıp hangi sinyalin ne kadar katkı verdiğini görüyor.
 */
export function KaliteKirilimi({ kalite }: { kalite: AliciKalite }) {
  const [acik, setAcik] = useState(false);
  const stil = SEVIYE_STIL[kalite.seviye];
  // Ölçümü olmayan sinyal toplama girmez; listede "—" ile görünür.
  const olculen = kalite.sinyaller.filter((s) => s.veriVar);

  return (
    <div className="mt-2">
      {kalite.yeniAlici && (
        <p className="text-[11.5px] font-semibold leading-snug text-ink-400">
          Yeni kullanıcı — geçmişi puanı anlamlı kılacak kadar dolu değil.
        </p>
      )}
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        className="mt-1 cursor-pointer text-[11.5px] font-bold text-ink-400 underline underline-offset-2 hover:text-primary"
      >
        {acik ? "Kırılımı gizle" : "Neden bu seviye?"}
      </button>

      {acik && (
        <div className="mt-2 rounded-[12px] border border-hairline bg-subtle p-3 text-left">
          {olculen.length > 0 && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-400">
                Kalite puanı
              </span>
              <span className="text-[13px] font-extrabold text-ink-900">
                {kalite.puan}/100
              </span>
            </div>
          )}
          <p className="mt-1 text-[11.5px] font-medium leading-snug text-ink-500">
            {kalite.ozet}
          </p>

          <ul className="mt-2.5 flex flex-col gap-2">
            {kalite.sinyaller.map((s) => (
              <li key={s.ad}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11.5px] font-semibold text-ink-700">
                    {s.ad}
                  </span>
                  <span className="text-[11.5px] font-bold text-ink-900">
                    {/* Ölçüm yoksa "—": veri yokluğu ile kötü performans
                        aynı şey değil (bkz. KaliteSinyal.veriVar). */}
                    {s.veriVar ? s.deger : "—"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hairline">
                  <div
                    className={`h-full rounded-full ${s.veriVar ? stil.bar : "bg-transparent"}`}
                    style={{
                      width: s.veriVar
                        ? `${Math.round((s.puan / s.agirlik) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {kalite.gucluYanlar.length > 0 && (
            <p className="mt-2.5 text-[11.5px] font-medium leading-snug text-ink-500">
              <span className="font-bold text-ink-700">Güçlü yanlar:</span>{" "}
              {kalite.gucluYanlar.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
