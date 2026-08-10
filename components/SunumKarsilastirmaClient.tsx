"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { fiyatText, getTalep } from "@/lib/data";
import { Chip } from "@/components/ui/Chip";
import { eslesmeOzeti, kunyeSatirlari } from "@/components/SunumOnizleme";
import type { GelenSunum } from "@/lib/gelen-sunumlar";
import { GELEN_TALEP_ID, gelenSunumlar } from "@/lib/gelen-sunumlar";

const gridCols = "grid grid-cols-[190px_1fr_1fr_1fr]";

/** Bir satır: solda etiket, sağda üç sunumun değeri. */
function DataRow({
  label,
  cells,
}: {
  label: string;
  cells: { node: ReactNode; best?: boolean }[];
}) {
  return (
    <div className={`${gridCols} border-b border-hairline`}>
      <div className="px-4 py-4 text-[14.5px] font-bold text-ink-500">
        {label}
      </div>
      {cells.map((c, i) => (
        <div
          key={i}
          className={`border-l border-hairline px-4 py-4 ${
            c.best ? "bg-accent" : ""
          }`}
        >
          {c.node}
        </div>
      ))}
    </div>
  );
}

function Deger({ children }: { children: ReactNode }) {
  return (
    <span className="text-[15.5px] font-bold text-ink-900">{children}</span>
  );
}

function Bos() {
  return <span className="text-[15.5px] font-bold text-ink-300">—</span>;
}

