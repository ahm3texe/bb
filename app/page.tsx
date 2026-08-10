import Link from "next/link";
import { talepler, kategoriler, kategoriSayilari } from "@/lib/data";
import { TalepCard } from "@/components/TalepCard";
import { ButtonLink } from "@/components/ui/Button";
import { kategoriIkonlar } from "@/components/KategoriIkon";

const nasilAdimlar = [
  {
    n: "1",
    baslik: "Talebini aç",
    metin:
      "Aradığın ürünü, fiyatını ve durumunu birkaç dakikada ilan et. Fiyatı sen belirlersin.",
  },
  {
    n: "2",
    baslik: "Sunumlar sana gelsin",
    metin:
      "Elinde o ürün olan satıcılar fotoğraflı sunumlarıyla talebine gelir; hepsini tek yerde karşılaştır.",
  },
  {
    n: "3",
    baslik: "Anlaş, güvenle al",
    metin:
      "Beğendiğinden teklif iste, sohbette pazarlık et; ödeme alıcı onayına kadar BulBana güvencesinde.",
  },
];

export default function AnaSayfa() {
  // "Yeni açılan talepler" — gerçekten en yeniler (eklendi'ye göre).
  const guncel = [...talepler].sort((a, b) => a.eklendi - b.eklendi).slice(0, 10);
  const katSayi = kategoriSayilari();

  return (
    <main>
      {/* ── Hero ── */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1180px] px-6 py-16">
          <div>
            <span className="inline-block rounded-lg bg-accent px-3 py-2 text-[11px] font-extrabold uppercase tracking-[1.6px] text-ink-900">
              Ters Pazar
            </span>
            <h1 className="mt-[18px] text-balance text-[46px] font-extrabold leading-[1.12] tracking-[-1.5px] text-ink-900">
              Bulamadığın <span className="text-primary">ürünü ilan et</span>,{" "}
              <span className="text-accent">satıcılar sana gelsin.</span>
            </h1>
            <p className="mt-[18px] max-w-[480px] text-pretty text-base font-medium leading-relaxed text-ink-500">
              Türkiye&apos;nin ters pazar platformu: Talebi alıcı oluşturur,
              satıcılar ise uygun ürünleriyle doğrudan teklif sunar.
            </p>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <ButtonLink href="/ilan-ac" variant="primary" size="lg">
                Aradığını İlan Et
              </ButtonLink>
              <ButtonLink href="/kesfet" variant="sellerOutline" size="lg">
                Talepleri Keşfet
              </ButtonLink>
            </div>
          </div>

        </div>
      </section>

      {/* ── Kategoriler ── */}
      <section
        id="kategoriler"
        className="mx-auto max-w-[1180px] px-6 pb-2 pt-11"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[22px] font-extrabold text-ink-900">
            Kategorilere göz at
          </h2>
          <Link href="/kesfet" className="text-[13px] font-semibold">
            Tüm kategoriler ›
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {kategoriler.map((k) => {
            const Ikon = kategoriIkonlar[k.ad];
            return (
              <Link
                key={k.ad}
                href={`/kesfet?kategori=${encodeURIComponent(k.ad)}`}
                className="flex items-center gap-4 rounded-card border border-border bg-card px-5 py-4 hover:border-primary"
              >
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary-soft text-[17px] font-extrabold text-primary-hover">
                  {Ikon ? <Ikon className="h-6 w-6" /> : k.harf}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-ink-900">
                    {k.ad}
                  </div>
                  <div className="mt-[3px] text-[12.5px] font-medium text-ink-400">
                    {katSayi[k.ad] ?? 0} açık talep
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Yeni açılan talepler ── */}
      <section className="mx-auto max-w-[1180px] px-6 pb-2 pt-10">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-extrabold text-ink-900">
              Yeni açılan talepler
            </h2>
            <p className="mt-1.5 text-[13px] font-medium text-ink-400">
              Elinde bu ürünlerden varsa, sunumunu gönder — alıcı seni bekliyor.
            </p>
          </div>
          <Link href="/kesfet" className="text-[13px] font-semibold">
            Tümünü gör ›
          </Link>
        </div>
        <div className="mt-[18px] grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {guncel.map((t) => (
            <TalepCard key={t.id} talep={t} />
          ))}
        </div>
      </section>

      {/* ── Nasıl çalışır ── */}
      <section className="mx-auto max-w-[1180px] px-6 pb-16 pt-12">
        <h2 className="text-[22px] font-extrabold text-ink-900">
          Nasıl çalışır?
        </h2>
        <div className="mt-[18px] grid gap-4 md:grid-cols-3">
          {nasilAdimlar.map((a) => (
            <div
              key={a.n}
              className="rounded-panel border border-border bg-card p-6"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-control text-[13px] font-extrabold ${
                  a.n === "2" ? "bg-accent text-ink-900" : "bg-primary text-white"
                }`}
              >
                {a.n}
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold text-ink-900">
                {a.baslik}
              </h3>
              <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink-500">
                {a.metin}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
