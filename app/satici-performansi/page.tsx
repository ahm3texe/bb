import type { Metadata } from "next";
import Link from "next/link";
import { fiyatText } from "@/lib/data";

export const metadata: Metadata = {
  title: "Satıcı Performansım",
  description:
    "Sunum, teklif ve satış dönüşümlerin, aylık net kazancın ve satıcı seviyen — hangi taleplere sunum yapmanın kazandırdığını gör.",
};

// Aylık net kazanç — "Net kazanç" kartındaki rakam bu dizinin toplamına eşittir.
const aylikKazanc = [
  { ay: "Şub", tam: "Şubat", tl: 3150 },
  { ay: "Mar", tam: "Mart", tl: 5400 },
  { ay: "Nis", tam: "Nisan", tl: 4230 },
  { ay: "May", tam: "Mayıs", tl: 7560 },
  { ay: "Haz", tam: "Haziran", tl: 8930 },
  { ay: "Tem", tam: "Temmuz", tl: 9450 },
];
const netKazanc = aylikKazanc.reduce((t, m) => t + m.tl, 0); // 38.720 TL
const maxAy = Math.max(...aylikKazanc.map((m) => m.tl));

// Sunum → satış hunisi — bar genişliği ilk adıma (gönderilen sunum) oranlanır.
const huni = [
  { ad: "Gönderilen sunum", n: 47, renk: "bg-primary" },
  { ad: "Teklif istendi", n: 19, renk: "bg-[#9f6ff0]" },
  { ad: "Pazarlık sohbeti", n: 16, renk: "bg-[#c4a5f7]" },
  { ad: "Satış", n: 11, renk: "bg-accent" },
];
const huniBase = huni[0].n;

const katDonusum = [
  { ad: "Müzik & Plak", yuzde: 31, satis: 7, renk: "bg-accent", vurgu: true },
  { ad: "Koleksiyon", yuzde: 22, satis: 3, renk: "bg-[#c4a5f7]", vurgu: false },
  { ad: "Elektronik", yuzde: 12, satis: 1, renk: "bg-[#c4a5f7]", vurgu: false },
];

// Usta Satıcı kriterleri — karşılanan (lime + ✓) / karşılanmayan (mor bar).
const seviyeKriter = [
  { ad: "50 tamamlanmış satış", deger: "214/50 ✓", genislik: 100, karsilandi: true },
  { ad: "Puan ortalaması ≥ 4.9", deger: "4.8/4.9", genislik: 92, karsilandi: false },
  { ad: "Zamanında kargo ≥ %97", deger: "%98 ✓", genislik: 100, karsilandi: true },
];