export function SunumKarsilastirmaClient() {
  // Üç pencere; başlangıçta hepsi boş, kullanıcı sırayla doldurur.
  const [secili, setSecili] = useState<(string | null)[]>([null, null, null]);
  // Hangi pencere için seçim listesi açık?
  const [acikSlot, setAcikSlot] = useState<number | null>(null);

  const sunumlar = secili.map((id) =>
    id ? (gelenSunumlar.find((s) => s.id === id) ?? null) : null,
  );
  const doluOlanlar = sunumlar.filter((s): s is GelenSunum => Boolean(s));

  // Karşılaştırma tek talep içinde yapılır: ilk seçilen sunum talebi belirler,
  // sonraki pencerelerde yalnızca aynı ilana gelen sunumlar listelenir.
  const aktifTalepId = doluOlanlar[0]?.talepId ?? null;
  const talep = getTalep(aktifTalepId ?? GELEN_TALEP_ID);
  const secilebilir = aktifTalepId
    ? gelenSunumlar.filter((s) => s.talepId === aktifTalepId)
    : gelenSunumlar;

  const sec = (slot: number, id: string) => {
    setSecili((prev) => prev.map((v, i) => (i === slot ? id : v)));
    setAcikSlot(null);
  };
  const kaldir = (slot: number) =>
    setSecili((prev) => prev.map((v, i) => (i === slot ? null : v)));

  // "En iyi" rozetleri — yalnızca en az iki sunum seçiliyken anlamlı.
  const karsilastirilabilir = doluOlanlar.length >= 2;
  const enDusukFiyat = Math.min(...doluOlanlar.map((s) => s.fiyatNum));
  const enHizliYanit = Math.min(...doluOlanlar.map((s) => s.yanitSaat));
  const enCokSatis = Math.max(...doluOlanlar.map((s) => s.satis));
  const enIyiKargo = Math.max(...doluOlanlar.map((s) => s.zamanindaKargo));
  const eslesmeler = doluOlanlar.map(
    (s) => eslesmeOzeti(kunyeSatirlari(s, getTalep(s.talepId)), getTalep(s.talepId)).uyan,
  );
  const enCokUyan = eslesmeler.length ? Math.max(...eslesmeler) : 0;

  const hucreler = <T,>(f: (s: GelenSunum) => T, best?: (s: GelenSunum) => boolean) =>
    sunumlar.map((s) => ({
      node: s ? <Deger>{f(s) as ReactNode}</Deger> : <Bos />,
      best: s && karsilastirilabilir && best ? best(s) : false,
    }));

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      {/* Sunum seçme listesi */}
      {acikSlot !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Karşılaştırmak için sunum seç"
          onClick={() => setAcikSlot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-[640px] overflow-y-auto rounded-panel border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-extrabold text-ink-900">
                  {acikSlot + 1}. pencereye sunum seç
                </h2>
                <p className="mt-1.5 text-[14.5px] font-medium text-ink-500">
                  {aktifTalepId ? (
                    <>
                      <b className="font-bold text-ink-900">{talep?.baslik}</b>{" "}
                      ilanına gelen {secilebilir.length} sunumdan birini seç.
                    </>
                  ) : (
                    <>
                      Karşılaştırmak istediğin ilanın sunumlarından biriyle
                      başla — sonraki pencereler aynı ilana kilitlenir.
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAcikSlot(null)}
                aria-label="Kapat"
                className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-page text-[16px] font-bold text-ink-500 hover:text-ink-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {secilebilir.map((s) => {
                const zatenSecili = secili.includes(s.id);
                const { uyan, toplam } = eslesmeOzeti(
                  kunyeSatirlari(s, getTalep(s.talepId)),
                  getTalep(s.talepId),
                );
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={zatenSecili}
                    onClick={() => sec(acikSlot, s.id)}
                    className={`flex items-center gap-3.5 rounded-card border p-3.5 text-left transition-colors ${
                      zatenSecili
                        ? "cursor-not-allowed border-hairline bg-page opacity-60"
                        : "cursor-pointer border-border bg-card hover:border-primary"
                    }`}
                  >
                    <span className="ref-image flex aspect-[3/4] w-[54px] flex-none items-center justify-center rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold text-ink-900">
                        {s.satici}{" "}
                        <span className="font-bold text-star">★ {s.puan}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[14px] font-medium text-ink-500">
                        {s.baslik}
                      </span>
                      {!aktifTalepId && (
                        <span className="mt-0.5 block truncate text-[13px] font-semibold text-primary">
                          {getTalep(s.talepId)?.baslik}
                        </span>
                      )}
                    </span>
                    <span className="flex-none text-right">
                      <span className="block text-[17px] font-extrabold text-primary-hover">
                        {fiyatText(s.fiyatNum)}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-bold text-ink-400">
                        {zatenSecili ? "Seçili" : `${uyan}/${toplam} uyuyor`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav
        aria-label="Sayfa yolu"
        className="flex flex-wrap items-center gap-1.5 py-1.5 text-[14px] font-medium text-ink-400"
      >
        <Link
          href={`/ilan/${aktifTalepId ?? GELEN_TALEP_ID}`}
          className="text-ink-400 hover:text-primary"
        >
          {aktifTalepId ? (talep?.baslik ?? "İlanım") : "İlanlarım"}
        </Link>
        <span aria-hidden>›</span>
        <span className="font-semibold text-ink-900">Sunum Karşılaştırma</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[34px] font-extrabold tracking-[-0.7px] text-ink-900">
          Sunum Karşılaştırma
        </h1>
        <Link
          href={`/ilan/${aktifTalepId ?? GELEN_TALEP_ID}`}
          className="text-[15px] font-semibold"
        >
          ‹ İlana dön
        </Link>
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-border bg-card">
        <div className="min-w-[900px]">
          {/* ── Pencereler: boşken tıkla-seç, doluyken satıcı künyesi ── */}
          <div className={`${gridCols} border-b border-hairline`}>
            <div className="flex items-center justify-center px-4 py-5 text-center text-[13px] font-extrabold uppercase leading-snug tracking-[1px] text-ink-500">
              Sunum Karşılaştırma Tablosu
            </div>

            {sunumlar.map((s, i) => (
              <div key={i} className="border-l border-hairline p-4">
                {!s ? (
                  <button
                    type="button"
                    onClick={() => setAcikSlot(i)}
                    className="flex h-full min-h-[124px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border-[2px] border-dashed border-border-input bg-subtle px-3 py-6 transition-colors hover:border-primary hover:bg-primary-soft"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[20px] font-bold leading-none text-white">
                      +
                    </span>
                    <span className="text-[15px] font-bold text-ink-900">
                      Sunum seç
                    </span>
                    <span className="text-[13px] font-medium text-ink-400">
                      {i + 1}. pencere
                    </span>
                  </button>
                ) : (
                  <div className="min-h-[124px]">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ink-900 text-[13px] font-bold text-accent">
                        {s.harf}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href="/satici-profili"
                          className="block text-[16px] font-bold text-ink-900 hover:text-primary"
                        >
                          {s.satici}
                        </Link>
                        <div className="mt-[3px] text-[13.5px] font-medium text-ink-400">
                          <span className="font-bold text-star">★ {s.puan}</span>{" "}
                          · {s.saticiTipi}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => kaldir(i)}
                        aria-label={`${s.satici} sunumunu penceresinden kaldır`}
                        className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full bg-page text-[13px] font-bold text-ink-400 hover:text-danger"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Chip variant="violet">{s.ne}</Chip>
                      <Link
                        href="/sunum-detay"
                        className="text-[13.5px] font-semibold"
                      >
                        Sunumu aç ›
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Karşılaştırma satırları ── */}
          <DataRow
            label="Fiyat teklifi"
            cells={sunumlar.map((s) => ({
              best: Boolean(
                s && karsilastirilabilir && s.fiyatNum === enDusukFiyat,
              ),
              node: s ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-[19px] font-extrabold text-primary-hover">
                    {fiyatText(s.fiyatNum)}
                  </span>
                  {karsilastirilabilir && s.fiyatNum === enDusukFiyat && (
                    <Chip variant="lime">En uygun</Chip>
                  )}
                </span>
              ) : (
                <Bos />
              ),
            }))}
          />

          <DataRow
            label="Kriter uyumu"
            cells={sunumlar.map((s) => {
              if (!s) return { node: <Bos /> };
              const { uyan, toplam, farkli } = eslesmeOzeti(
                kunyeSatirlari(s, getTalep(s.talepId)),
                getTalep(s.talepId),
              );
              return {
                best: karsilastirilabilir && uyan === enCokUyan,
                node: (
                  <span>
                    <span className="text-[15.5px] font-bold text-ink-900">
                      {uyan}/{toplam} kriter uyuyor
                    </span>
                    {farkli.length > 0 && (
                      <span className="mt-1 block text-[13.5px] font-semibold leading-snug text-danger">
                        ⚠ {farkli.map((r) => r.k).join(", ")} farklı
                      </span>
                    )}
                  </span>
                ),
              };
            })}
          />

          <DataRow
            label="Ürün durumu"
            cells={hucreler((s) => s.durum ?? "—")}
          />

          <DataRow
            label="Ürün defosu"
            cells={sunumlar.map((s) => ({
              node: s ? (
                s.defoVar ? (
                  <span className="text-[15.5px] font-bold text-danger">
                    Defolu{s.defoNot ? ` — ${s.defoNot}` : ""}
                  </span>
                ) : (
                  <Deger>Defosuz</Deger>
                )
              ) : (
                <Bos />
              ),
            }))}
          />

          <DataRow
            label="Birlikte gelenler"
            cells={hucreler(
              (s) =>
                [
                  s.kutu ? "Kutusu" : null,
                  s.fatura ? "Faturası" : null,
                  s.aksesuar ? "Aksesuarları" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—",
            )}
          />

          <DataRow
            label="Fotoğraf & video"
            cells={hucreler(
              (s) => `${s.fotolar} fotoğraf${s.video ? " · 1 video" : ""}`,
            )}
          />

          <DataRow label="Kargoya verme" cells={hucreler((s) => s.teslim ?? "—")} />
          <DataRow label="Kargo ücreti" cells={hucreler((s) => s.kargo ?? "—")} />

          <DataRow
            label="Satıcının notu"
            cells={sunumlar.map((s) => ({
              node: s ? (
                <p className="text-[14.5px] font-medium leading-relaxed text-ink-700">
                  {s.aciklama}
                </p>
              ) : (
                <Bos />
              ),
            }))}
          />

          <DataRow
            label="Tamamlanan satış"
            cells={hucreler(
              (s) => s.satis.toLocaleString("tr-TR"),
              (s) => s.satis === enCokSatis,
            )}
          />
          <DataRow
            label="Ort. yanıt süresi"
            cells={hucreler(
              (s) => `~${s.yanitSaat} saat`,
              (s) => s.yanitSaat === enHizliYanit,
            )}
          />
          <DataRow
            label="Zamanında kargo"
            cells={hucreler(
              (s) => `%${s.zamanindaKargo}`,
              (s) => s.zamanindaKargo === enIyiKargo,
            )}
          />
          <DataRow
            label="Konum"
            cells={hucreler((s) => [s.ilce, s.il].filter(Boolean).join(", "))}
          />

          {/* ── Aksiyon ── */}
          <div className={`${gridCols} bg-subtle`}>
            <div className="p-4" />
            {sunumlar.map((s, i) => (
              <div key={i} className="border-l border-hairline p-4">
                {!s ? (
                  <button
                    type="button"
                    onClick={() => setAcikSlot(i)}
                    className="w-full cursor-pointer rounded-[11px] border-[1.5px] border-border-input bg-card px-3 py-3.5 text-center text-[14.5px] font-bold text-ink-500 hover:border-primary hover:text-primary"
                  >
                    Sunum seç
                  </button>
                ) : (
                  <Link
                    href={`/mesajlar?satici=${encodeURIComponent(s.satici)}`}
                    className="block w-full rounded-[11px] bg-primary px-3 py-3.5 text-center text-[14.5px] font-bold text-white transition-colors hover:bg-primary-hover"
                  >
                    Sohbete Geç
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3.5 px-0.5 text-[13.5px] font-medium leading-relaxed text-ink-400">
        Satış, yanıt ve kargo metrikleri satıcının BulBana geçmişinden gelir.
        Sohbete geçmek ücretsizdir; fiyat pazarlığı sohbette yapılır.
      </p>
    </main>
  );
}
