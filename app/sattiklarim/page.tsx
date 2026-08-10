import type { Metadata } from "next";
import Link from "next/link";
import { HesapNav } from "@/components/HesapNav";
import { HesapKart } from "@/components/HesapKart";
import { fiyatText } from "@/lib/data";
import { satisOzeti, satislarim } from "@/lib/islemlerim";

export const metadata: Metadata = {
  title: "Sattıklarım",
  description:
    "Tamamlanan satışların — bedeli tahsil edilmiş siparişler, brüt ciro, komisyon ve net kazancınla birlikte.",
};

export default function SattiklarimPage() {
  const { brut, komisyon, net } = satisOzeti();

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <HesapNav active="/sattiklarim" />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <HesapKart />

        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink-900">
            Sattıklarım
          </h1>
          <p className="mb-4 mt-1 text-[13px] font-medium text-ink-400">
            Yalnızca tamamlanan satışlar: bedeli tahsil edilip hesabına geçmiş
            siparişler.
          </p>

          {/* ── Özet ── */}
          <div className="grid gap-3.5 md:grid-cols-3">
            <div className="rounded-card bg-ink-900 p-5 text-white">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#8b7bb0]">
                Net kazanç
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-accent">
                {fiyatText(net)}
              </div>
              <div className="mt-3 text-[11.5px] font-medium leading-[1.5] text-[#b6a9d4]">
                {fiyatText(brut)} brüt − {fiyatText(komisyon)} komisyon
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Tamamlanan satış
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-ink-900">
                {satislarim.length}
              </div>
              <div className="mt-3 text-[11.5px] font-medium text-ink-300">
                Tamamının bedeli tahsil edildi
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Ortalama satış
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-ink-900">
                {fiyatText(Math.round(net / satislarim.length))}
              </div>
              <div className="mt-3 text-[11.5px] font-medium text-ink-300">
                Komisyon sonrası
              </div>
            </div>
          </div>

          {/* ── Liste ── */}
          <section className="mt-5 rounded-panel border border-border bg-card p-[22px]">
            <h2 className="mb-4 text-[17px] font-extrabold text-ink-900">
              Tamamlanan satışlar ({satislarim.length})
            </h2>
            <div className="flex flex-col">
              {satislarim.map((s) => (
                <Link
                  key={s.id}
                  href={`/islem/satis-${s.id}`}
                  className="-mx-2 flex flex-wrap items-center gap-3.5 rounded-[12px] border-t border-hairline px-2 py-3.5 transition-colors hover:bg-subtle"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent text-[12px] font-bold text-accent-ink">
                    {s.harf}
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <div className="text-[13.5px] font-bold leading-snug text-ink-900">
                      {s.ilanBaslik}
                    </div>
                    <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                      {s.urun} · {s.alici} · {s.tarih}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[14px] font-extrabold text-accent-ink">
                      {fiyatText(s.brut - s.komisyon)}
                    </div>
                    <div className="mt-[3px] text-[11px] font-medium text-ink-300">
                      {fiyatText(s.brut)} − {fiyatText(s.komisyon)} komisyon
                    </div>
                  </div>
                  <span
                    className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                      s.durum === "Bakiyede"
                        ? "bg-primary-soft text-primary-hover"
                        : "bg-page text-ink-500"
                    }`}
                  >
                    {s.durum}
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] font-medium leading-[1.5] text-ink-300">
              Alıcı onayı bekleyen ya da kargo aşamasındaki satışların burada
              görünmez; bedeli tahsil edilene kadar Mali Tablom sayfasında
              &ldquo;onay bekleyen&rdquo; olarak durur.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