export default function SaticiPerformansiPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[18px]">
      {/* Breadcrumb */}
      <nav className="py-1.5 pb-3.5 text-[12.5px] font-medium text-ink-400">
        <Link href="/profil" className="text-ink-400 hover:text-primary">
          Profilim
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">Satıcı Performansım</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
            Satıcı Performansım
          </h1>
          <div className="mt-[5px] text-[13px] font-medium text-ink-400">
            Son 90 gün · emre.k
          </div>
        </div>
        <span className="rounded-full bg-accent px-3 py-2 text-[11.5px] font-bold text-accent-ink">
          Güvenilir Satıcı
        </span>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── SOL ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Özet kartları */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-[14px] border border-border bg-card p-4">
              <div className="text-[11.5px] font-medium text-ink-400">
                Gönderilen sunum
              </div>
              <div className="mt-2 text-2xl font-extrabold text-ink-900">47</div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-4">
              <div className="text-[11.5px] font-medium text-ink-400">
                Teklif istenen
              </div>
              <div className="mt-2 text-2xl font-extrabold text-ink-900">19</div>
              <div className="mt-[7px] text-[11px] font-bold text-accent-ink">
                %40 dönüşüm
              </div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-4">
              <div className="text-[11.5px] font-medium text-ink-400">
                Satışa dönen
              </div>
              <div className="mt-2 text-2xl font-extrabold text-ink-900">11</div>
              <div className="mt-[7px] text-[11px] font-bold text-accent-ink">
                %23 dönüşüm
              </div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-4">
              <div className="text-[11.5px] font-medium leading-snug text-ink-400">
                Net kazanç · Son 6 ay
              </div>
              <div className="mt-2 text-2xl font-extrabold text-ink-900">
                {fiyatText(netKazanc)}
              </div>
              <Link
                href="/cuzdan"
                className="mt-[7px] inline-block text-[11px] font-bold text-primary hover:text-primary-hover"
              >Mali Tablom ›
              </Link>
            </div>
          </div>

          {/* Sunum hunisi */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <h2 className="mb-[18px] text-[17px] font-extrabold text-ink-900">
              Sunum → Satış Hunisi
            </h2>
            <div className="flex flex-col gap-3">
              {huni.map((h, i) => {
                const pct = Math.round((h.n / huniBase) * 100);
                return (
                  <div key={h.ad}>
                    <div className="mb-1.5 flex justify-between text-[12.5px] font-semibold">
                      <span className="text-ink-900">{h.ad}</span>
                      {i === 0 ? (
                        <span className="font-extrabold text-ink-900">{h.n}</span>
                      ) : (
                        <span className="text-ink-400">
                          {h.n} · %{pct}
                        </span>
                      )}
                    </div>
                    <div
                      className={`h-[26px] rounded-lg ${h.renk}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs font-medium leading-relaxed text-ink-400">
              Kategori ortalaması %14 — satış dönüşümün ortalamanın{" "}
              <strong className="text-accent-ink">1,6 katı</strong>. Sunumlarına
              video eklediğinde teklif isteme oranın %52&apos;ye çıkıyor.
            </p>
          </section>

          {/* Aylık kazanç */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-extrabold text-ink-900">
                Aylık Net Kazanç
              </h2>
              <span className="text-xs font-semibold text-ink-400">
                Son 6 ay · komisyon düşülmüş
              </span>
            </div>
            <div className="mt-[18px] flex h-[150px] items-end gap-3.5">
              {aylikKazanc.map((m, i) => {
                const son = i === aylikKazanc.length - 1;
                const h = Math.round((m.tl / maxAy) * 73);
                return (
                  <div
                    key={m.ay}
                    className="flex h-full flex-1 flex-col justify-end"
                  >
                    <div
                      title={`${m.tam} · ${fiyatText(m.tl)}`}
                      className={`rounded-t-md ${son ? "bg-primary" : "bg-[#d8ccf0]"}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-6 gap-3.5 text-center text-[10.5px] font-semibold text-ink-300">
              {aylikKazanc.map((m) => (
                <span key={m.ay}>{m.ay}</span>
              ))}
            </div>
          </section>

          {/* Kategori dönüşümü */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <h2 className="mb-1 text-[17px] font-extrabold text-ink-900">
              Kategoriye Göre Satış Dönüşümü
            </h2>
            <p className="mb-4 text-[12.5px] font-medium leading-normal text-ink-400">
              Hangi taleplere sunum göndermenin sana daha çok kazandırdığını
              gösterir.
            </p>
            <div className="flex flex-col gap-3">
              {katDonusum.map((k) => (
                <div
                  key={k.ad}
                  className="grid grid-cols-[110px_1fr_92px] items-center gap-3 sm:grid-cols-[130px_1fr_92px]"
                >
                  <span className="text-[12.5px] font-semibold leading-snug text-ink-900">
                    {k.ad}
                  </span>
                  <div className="h-[18px] overflow-hidden rounded-md bg-hairline">
                    <div
                      className={`h-full ${k.renk}`}
                      style={{ width: `${k.yuzde * 2}%` }}
                    />
                  </div>
                  <span
                    className={`text-right text-xs font-bold ${
                      k.vurgu ? "text-accent-ink" : "text-ink-500"
                    }`}
                  >
                    %{k.yuzde} · {k.satis} satış
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── SAĞ ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          {/* Satıcı seviyesi */}
          <div className="rounded-card border border-border bg-card p-[18px]">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-ink-900">
                Satıcı Seviyesi
              </span>
              <span className="rounded-full bg-accent px-[9px] py-1.5 text-[10.5px] font-bold text-accent-ink">
                Güvenilir Satıcı
              </span>
            </div>
            <p className="mt-2.5 text-xs font-medium leading-relaxed text-ink-500">
              Sonraki seviye: <strong className="text-ink-900">Usta Satıcı</strong>{" "}
              — profilinde altın rozet + taleplerde öncelikli sıralama.
            </p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {seviyeKriter.map((k) => (
                <div key={k.ad}>
                  <div className="mb-[5px] flex justify-between text-[11.5px] font-semibold">
                    <span className="text-ink-500">{k.ad}</span>
                    <span className="font-bold text-ink-900">{k.deger}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#efebf5]">
                    <div
                      className={`h-full rounded-full ${
                        k.karsilandi ? "bg-accent" : "bg-primary"
                      }`}
                      style={{ width: `${k.genislik}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* İpuçları */}
          <div className="rounded-card bg-ink-900 p-[18px] text-white">
            <div className="text-[13.5px] font-extrabold">Dönüşümünü artır</div>
            <div className="mt-3 flex flex-col gap-2.5">
              {[
                "Sunumuna video ekle — teklif oranın %40'tan %52'ye çıkıyor.",
                "Talep açıldıktan sonraki ilk 6 saatte sunum gönder.",
                "Talep alarmı kur — eşleşmeleri kaçırma.",
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-accent text-[9.5px] font-extrabold text-ink-900">
                    {i + 1}
                  </span>
                  <span className="text-[11.5px] font-medium leading-relaxed text-[#cfc5e8]">
                    {t}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/talep-alarmlari"
              className="mt-3.5 block rounded-[10px] bg-accent py-3 text-center text-[12.5px] font-bold text-ink-900 hover:brightness-95"
            >
              🔔 Talep Alarmı Kur
            </Link>
          </div>

          {/* Kısayollar */}
          <div className="rounded-card border border-border bg-card p-4">
            <div className="text-xs font-bold uppercase tracking-[1px] text-ink-400">
              Kısayollar
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5">
              <Link
                href="/kesfet"
                className="text-[12.5px] font-semibold text-primary hover:text-primary-hover"
              >
                Yeni talepleri keşfet ›
              </Link>
              <Link
                href="/profil?tab=sunumlar"
                className="text-[12.5px] font-semibold text-primary hover:text-primary-hover"
              >
                Sunumlarım ›
              </Link>
              <Link
                href="/cuzdan"
                className="text-[12.5px] font-semibold text-primary hover:text-primary-hover"
              >
                Mali Tablom &amp; çekim ›
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
