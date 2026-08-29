/**
 * Segment beklerken gösterilen iskelet.
 *
 * Sayfaların çoğu `force-dynamic`: veri her istekte sunucuda okunuyor.
 * Bu dosya yokken kullanıcı o sürede boş ekran görüyordu. İskelet, gelecek
 * içeriğin kabaca şeklini verir — sayfa "atlamış" gibi görünmez.
 *
 * Animasyon `prefers-reduced-motion` altında durur (bkz. globals.css).
 */
export default function Loading() {
  return (
    <main
      className="mx-auto max-w-[1180px] px-6 pb-16 pt-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* Başlık bloğu */}
      <div className="animate-pulse">
        <div className="h-3.5 w-40 rounded-full bg-hairline" />
        <div className="mt-3.5 h-7 w-2/3 max-w-[420px] rounded-control bg-hairline" />
      </div>

      {/* İçerik: solda kartlar, sağda yan panel */}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-panel border border-border bg-card p-5"
            >
              <div className="h-[140px] w-full rounded-card bg-hairline" />
              <div className="mt-3.5 h-4 w-4/5 rounded-full bg-hairline" />
              <div className="mt-2.5 h-3 w-3/5 rounded-full bg-hairline" />
              <div className="mt-4 h-5 w-24 rounded-full bg-hairline" />
            </div>
          ))}
        </div>

        <div className="animate-pulse rounded-panel border border-border bg-card p-5">
          <div className="h-4 w-24 rounded-full bg-hairline" />
          <div className="mt-4 h-12 w-12 rounded-full bg-hairline" />
          <div className="mt-3.5 h-3.5 w-32 rounded-full bg-hairline" />
          <div className="mt-2.5 h-3 w-20 rounded-full bg-hairline" />
          <div className="mt-5 h-10 w-full rounded-control bg-hairline" />
        </div>
      </div>
    </main>
  );
}
