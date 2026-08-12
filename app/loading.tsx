/**
 * Sayfa segmenti sunucuda hazırlanırken gösterilen iskelet.
 * Şu an veriler sabit olduğu için nadiren görünür; backend bağlandığında
 * her gerçek veri beklemesinde devreye girer. Yer tutucular gerçek düzenin
 * ölçülerini taklit eder ki içerik gelince sayfa zıplamasın.
 */
export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-[1180px] px-6 pb-16 pt-10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Sayfa yükleniyor…</span>

      {/* Başlık bloğu */}
      <div className="motion-safe:animate-pulse">
        <div className="h-8 w-[260px] rounded-control bg-hairline" />
        <div className="mt-3 h-4 w-[420px] max-w-full rounded-control bg-hairline" />
      </div>

      {/* Kart ızgarası */}
      <div className="mt-8 grid grid-cols-2 gap-4 motion-safe:animate-pulse md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-border bg-card p-4"
          >
            <div className="h-[132px] w-full rounded-control bg-hairline" />
            <div className="mt-3.5 h-4 w-3/4 rounded bg-hairline" />
            <div className="mt-2 h-3 w-1/2 rounded bg-hairline" />
          </div>
        ))}
      </div>
    </main>
  );
}
