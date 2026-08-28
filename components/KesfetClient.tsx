"use client";

import { karsilastirmaAnahtari } from "@/lib/metin";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  kategoriler,
  iller,
  talepDurumlari,
  talepDurumUyar,
} from "@/lib/data";
import type { Talep } from "@/lib/data";
import { TalepCard } from "@/components/TalepCard";
import { muadilKabulEder, talepleriSirala } from "@/lib/talep-durum";
import type { TalepSirasi } from "@/lib/talep-durum";

type Sort = TalepSirasi;

const PAGE = 6;

const sortOptions: { value: Sort; label: string }[] = [
  { value: "yeni", label: "Tarihe göre en yeni talep" },
  { value: "eski", label: "Tarihe göre en eski talep" },
  { value: "artan", label: "Fiyat (artan)" },
  { value: "azalan", label: "Fiyat (azalan)" },
  { value: "sunum", label: "En çok sunum" },
];

// Arama karşılaştırması ortak anahtar üzerinden: `toLocaleLowerCase("tr")`
// I → ı, İ → i yaptığı için "istanbul" araması "İstanbul" ilanını
// bulamıyordu (bkz. lib/metin.ts).
const tr = karsilastirmaAnahtari;

export function KesfetClient({
  talepler,
  katSayilari,
  initialQ = "",
  initialKats = [],
  initialMuadil = false,
  ilgiliTalepler = [],
}: {
  /** Sunucudan gelen talepler — client bileşen veri katmanına dokunmaz. */
  talepler: Talep[];
  katSayilari: Record<string, number>;
  initialQ?: string;
  initialKats?: string[];
  /**
   * Yalnızca "muadil kabul" talepleri — `?muadil=1` ile gelir.
   *
   * Muadil kabul artık ilan kartında etiket olarak gösterilmiyor; alıcının
   * bu tercihi ARAMADA işe yarar: muadil ürün getirebilen satıcı filtreyi
   * işaretler ve yalnızca muadile açık talepleri görür.
   */
  initialMuadil?: boolean;
  /** Kullanıcının kendi açtığı ya da sunum yaptığı talepler. */
  ilgiliTalepler?: string[];
}) {
  // Ürün durumu filtresi — gelen taleplerdeki gerçek durum değerlerinden.
  const durumSecenekleri = useMemo(
    // Talep birden çok durum kabul edebilir; seçenekler tekil değerlerden kurulur.
    () => [...new Set(talepler.flatMap((t) => talepDurumlari(t)))],
    [talepler],
  );
  const [q, setQ] = useState(initialQ);
  const [kats, setKats] = useState<string[]>(initialKats);
  const [il, setIl] = useState<string>("Tümü");
  const [minF, setMinF] = useState("");
  const [maxF, setMaxF] = useState("");
  const [durumlar, setDurumlar] = useState<string[]>([]);
  const [sadeceAcil, setSadeceAcil] = useState(false);
  const [sadeceMuadil, setSadeceMuadil] = useState(initialMuadil);
  const [sort, setSort] = useState<Sort>("yeni");
  const [visible, setVisible] = useState(PAGE);

  const sonuclar = useMemo(() => {
    const qq = tr(q.trim());
    const minN = minF ? Number(minF) : null;
    const maxN = maxF ? Number(maxF) : null;

    const filtered = talepler.filter((t) => {
      if (
        qq &&
        // Arama başlıkla sınırlı kalmasın: ürün ağacı ve açıklama da taransın.
        ![
          t.baslik,
          t.marka,
          t.kategori,
          t.aciklama,
          t.tur,
          t.cesit,
          t.model,
          t.renk,
          t.il,
          t.ilce,
        ].some((alan) => alan && tr(alan).includes(qq))
      )
        return false;
      if (kats.length && !kats.includes(t.kategori)) return false;
      if (il !== "Tümü" && t.il !== il) return false;
      if (minN != null && t.fiyatNum < minN) return false;
      if (maxN != null && t.fiyatNum > maxN) return false;
      // Talep hangi durumları kabul ediyorsa onlardan biri seçiliyse geçer.
      if (durumlar.length && !durumlar.some((d) => talepDurumUyar(t, d)))
        return false;
      if (sadeceAcil && !t.acil) return false;
      if (sadeceMuadil && !muadilKabulEder(t)) return false;
      return true;
    });

    // Karşılaştırma buraya gömülüydü ve test edilemiyordu; tarih
    // sıralaması da tam bu yüzden uzun süre sessizce bozuk kaldı.
    return talepleriSirala(filtered, sort);
  }, [talepler, q, kats, il, minF, maxF, durumlar, sadeceAcil, sadeceMuadil, sort]);

  const goster = sonuclar.slice(0, visible);
  const dahaVar = visible < sonuclar.length;

  function toggleKat(ad: string) {
    setVisible(PAGE);
    setKats((prev) =>
      prev.includes(ad) ? prev.filter((k) => k !== ad) : [...prev, ad],
    );
  }
  function toggleDurum(d: string) {
    setVisible(PAGE);
    setDurumlar((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function temizle() {
    setQ("");
    setKats([]);
    setIl("Tümü");
    setMinF("");
    setMaxF("");
    setDurumlar([]);
    setSadeceAcil(false);
    setSadeceMuadil(false);
    setVisible(PAGE);
  }

  const hasFilters =
    !!q ||
    kats.length > 0 ||
    il !== "Tümü" ||
    !!minF ||
    !!maxF ||
    durumlar.length > 0 ||
    sadeceAcil ||
    sadeceMuadil;

  const inputCls =
    "w-full min-w-0 box-border rounded-control border-[1.5px] border-border-input px-2.5 py-2 text-[13px] font-semibold text-ink-900 outline-none focus:border-primary";

  return (
    <main className="mx-auto max-w-[1440px] px-6 pb-14 pt-[22px]">
      <div className="mb-[18px]">
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Talepleri Keşfet
        </h1>
        <p className="mt-[7px] text-[13.5px] font-medium text-ink-500">
          Gerçek alıcı talepleri — fiyatı alıcı koydu, ürünü sen getir. Sunum
          göndermek ücretsiz.
        </p>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[256px_minmax(0,1fr)]">
        {/* ── Filtreler (ana ekrandan bağımsız kaydırılabilir) ── */}
        <aside className="rounded-card border border-border bg-card md:sticky md:top-[150px] md:max-h-[calc(100vh-170px)] md:overflow-y-auto md:overscroll-contain">
          <div className="p-[18px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-extrabold text-ink-900">
              FİLTRE
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={temizle}
                className="cursor-pointer text-[13px] font-semibold text-danger"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Öne çıkanlar */}
          <div className="mt-4">
            <div className="mb-2.5 text-[13px] font-bold uppercase tracking-[1.2px] text-ink-400">
              Öne çıkanlar
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSadeceAcil((v) => !v);
                  setVisible(PAGE);
                }}
                aria-pressed={sadeceAcil}
                className={`cursor-pointer rounded-full border-[1.5px] px-3 py-[7px] text-[13px] font-bold transition-colors ${
                  sadeceAcil
                    ? "border-acil bg-acil text-white"
                    : "border-border-input bg-card text-ink-500 hover:border-acil hover:text-acil"
                }`}
              >
                ! Acil
              </button>
              {/* Muadil kabul — alıcı, aradığı ürünün eşdeğerini de
                  değerlendiriyorsa talebi burada görünür. Etiket ilan
                  kartından kaldırıldı; tercih yalnızca bu filtreyle işe
                  yarıyor. */}
              <button
                type="button"
                onClick={() => {
                  setSadeceMuadil((v) => !v);
                  setVisible(PAGE);
                }}
                aria-pressed={sadeceMuadil}
                className={`cursor-pointer rounded-full border-[1.5px] px-3 py-[7px] text-[13px] font-bold transition-colors ${
                  sadeceMuadil
                    ? "border-primary bg-primary text-white"
                    : "border-border-input bg-card text-ink-500 hover:border-primary hover:text-primary"
                }`}
              >
                Muadil kabul
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2.5 text-[13px] font-bold uppercase tracking-[1.2px] text-ink-400">
              Kategori
            </div>
            <div className="flex flex-col gap-1">
              {kategoriler.map((k) => {
                const active = kats.includes(k.ad);
                return (
                  <button
                    key={k.ad}
                    type="button"
                    onClick={() => toggleKat(k.ad)}
                    className={`flex cursor-pointer items-center gap-[9px] rounded-control px-[9px] py-2 text-left transition-colors ${
                      active ? "bg-primary-soft" : "hover:bg-page"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 flex-none items-center justify-center rounded-[5px] text-[10px] font-extrabold ${
                        active
                          ? "bg-primary text-white"
                          : "border-[1.5px] border-border-input"
                      }`}
                    >
                      {active ? "✓" : ""}
                    </span>
                    <span
                      className={`flex-1 text-[13px] ${
                        active
                          ? "font-bold text-primary-hover"
                          : "font-semibold text-ink-700"
                      }`}
                    >
                      {k.ad}
                    </span>
                    <span className="text-[13px] font-semibold text-ink-400">
                      {katSayilari[k.ad] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-[18px] border-t border-hairline pt-4">
            <div className="mb-2.5 text-[13px] font-bold uppercase tracking-[1.2px] text-ink-400">
              İl
            </div>
            <select
              value={il}
              aria-label="İl seç"
              onChange={(e) => {
                setIl(e.target.value);
                setVisible(PAGE);
              }}
              className="w-full cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-2.5 py-[11px] text-[13px] font-semibold text-ink-900 outline-none"
            >
              <option value="Tümü">Tüm Türkiye</option>
              {iller.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-[18px] border-t border-hairline pt-4">
            <div className="mb-2.5 text-[13px] font-bold uppercase tracking-[1.2px] text-ink-400">
              Fiyat aralığı (TL)
            </div>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                aria-label="En az fiyat (TL)"
                value={minF}
                onChange={(e) => {
                  setMinF(e.target.value.replace(/[^0-9]/g, "").slice(0, 7));
                  setVisible(PAGE);
                }}
                placeholder="En az"
                className={inputCls}
              />
              <span className="flex-none text-[13px] font-semibold text-ink-300">
                —
              </span>
              <input
                inputMode="numeric"
                aria-label="En çok fiyat (TL)"
                value={maxF}
                onChange={(e) => {
                  setMaxF(e.target.value.replace(/[^0-9]/g, "").slice(0, 7));
                  setVisible(PAGE);
                }}
                placeholder="En çok"
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-[18px] border-t border-hairline pt-4">
            <div className="mb-2.5 text-[13px] font-bold uppercase tracking-[1.2px] text-ink-400">
              Ürün durumu
            </div>
            <div className="flex flex-col gap-1">
              {durumSecenekleri.map((d) => {
                const active = durumlar.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDurum(d)}
                    className={`flex cursor-pointer items-center gap-[9px] rounded-control px-[9px] py-2 text-left transition-colors ${
                      active ? "bg-primary-soft" : "hover:bg-page"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 flex-none items-center justify-center rounded-[5px] text-[10px] font-extrabold ${
                        active
                          ? "bg-primary text-white"
                          : "border-[1.5px] border-border-input"
                      }`}
                    >
                      {active ? "✓" : ""}
                    </span>
                    <span
                      className={`flex-1 text-[13px] ${
                        active
                          ? "font-bold text-primary-hover"
                          : "font-semibold text-ink-700"
                      }`}
                    >
                      {d}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          </div>
        </aside>

        {/* ── Sonuçlar ── */}
        <section className="min-w-0">
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <Link
              href="/talep-alarmlari"
              className="rounded-control border-[1.5px] border-accent bg-accent-soft px-3.5 py-[9px] text-[14px] font-extrabold text-accent-ink hover:brightness-95"
            >
              Talep Alarmı Kur
            </Link>
            <span className="text-sm font-bold text-ink-900">
              {sonuclar.length} açık talep
            </span>
            <div className="flex flex-wrap gap-1.5">
              {q.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setVisible(PAGE);
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-[7px] text-[11.5px] font-semibold text-white"
                >
                  Arama: “{q.trim()}” <span className="text-primary-soft">✕</span>
                </button>
              )}
              {kats.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKat(k)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-[7px] text-[11.5px] font-semibold text-white"
                >
                  {k} <span className="text-primary-soft">✕</span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[13.5px] font-bold text-ink-700">Sırala:</span>
              <select
                value={sort}
                aria-label="Sıralama"
                onChange={(e) => setSort(e.target.value as Sort)}
                className="cursor-pointer rounded-control border-[1.5px] border-primary bg-primary-soft px-3.5 py-[9px] text-[14px] font-extrabold text-primary-hover outline-none hover:bg-primary-soft-hover focus:border-primary"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sonuclar.length === 0 ? (
            <div className="rounded-card border border-dashed border-border-input bg-card px-6 py-16 text-center">
              <div className="text-[15px] font-bold text-ink-900">
                Bu filtrelere uygun talep yok
              </div>
              <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium text-ink-400">
                Filtreleri gevşetmeyi dene ya da bu kriterler için bir talep
                alarmı kur — eşleşen ilk talep düştüğünde haber verelim.
              </p>
              <button
                type="button"
                onClick={temizle}
                className="mt-4 cursor-pointer text-[13px] font-bold text-primary"
              >
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {goster.map((t: Talep) => (
                  <TalepCard
                    key={t.id}
                    talep={t}
                    ilgili={ilgiliTalepler.includes(t.id)}
                  />
                ))}
              </div>
              {dahaVar && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE)}
                    className="cursor-pointer rounded-xl border border-border-input bg-card px-6 py-3 text-sm font-bold text-ink-900 hover:border-primary hover:text-primary"
                  >
                    Daha fazla talep göster
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
