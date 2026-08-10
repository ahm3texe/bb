"use client";

import { useState } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";

type Bolum = "genel" | "ilanlar" | "itirazlar" | "kullanicilar";
type IlanDurum = "bekliyor" | "onaylandi" | "reddedildi";
type ItirazDurum = "inceleniyor" | "iade" | "aktarildi";

const ilanData = [
  {
    id: 1,
    baslik: 'Kraftwerk "The Man-Machine" plak arıyorum',
    kategori: "Müzik & Plak",
    fiyat: "3.200 TL",
    kullanici: "emre.k",
  },
  {
    id: 2,
    baslik: "Sony Walkman WM-EX194 arıyorum — çalışır",
    kategori: "Elektronik",
    fiyat: "1.800 TL",
    kullanici: "emre.k",
  },
  {
    id: 3,
    baslik: "1970'ler Zippo çakmak arıyorum — koleksiyonluk",
    kategori: "Koleksiyon",
    fiyat: "2.400 TL",
    kullanici: "burak.izmir",
  },
  {
    id: 4,
    baslik: "Game Boy Color arıyorum — atari moru, kutulu",
    kategori: "Oyun & Konsol",
    fiyat: "2.900 TL",
    kullanici: "selin.gs",
  },
];

const itirazData = [
  {
    id: 1,
    no: "#IT-2094",
    urun: 'İmzalı "Dawn FM" CD',
    neden: "İmza / sertifika eksik",
    taraflar: "emre.k → plakdukkani34",
    tutar: "4.500 TL güvencede",
  },
  {
    id: 2,
    no: "#IT-2087",
    urun: "Seiko 5 otomatik saat",
    neden: "Ürün hasarlı geldi",
    taraflar: "canan.a → saatdukkani",
    tutar: "3.800 TL güvencede",
  },
  {
    id: 3,
    no: "#IT-2079",
    urun: "Lego 10276 Colosseum",
    neden: "Parça eksik iddiası",
    taraflar: "murat.b → legomarket",
    tutar: "12.000 TL",
  },
];

const kullaniciData = [
  { id: 1, ad: "plakdukkani34", islem: "214 satış · 2 alım", puan: "4.8" },
  { id: 2, ad: "emre.k", islem: "12 alım · 28 satış", puan: "4.9" },
  { id: 3, ad: "hizlisatici55", islem: "3 satış · 4 iptal", puan: "2.1" },
  { id: 4, ad: "muzikmarket", islem: "1.204 satış", puan: "4.9" },
];

const sonIslemler: {
  saat: string;
  metin: string;
  etiket: string;
  variant: "violet" | "danger" | "good";
}[] = [
  {
    saat: "14:32",
    metin:
      "Sipariş #BB-78412 — teklif kabul edildi, ödeme güvenceye alındı (4.500 TL)",
    etiket: "Ödeme",
    variant: "violet",
  },
  {
    saat: "14:20",
    metin:
      'İtiraz #IT-2094 açıldı — "İmza / sertifika eksik" (emre.k → plakdukkani34)',
    etiket: "İtiraz",
    variant: "danger",
  },
  {
    saat: "13:58",
    metin:
      'Yeni talep: "Kraftwerk The Man-Machine plak arıyorum" — 3.200 TL (onay kuyruğunda)',
    etiket: "İlan",
    variant: "good",
  },
  {
    saat: "13:41",
    metin:
      "Kargo teslim onayı — Polaroid 600, 2.112 TL satıcıya aktarıldı (2.200 TL satış, komisyon 88 TL)",
    etiket: "Aktarım",
    variant: "violet",
  },
];

const basliklar: Record<Bolum, string> = {
  genel: "Genel Bakış",
  ilanlar: "İlan Onayları",
  itirazlar: "İtirazlar",
  kullanicilar: "Kullanıcılar",
};

