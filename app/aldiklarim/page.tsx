import type { Metadata } from "next";
import Link from "next/link";
import { HesapNav } from "@/components/HesapNav";
import { HesapKart } from "@/components/HesapKart";
import { fiyatText } from "@/lib/data";
import { alimlarim, toplamHarcama } from "@/lib/islemlerim";

export const metadata: Metadata = {
  title: "Aldıklarım",
  description:
    "Tamamlanan alımların — ödemesi yapılmış ve teslimatı onaylanmış siparişler, toplam harcamanla birlikte.",
};

export default function AldiklarimPage() {
  const harcama = toplamHarcama();
  const urunToplam = alimlarim.reduce((t, a) => t + a.tutar, 0);
  const kargoToplam = alimlarim.reduce((t, a) => t + a.kargo, 0);

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <HesapNav active="/aldiklarim" />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <HesapKart />

        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink-900">
            Aldıklarım
          </h1>
          <p className="mb-4 mt-1 text-[13px] font-medium text-ink-400">
            Yalnızca tamamlanan alımlar: bedeli ödenmiş ve teslimatı
            onaylanmış siparişler.
          </p>

          {/* ── Özet ── */}
          <div className="grid gap-3.5 md:grid-cols-3">
            <div className="rounded-card bg-ink-900 p-5 text-white">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#8b7bb0]">
                Toplam harcama
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-accent">
                {fiyatText(harcama)}
              </div>
              <div className="mt-3 text-[11.5px] font-medium leading-[1.5] text-[#b6a9d4]">
                {fiyatText(urunToplam)} ürün + {fiyatText(kargoToplam)} kargo
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Tamamlanan alım
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-ink-900">
                {alimlarim.length}
              </div>
              <div className="mt-3 text-[11.5px] font-medium text-ink-300">
                Tamamı teslimat onaylı
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Ortalama sipariş
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-ink-900">
                {fiyatText(Math.round(harcama / alimlarim.length))}
              </div>
              <div className="mt-3 text-[11.5px] font-medium text-ink-300">
                Kargo dahil
              </div>
            </div>
          </div>

          {/* ── Liste ── */}
          <section className="mt-5 rounded-panel border border-border bg-card p-[22px]">
            <h2 className="mb-4 text-[17px] font-extrabold text-ink-900">
              Tamamlanan alımlar ({alimlarim.length})
            </h2>
            <div className="flex flex-col">
              {alimlarim.map((a) => (
                <Link
                  key={a.id}
                  href={`/islem/alim-${a.id}`}
                  className="-mx-2 flex flex-wrap items-center gap-3.5 rounded-[12px] border-t border-hairline px-2 py-3.5 transition-colors hover:bg-subtle"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold text-primary-hover">
                    {a.harf}
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <div className="text-[13.5px] font-bold leading-snug text-ink-900">
                      {a.ilanBaslik}
                    </div>
                    <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                      {a.urun} · {a.satici} · {a.tarih}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[14px] font-extrabold text-ink-900">
                      {fiyatText(a.tutar + a.kargo)}
                    </div>
                    <div className="mt-[3px] text-[11px] font-medium text-ink-300">
                      {a.kargo ? `${fiyatText(a.kargo)} kargo dahil` : "Kargo bedava"}
                    </div>
                  </div>
                  <span className="flex-none whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-1.5 text-[10.5px] font-bold text-primary-hover">
                    Teslim alındı
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] font-medium leading-[1.5] text-ink-300">
              Devam eden siparişlerin (ödeme, kargo, teslimat onayı bekleyenler)
              bu listede görünmez; onları sipariş sayfasından takip edersin.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
