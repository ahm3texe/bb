import {
  aliciKalitesi,
  ESIK,
  SEVIYE_ETIKET,
  SEVIYE_STIL,
} from "@/lib/alici-kalitesi";
import type { AliciMetrik, AliciSeviye } from "@/lib/alici-kalitesi";

const SEVIYELER: AliciSeviye[] = ["dusuk", "orta", "yuksek"];

export function AliciKalitesiKart({
  kullanici,
  metrik,
}: {
  kullanici: string;
  metrik: AliciMetrik;
}) {
  const k = aliciKalitesi(metrik);
  const stil = SEVIYE_STIL[k.seviye];

  return (
    <section
      className={`rounded-panel border p-[22px] ${stil.yuzey}`}
      aria-label="Alıcı kalitesi"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-extrabold text-ink-900">
            Alıcı Kalitesi
          </h2>
          <p className="mt-[5px] text-[12.5px] font-medium text-ink-400">
            {kullanici} alıcı olarak nasıl davranıyor? · Son 12 ay
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`whitespace-nowrap rounded-full px-3 py-2 text-[11.5px] font-bold ${stil.rozet}`}
          >
            {k.etiket}
          </span>
          <span className="text-[13px] font-bold text-ink-500">
            {k.puan}
            <span className="font-semibold text-ink-300">/100</span>
          </span>
        </div>
      </div>

      {/* Düşük · Orta · Yüksek bandı — puanın hangi aralığa düştüğü */}
      <div className="mt-4">
        <div className="relative h-2 overflow-hidden rounded-full bg-hairline">
          <div
            className={`h-full rounded-full ${stil.bar}`}
            style={{ width: `${k.puan}%` }}
          />
          {[ESIK.orta, ESIK.yuksek].map((e) => (
            <span
              key={e}
              className="absolute top-0 h-full w-px bg-border-input"
              style={{ left: `${e}%` }}
              aria-hidden
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-ink-300">
          {SEVIYELER.map((s) => (
            <span
              key={s}
              className={s === k.seviye ? "font-bold text-ink-700" : undefined}
            >
              {SEVIYE_ETIKET[s]}
            </span>
          ))}
        </div>
      </div>

      <p className={`mt-3.5 text-[13px] font-semibold leading-normal ${stil.metin}`}>
        {k.ozet}
      </p>

      {k.yeniAlici && (
        <p className="mt-2.5 rounded-[10px] bg-primary-soft px-3 py-2.5 text-[12px] font-medium leading-normal text-primary-hover">
          Yeni alıcı — geçmiş işlem sayısı az olduğu için puan zamanla
          değişebilir.
        </p>
      )}

      {/* Puanı oluşturan sinyaller */}
      <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
        {k.sinyaller.map((s) => (
          <div key={s.ad} className="flex items-center gap-3">
            <span className="w-[112px] flex-none text-[12px] font-bold text-ink-700">
              {s.ad}
            </span>
            <div className="h-1.5 w-[70px] flex-none overflow-hidden rounded-full bg-hairline">
              <div
                className={`h-full rounded-full ${s.guclu ? "bg-accent" : "bg-primary"}`}
                style={{ width: `${(s.puan / s.agirlik) * 100}%` }}
              />
            </div>
            <span className="flex-1 text-[12px] font-medium text-ink-400">
              {s.deger}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3.5 text-[11px] font-medium leading-normal text-ink-300">
        Alıcı kalitesi; aldığı yıldız puanları, olumlu/olumsuz yorumlar,
        tamamlanan alımlar, iptal oranı ve sunumlara yanıt hızından otomatik
        hesaplanır. Elle değiştirilemez.
      </p>
    </section>
  );
}