export function AdminClient() {
  const [bolum, setBolum] = useState<Bolum>("genel");
  const [ilanSt, setIlanSt] = useState<Record<number, IlanDurum>>({
    1: "bekliyor",
    2: "bekliyor",
    3: "bekliyor",
    4: "bekliyor",
  });
  const [itirazSt, setItirazSt] = useState<Record<number, ItirazDurum>>({
    1: "inceleniyor",
    2: "inceleniyor",
    3: "aktarildi",
  });
  const [askida, setAskida] = useState<Record<number, boolean>>({ 3: true });

  // Real counts — the "Onay bekleyen ilan" KPI and the sidebar "İlan Onayları"
  // badge read from THIS same value (no padding), so they always agree.
  const bekleyenIlan = ilanData.filter(
    (i) => ilanSt[i.id] === "bekliyor",
  ).length;
  const acikItiraz = itirazData.filter(
    (t) => itirazSt[t.id] === "inceleniyor",
  ).length;

  const menu: { id: Bolum; ad: string; harf: string; rozet: number }[] = [
    { id: "genel", ad: "Genel Bakış", harf: "G", rozet: 0 },
    { id: "ilanlar", ad: "İlan Onayları", harf: "İ", rozet: bekleyenIlan },
    { id: "itirazlar", ad: "İtirazlar", harf: "!", rozet: acikItiraz },
    { id: "kullanicilar", ad: "Kullanıcılar", harf: "K", rozet: 0 },
  ];

  return (
    <main className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-start gap-6 px-6 py-6 md:grid-cols-[232px_minmax(0,1fr)]">
      {/* ── Kenar çubuğu ── */}
      <aside className="sticky top-[150px] flex flex-col gap-1 rounded-panel bg-footer p-[14px] text-white">
        <div className="flex items-center gap-[9px] px-2 pb-4 pt-1">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-white text-[15px] font-extrabold text-ink-900">
            b
          </span>
          <div>
            <div className="text-base font-extrabold leading-none">
              bul<span className="text-[#a78bfa]">bana</span>
            </div>
            <div className="mt-[3px] text-[8.5px] font-bold leading-none tracking-[1.2px] text-accent">
              MODERASYON
            </div>
          </div>
        </div>

        {menu.map((m) => {
          const active = bolum === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setBolum(m.id)}
              className={`flex items-center gap-[10px] rounded-[10px] px-3 py-3 text-left transition-colors ${
                active
                  ? "bg-[#362258] font-bold text-white"
                  : "bg-transparent font-semibold text-[#b4a8d6] hover:bg-[#2e1d4e] hover:text-white"
              }`}
            >
              <span
                className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md text-[11px] font-extrabold ${
                  active ? "bg-accent text-ink-900" : "bg-[#362258] text-[#b4a8d6]"
                }`}
              >
                {m.harf}
              </span>
              <span className="flex-1 text-[13px]">{m.ad}</span>
              {m.rozet > 0 && (
                <span className="rounded-full bg-danger px-[7px] py-1 text-[10px] font-bold leading-none text-white">
                  {m.rozet}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-4 flex items-center gap-[9px] border-t border-footer-line px-2 pt-3">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-accent text-[11px] font-bold text-ink-900">
            AD
          </span>
          <div>
            <div className="text-xs font-bold leading-tight">admin.deniz</div>
            <Link
              href="/"
              className="text-[10.5px] font-semibold leading-tight text-[#8b7bb0] hover:text-white"
            >
              Siteye dön ›
            </Link>
          </div>
        </div>
      </aside>

      {/* ── İçerik ── */}
      <section className="min-w-0">
        <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[22px] font-extrabold leading-tight text-ink-900">
            {basliklar[bolum]}
          </h1>
          <span className="text-xs font-semibold text-ink-400">
            12 Temmuz 2026 · Bu panel platform ekibine özeldir (demo)
          </span>
        </div>

        {/* GENEL BAKIŞ */}
        {bolum === "genel" && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-[14px] border border-border bg-card p-4">
                <div className="text-[26px] font-extrabold leading-none text-accent-ink">
                  {bekleyenIlan}
                </div>
                <div className="mt-1.5 text-xs font-semibold leading-tight text-ink-400">
                  Onay bekleyen ilan
                </div>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4">
                <div className="text-[26px] font-extrabold leading-none text-danger">
                  {acikItiraz}
                </div>
                <div className="mt-1.5 text-xs font-semibold leading-tight text-ink-400">
                  Açık itiraz
                </div>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4">
                <div className="text-[26px] font-extrabold leading-none text-ink-900">
                  128
                </div>
                <div className="mt-1.5 text-xs font-semibold leading-tight text-ink-400">
                  Bugün gerçekleşen satış
                </div>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4">
                <div className="text-[26px] font-extrabold leading-none text-primary-hover">
                  23.600 TL
                </div>
                <div className="mt-1.5 text-xs font-semibold leading-tight text-ink-400">
                  Bugünkü komisyon geliri
                </div>
              </div>
            </div>

            <div className="mt-3.5 rounded-card border border-border bg-card p-[18px]">
              <div className="mb-3 text-[14.5px] font-extrabold text-ink-900">
                Son işlemler
              </div>
              <div className="flex flex-col">
                {sonIslemler.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-t border-hairline py-[11px] first:border-t-0 first:pt-0"
                  >
                    <span className="w-[52px] flex-none text-[12.5px] font-medium text-ink-300">
                      {r.saat}
                    </span>
                    <span className="flex-1 text-[12.5px] font-medium leading-snug text-ink-900">
                      {r.metin}
                    </span>
                    <Chip variant={r.variant} className="flex-none">
                      {r.etiket}
                    </Chip>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* İLAN ONAYLARI */}
        {bolum === "ilanlar" && (
          <div className="flex flex-col gap-2.5">
            {ilanData.map((i) => {
              const st = ilanSt[i.id];
              return (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-border bg-card px-[18px] py-[15px]"
                >
                  <div className="ref-image h-[46px] w-[46px] flex-none rounded-[10px]" />
                  <div className="min-w-[220px] flex-1">
                    <div className="text-[13.5px] font-bold leading-snug text-ink-900">
                      {i.baslik}
                    </div>
                    <div className="mt-[3px] text-[11.5px] font-medium leading-snug text-ink-400">
                      {i.kategori} · {i.fiyat} · açan: {i.kullanici}
                    </div>
                  </div>
                  {st === "bekliyor" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setIlanSt((p) => ({ ...p, [i.id]: "onaylandi" }))
                        }
                        className="flex-none cursor-pointer rounded-[9px] bg-primary px-[15px] py-2.5 text-xs font-bold text-white hover:bg-primary-hover"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIlanSt((p) => ({ ...p, [i.id]: "reddedildi" }))
                        }
                        className="flex-none cursor-pointer rounded-[9px] border-[1.5px] border-danger-line bg-card px-[15px] py-2.5 text-xs font-bold text-danger hover:bg-danger-soft"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                  {st === "onaylandi" && (
                    <Chip variant="violet" className="flex-none px-3 py-2">
                      Yayında ✓
                    </Chip>
                  )}
                  {st === "reddedildi" && (
                    <Chip variant="danger" className="flex-none px-3 py-2">
                      Reddedildi
                    </Chip>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* İTİRAZLAR */}
        {bolum === "itirazlar" && (
          <div className="flex flex-col gap-2.5">
            {itirazData.map((t) => {
              const st = itirazSt[t.id];
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-border bg-card px-[18px] py-[15px]"
                >
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-danger-soft text-sm font-extrabold text-danger">
                    !
                  </span>
                  <div className="min-w-[240px] flex-1">
                    <div className="text-[13.5px] font-bold leading-snug text-ink-900">
                      {t.no} · {t.urun}
                    </div>
                    <div className="mt-[3px] text-[11.5px] font-medium leading-snug text-ink-400">
                      {t.neden} · {t.taraflar} · {t.tutar}
                    </div>
                  </div>
                  {st === "inceleniyor" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setItirazSt((p) => ({ ...p, [t.id]: "iade" }))
                        }
                        className="flex-none cursor-pointer rounded-[9px] bg-ink-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-footer"
                      >
                        Alıcı haklı — iade
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setItirazSt((p) => ({ ...p, [t.id]: "aktarildi" }))
                        }
                        className="flex-none cursor-pointer rounded-[9px] bg-primary px-3.5 py-2.5 text-xs font-bold text-white hover:bg-primary-hover"
                      >
                        Satıcı haklı — aktar
                      </button>
                    </>
                  )}
                  {st === "iade" && (
                    <Chip variant="muted" className="flex-none px-3 py-2">
                      Alıcıya iade edildi
                    </Chip>
                  )}
                  {st === "aktarildi" && (
                    <Chip variant="violet" className="flex-none px-3 py-2">
                      Satıcıya aktarıldı ✓
                    </Chip>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* KULLANICILAR */}
        {bolum === "kullanicilar" && (
          <div className="overflow-hidden rounded-card border border-border bg-card">
            <div className="flex gap-3 bg-subtle px-[18px] py-3 text-[11px] font-bold uppercase tracking-[1px] text-ink-400">
              <span className="flex-[1.2]">Kullanıcı</span>
              <span className="flex-1">İşlem geçmişi</span>
              <span className="flex-[0.8]">Puan</span>
              <span className="flex-[0.9] text-right">Durum</span>
            </div>
            {kullaniciData.map((u) => {
              const suspended = !!askida[u.id];
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 border-t border-hairline px-[18px] py-[13px] text-[12.5px] font-medium"
                >
                  <span className="flex-[1.2] font-bold text-ink-900">
                    {u.ad}
                  </span>
                  <span className="flex-1 text-ink-500">{u.islem}</span>
                  <span className="flex-[0.8] font-bold text-star">
                    ★ {u.puan}
                  </span>
                  <span className="flex flex-[0.9] justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setAskida((p) => ({ ...p, [u.id]: !p[u.id] }))
                      }
                      className={`cursor-pointer rounded-full px-[11px] py-2 text-[11px] font-bold ${
                        suspended
                          ? "bg-danger-soft text-danger"
                          : "border-[1.5px] border-border bg-card text-ink-500 hover:border-danger hover:text-danger"
                      }`}
                    >
                      {suspended ? "Askıda — kaldır" : "Askıya al"}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
