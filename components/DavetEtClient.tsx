"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type Durum = "kazanildi" | "bekliyor" | "davet";

type Davet = {
  id: number;
  harf: string;
  ad: string;
  zaman: string;
  durum: Durum;
};

const DAVET_LINK = "bulbana.com/davet/emre-k-7D4F";

const rozet: Record<Durum, { ad: string; cls: string }> = {
  kazanildi: { ad: "Kazanıldı ✓", cls: "bg-accent text-accent-ink" },
  bekliyor: { ad: "İlk işlem bekleniyor", cls: "bg-[#efebf5] text-ink-500" },
  davet: { ad: "Davet edildi", cls: "bg-primary-soft text-primary-hover" },
};

const adimlar = [
  {
    n: "1",
    numBg: "bg-primary text-white",
    baslik: "Linkini paylaş",
    metin: "Davet linkin sana özel — dilediğin kanaldan gönder.",
  },
  {
    n: "2",
    numBg: "bg-primary text-white",
    baslik: "Arkadaşın ilk işlemini yapsın",
    metin: "Alıcı ya da satıcı olarak ilk tamamlanan işlem sayılır.",
  },
  {
    n: "3",
    numBg: "bg-accent text-ink-900",
    baslik: "İkiniz de kazanın",
    metin: "İkinize de bir sonraki satışta geçerli %2 komisyon hakkı tanımlanır.",
  },
];

