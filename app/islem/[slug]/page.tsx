import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fiyatText } from "@/lib/data";
import { getIslem, islemDetaylari } from "@/lib/islemlerim";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const islem = getIslem(slug);
  if (!islem) return { title: "İşlem bulunamadı" };
  return {
    title: `${islem.ilanBaslik} · ${islem.tur === "alim" ? "Alım" : "Satış"}`,
    description:
      "Tamamlanan işlemin dökümü: açılan talep, kabul edilen sunum ve ödeme özeti yan yana.",
  };
}

export function generateStaticParams() {
  return islemDetaylari().map((i) => ({ slug: i.slug }));
}

/** Panellerdeki tek satırlık alan gösterimi. */
function Satir({ ad, deger }: { ad: string; deger: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-hairline py-2.5">
      <span className="flex-none text-[12px] font-semibold text-ink-400">
        {ad}
      </span>
      <span className="text-right text-[12.5px] font-bold leading-snug text-ink-900">
        {deger}
      </span>
    </div>
  );
}

export default async function IslemPage({ params }: Params) {
  const { slug } = await params;
  const islem = getIslem(slug);
  if (!islem) notFound();

  const { talep, sunum, karsiTaraf } = islem;
  const alim = islem.tur === "alim";
  // Sunum fiyatı ile ilan bütçesi arasındaki fark — şeffaflığın özü.
  const fark = talep.fiyat - sunum.fiyat;
  const geriDonus = alim ? "/aldiklarim" : "/sattiklarim";

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      {/* Breadcrumb */}
      <nav className="pb-3.5 text-[12.5px] font-medium text-ink-400">
        <Link href={geriDonus} className="text-ink-400 hover:text-primary">
          {alim ? "Aldıklarım" : "Sattıklarım"}
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">İşlem dökümü</span>
      </nav>

      {/* Başlık */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                alim
                  ? "bg-primary-soft text-primary-hover"
                  : "bg-accent text-accent-ink"
              }`}
            >
              {alim ? "Alım" : "Satış"}
            </span>
            <span className="rounded-full bg-page px-2.5 py-1.5 text-[10.5px] font-bold text-ink-500">
              Tamamlandı · {islem.tarih}
            </span>
          </div>
          <h1 className="mt-2.5 text-[24px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
            {islem.ilanBaslik}
          </h1>
        </div>
        <div className="flex-none text-right">
          <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
            {alim ? "Ödediğin" : "Kazandığın"}
          </div>
          <div
            className={`mt-1 text-[26px] font-extrabold leading-none ${
              alim ? "text-ink-900" : "text-accent-ink"
            }`}
          >
            {alim ? "−" : "+"}
            {fiyatText(Math.abs(islem.netTutar))}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── Talep ↔ Sunum, yan yana ── */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Talep */}
          <section className="rounded-panel border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-soft px-2.5 py-1.5 text-[10.5px] font-bold text-primary-hover">
                Talep
              </span>
              <span className="text-[11.5px] font-medium text-ink-300">
                {alim ? "Senin ilanın" : `${karsiTaraf.kullanici} açtı`}
              </span>
            </div>
            <h2 className="mt-3 line-clamp-2 min-h-[40px] text-[15px] font-extrabold leading-snug text-ink-900">
              {islem.ilanBaslik}
            </h2>
            <p className="mt-2 line-clamp-3 min-h-[60px] text-[12.5px] font-medium leading-[1.6] text-ink-500">
              {talep.aciklama}
            </p>
            {/* Alan sırası sunum paneliyle birebir aynı — satırlar yan yana okunur. */}
            <div className="mt-3">
              <Satir ad="Talep fiyatı" deger={fiyatText(talep.fiyat)} />
              <Satir ad="Ürün durumu" deger={talep.durum} />
              <Satir ad="Ürün defosu" deger={talep.defo} />
              <Satir ad="Marka" deger={talep.marka} />
              <Satir ad="Model" deger={talep.model} />
              <Satir ad="Yıl" deger={talep.yil} />
              <Satir ad="Renk" deger={talep.renk} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                talep.konum,
                `İlan: ${talep.acilis}`,
                `${talep.sunumSayisi} sunum geldi`,
              ].map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-page px-2.5 py-[7px] text-[11px] font-semibold text-ink-500"
                >
                  {c}
                </span>
              ))}
            </div>
          </section>

          {/* Sunum */}
          <section className="rounded-panel border-[1.5px] border-accent bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent px-2.5 py-1.5 text-[10.5px] font-bold text-accent-ink">
                Kabul edilen sunum
              </span>
              <span className="text-[11.5px] font-medium text-ink-300">
                {alim ? `${karsiTaraf.kullanici} sundu` : "Senin sunumun"}
              </span>
            </div>
            <h2 className="mt-3 line-clamp-2 min-h-[40px] text-[15px] font-extrabold leading-snug text-ink-900">
              {sunum.urun}
            </h2>
            <p className="mt-2 line-clamp-3 min-h-[60px] text-[12.5px] font-medium leading-[1.6] text-ink-500">
              {sunum.not}
            </p>
            {/* Alan sırası talep paneliyle birebir aynı. */}
            <div className="mt-3">
              <Satir ad="Anlaşılan fiyat" deger={fiyatText(sunum.fiyat)} />
              <Satir ad="Ürün durumu" deger={sunum.durum} />
              <Satir ad="Ürün defosu" deger={sunum.defo} />
              <Satir ad="Marka" deger={sunum.marka} />
              <Satir ad="Model" deger={sunum.model} />
              <Satir ad="Yıl" deger={sunum.yil} />
              <Satir ad="Renk" deger={sunum.renk} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                sunum.kutu ? "Kutulu" : "Kutusuz",
                sunum.fatura ? "Faturalı" : "Faturasız",
                sunum.kargo,
                sunum.teslim,
              ].map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-page px-2.5 py-[7px] text-[11px] font-semibold text-ink-500"
                >
                  {c}
                </span>
              ))}
            </div>
          </section>

          {/* Bütçe ↔ sunum farkı */}
          <div className="rounded-card border border-border bg-subtle p-4 md:col-span-2">
            <p className="text-[12.5px] font-semibold leading-[1.6] text-ink-700">
              Talepte belirlenen fiyat {fiyatText(talep.fiyat)}, kabul edilen
              sunum {fiyatText(sunum.fiyat)}.{" "}
              {fark > 0 ? (
                <span className="text-accent-ink">
                  Sunum, talep fiyatının {fiyatText(fark)} altında kapandı.
                </span>
              ) : fark < 0 ? (
                <span className="text-danger">
                  Sunum, talep fiyatının {fiyatText(Math.abs(fark))} üstünde kapandı.
                </span>
              ) : (
                <span className="text-ink-500">
                  Sunum, tam talep fiyatı üzerinden kapandı.
                </span>
              )}
            </p>
          </div>

          {/* Ödeme dökümü */}
          <section className="overflow-hidden rounded-card border border-border bg-card md:col-span-2">
            <div className="bg-subtle px-[18px] py-3 text-[11px] font-bold uppercase tracking-[1px] text-ink-400">
              Ödeme dökümü
            </div>
            {islem.odeme.map((o) => (
              <div
                key={o.ad}
                className={`flex items-center justify-between gap-3 border-t border-hairline px-[18px] py-3 ${
                  o.vurgu ? "bg-page" : ""
                }`}
              >
                <span
                  className={`text-[12.5px] text-ink-900 ${
                    o.vurgu ? "font-extrabold" : "font-semibold"
                  }`}
                >
                  {o.ad}
                </span>
                <span
                  className={`tabular-nums text-[13px] ${
                    o.vurgu
                      ? "text-[14px] font-extrabold text-ink-900"
                      : o.tutar < 0
                        ? "font-bold text-danger"
                        : "font-bold text-ink-700"
                  }`}
                >
                  {o.tutar < 0 ? "−" : ""}
                  {fiyatText(Math.abs(o.tutar))}
                </span>
              </div>
            ))}
          </section>
        </div>

        {/* ── Sağ sütun: karşı taraf ── */}
        <aside className="rounded-panel border border-border bg-card p-5 lg:sticky lg:top-[150px]">
          <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
            {islem.karsiRol}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div
              className={`flex h-12 w-12 flex-none items-center justify-center rounded-full text-[14px] font-extrabold ${
                alim
                  ? "bg-ink-900 text-accent"
                  : "bg-primary-soft text-primary-hover"
              }`}
            >
              {karsiTaraf.harf}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-extrabold leading-tight text-ink-900">
                {karsiTaraf.kullanici}
              </div>
              <div className="mt-[3px] text-[12px] font-bold text-star">
                ★ {karsiTaraf.puan}
                <span className="ml-1 font-medium text-ink-400">
                  · {karsiTaraf.degerlendirme} değerlendirme
                </span>
              </div>
            </div>
          </div>

          <span className="mt-3 inline-block rounded-full bg-page px-2.5 py-1.5 text-[10.5px] font-bold text-ink-500">
            {karsiTaraf.rozet}
          </span>

          <div className="mt-3">
            <Satir
              ad="Tamamlanan işlem"
              deger={`${karsiTaraf.islem.toLocaleString("tr-TR")}`}
            />
            <Satir ad="Konum" deger={karsiTaraf.konum} />
            <Satir ad="Üyelik" deger={`${karsiTaraf.uyelik}'ten beri`} />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/satici-profili"
              className="rounded-[12px] bg-primary px-[18px] py-3 text-center text-[13px] font-bold text-white hover:bg-primary-hover"
            >
              Profili Gör
            </Link>
            <Link
              href="/mesajlar"
              className="rounded-[12px] border-[1.5px] border-border-input bg-card px-[18px] py-[11px] text-center text-[13px] font-bold text-ink-900 hover:border-primary hover:text-primary"
            >
              Mesajlaşmayı Aç
            </Link>
          </div>

          <p className="mt-3.5 text-[11px] font-medium leading-[1.5] text-ink-300">
            Bu işlem tamamlandı ve ödemesi kapandı. Bir sorun varsa mesajlaşma
            üzerinden iletişime geç.
          </p>
        </aside>
      </div>
    </main>
  );
}