export function DavetEtClient() {
  const [kopyalandi, setKopyalandi] = useState(false);
  const kopyaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [email, setEmail] = useState("");
  const [davetler, setDavetler] = useState<Davet[]>([
    { id: 1, harf: "SA", ad: "selin.a", zaman: "12 Haziran'da katıldı", durum: "kazanildi" },
    { id: 2, harf: "BT", ad: "baran.t", zaman: "28 Mayıs'ta katıldı", durum: "kazanildi" },
    { id: 3, harf: "DY", ad: "deniz.y", zaman: "3 Temmuz'da katıldı", durum: "bekliyor" },
  ]);
  const nextId = useRef(4);

  const gonderOk = /.+@.+\..+/.test(email.trim());

  function kopyala() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(DAVET_LINK).catch(() => {});
    }
    setKopyalandi(true);
    if (kopyaTimer.current) clearTimeout(kopyaTimer.current);
    kopyaTimer.current = setTimeout(() => setKopyalandi(false), 2500);
  }

  function gonder() {
    if (!gonderOk) return;
    const ad = email.trim().split("@")[0].slice(0, 16);
    setDavetler((prev) => [
      ...prev,
      {
        id: nextId.current++,
        harf: ad.slice(0, 2).toUpperCase(),
        ad,
        zaman: "Davet gönderildi — bugün",
        durum: "davet",
      },
    ]);
    setEmail("");
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-14 pt-[18px]">
      {/* Breadcrumb */}
      <div className="py-1.5 pb-3.5 text-[12.5px] font-medium text-ink-400">
        <Link href="/profil" className="text-ink-400 hover:text-primary">
          Profilim
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">Davet Et</span>
      </div>

      {/* Hero */}
      <section className="mb-6 rounded-panel bg-ink-900 p-9 text-white">
        <div className="max-w-[620px]">
          <span className="rounded-lg bg-accent px-[11px] py-[7px] text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-ink-900">
            Referans Programı
          </span>
          <h1 className="mt-4 text-pretty text-[32px] font-extrabold leading-[1.15] tracking-[-0.8px]">
            Arkadaşını davet et — ikinizin de komisyonu{" "}
            <span className="text-accent">yarıya insin</span>
          </h1>
          <p className="mt-3 text-pretty text-sm font-medium leading-[1.65] text-[#cfc5e8]">
            Davet ettiğin kişi ilk işlemini tamamladığında, ikiniz de bir sonraki
            satışınızda %4 yerine{" "}
            <strong className="text-white">%2 komisyon</strong> ödersiniz. BulBana
            ağı büyüdükçe aradığını bulma şansın artar — kazan-kazan.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <div className="flex min-w-[280px] max-w-[460px] flex-1 items-center gap-2.5 rounded-[13px] border border-[#4a3470] bg-[#3a2758] px-4 py-3.5">
            <span className="truncate font-mono text-[13.5px] font-bold tracking-[0.3px] text-[#e9dffa]">
              {DAVET_LINK}
            </span>
          </div>
          {kopyalandi ? (
            <button
              type="button"
              className="cursor-default rounded-[13px] bg-accent px-6 py-4 text-sm font-extrabold text-accent-ink"
            >
              Kopyalandı ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={kopyala}
              className="cursor-pointer rounded-[13px] bg-accent px-6 py-4 text-sm font-extrabold text-ink-900 transition-colors hover:brightness-95"
            >
              Linki Kopyala
            </button>
          )}
        </div>
      </section>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── SOL ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Nasıl işler */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <h2 className="mb-4 text-[17px] font-extrabold text-ink-900">
              Nasıl işler?
            </h2>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {adimlar.map((a) => (
                <div key={a.n} className="rounded-[14px] bg-page p-4">
                  <div
                    className={`mb-2.5 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${a.numBg}`}
                  >
                    {a.n}
                  </div>
                  <div className="mb-[5px] text-sm font-bold leading-[1.3] text-ink-900">
                    {a.baslik}
                  </div>
                  <div className="text-[12.5px] font-medium leading-[1.5] text-ink-500">
                    {a.metin}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Davetler */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-extrabold text-ink-900">
                Davetlerin <span className="text-primary">({davetler.length})</span>
              </h2>
              <span className="text-xs font-semibold text-accent-ink">
                2 indirim hakkı kazanıldı
              </span>
            </div>

            {davetler.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 border-b border-hairline py-3.5"
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-soft text-[11.5px] font-bold text-primary">
                  {d.harf}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold leading-tight text-ink-900">
                    {d.ad}
                  </div>
                  <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                    {d.zaman}
                  </div>
                </div>
                <span
                  className={`flex-none rounded-full px-[11px] py-[7px] text-[11px] font-bold ${rozet[d.durum].cls}`}
                >
                  {rozet[d.durum].ad}
                </span>
              </div>
            ))}

            {/* E-posta ile davet */}
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 60))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") gonder();
                }}
                placeholder="arkadasin@eposta.com"
                className="box-border min-w-[220px] flex-1 rounded-control border-[1.5px] border-border-input px-3.5 py-3 text-[13px] font-semibold text-ink-900 outline-none focus:border-primary"
              />
              {gonderOk ? (
                <button
                  type="button"
                  onClick={gonder}
                  className="cursor-pointer rounded-control bg-primary px-5 py-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  Davet Gönder
                </button>
              ) : (
                <div className="cursor-not-allowed rounded-control bg-[#efebf5] px-5 py-3.5 text-[13.5px] font-bold text-ink-300">
                  Davet Gönder
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── SAĞ ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          <div className="rounded-card border border-border bg-card p-[18px]">
            <div className="mb-3.5 text-sm font-extrabold text-ink-900">
              Kazandıkların
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[12.5px] font-medium">
                <span className="text-ink-400">Davet edilen</span>
                <span className="font-bold text-ink-900">
                  {davetler.length} kişi
                </span>
              </div>
              <div className="flex justify-between text-[12.5px] font-medium">
                <span className="text-ink-400">İlk işlemini tamamlayan</span>
                <span className="font-bold text-ink-900">2 kişi</span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2 text-[12.5px] font-medium">
                <span className="font-bold text-ink-900">%2 komisyon hakkı</span>
                <span className="font-extrabold text-accent-ink">2 adet</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium leading-[1.5] text-ink-300">
              İndirim hakkı, bir sonraki satışında otomatik uygulanır; 12 ay
              geçerlidir.
            </p>
          </div>

          <div className="rounded-card border border-accent bg-accent p-[18px]">
            <div className="text-[13.5px] font-extrabold text-accent-ink">
              Örnek kazanç
            </div>
            <p className="mt-2 text-xs font-medium leading-[1.6] text-ink-700">
              4.500 TL&apos;lik bir satışta komisyon normalde 180 TL. İndirim
              hakkınla <strong className="text-accent-ink">90 TL</strong>&apos;ye
              düşer — 90 TL cebinde kalır.
            </p>
          </div>

          <div className="rounded-card border border-border bg-card p-4">
            <div className="text-xs font-bold uppercase tracking-[1px] text-ink-400">
              Program kuralları
            </div>
            <div className="mt-2.5 flex flex-col gap-[7px] text-[11.5px] font-medium leading-[1.55] text-ink-500">
              <span>· Davet ettiğin kişi yeni üye olmalı</span>
              <span>· Aynı cihaz/kart ile açılan hesaplar sayılmaz</span>
              <span>· İndirim hakları birleştirilemez (satış başına 1)</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
