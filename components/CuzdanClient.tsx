"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HesapNav } from "@/components/HesapNav";
import { HesapKart } from "@/components/HesapKart";
import { fiyatText } from "@/lib/data";
import {
  alimlar,
  bakiyedekiTutar,
  maliHareketler,
  satisOzeti,
  satislar,
  toplamHarcama,
} from "@/lib/islemler";
import type { Islem } from "@/lib/islemler";
import { MIN_AKTARIM } from "@/lib/aktarim";
import type { AktarimTalebi } from "@/lib/aktarim";
import { useOturumSahibi } from "@/lib/aktif-kullanici";

/** İşaretli tutar: gelir "+", gider "−" önekiyle gösterilir. */
function isaretliTutar(n: number): string {
  return `${n < 0 ? "−" : "+"}${fiyatText(Math.abs(n))}`;
}

export function CuzdanClient({
  islemler = [],
  oturumKullanici,
}: {
  islemler?: Islem[];
  oturumKullanici: string;
}) {
  // IBAN aktarımı gerçek bir kayıt açar: talep "işlemde" olarak beklerken
  // aynı bakiye ikinci kez talep edilemesin diye çekilebilir tutar
  // sunucudan gelir.
  const [aktarimlar, setAktarimlar] = useState<AktarimTalebi[]>([]);
  const [cekilebilir, setCekilebilir] = useState<number | null>(null);
  const [aktarimIsliyor, setAktarimIsliyor] = useState(false);
  const [aktarimHatasi, setAktarimHatasi] = useState("");

  const aktarimlariYukle = useCallback(() => {
    fetch("/api/aktarimlar")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (!v) return;
        setAktarimlar(v.aktarimlar ?? []);
        setCekilebilir(v.cekilebilir ?? 0);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => aktarimlariYukle(), [aktarimlariYukle]);

  async function aktarimAc() {
    if (aktarimIsliyor) return;
    setAktarimIsliyor(true);
    setAktarimHatasi("");
    try {
      const r = await fetch("/api/aktarimlar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.hata ?? "Aktarım talebi açılamadı.");
      aktarimlariYukle();
    } catch (e) {
      setAktarimHatasi(
        e instanceof Error ? e.message : "Aktarım talebi açılamadı.",
      );
    } finally {
      setAktarimIsliyor(false);
    }
  }

  const bekleyen = aktarimlar.filter((a) => a.durum === "islemde");

  const aktif = useOturumSahibi();
  const alimListesi = alimlar(islemler, aktif.kullanici);
  const satisListesi = satislar(islemler, aktif.kullanici);
  const harcama = toplamHarcama(islemler, aktif.kullanici);
  const urunToplam = alimListesi.reduce((t, i) => t + i.fiyat, 0);
  const { brut, komisyon, net } = satisOzeti(islemler, aktif.kullanici);
  const bakiye = bakiyedekiTutar(islemler, aktif.kullanici);
  const netDurum = net - harcama;
  const hareketler = maliHareketler(islemler, aktif.kullanici);

  // Mali özet tablosu — her satır tek bir kalem, sonuç satırları vurgulu.
  const ozetSatirlari: {
    ad: string;
    aciklama: string;
    tutar: number;
    tip: "gelir" | "gider" | "toplam";
  }[] = [
    {
      ad: "Satış geliri (brüt)",
      aciklama: `${satisListesi.length} tamamlanan satış`,
      tutar: brut,
      tip: "gelir",
    },
    {
      ad: "Bulbana komisyonu",
      aciklama: "Satış bedelinin %4'ü",
      tutar: -komisyon,
      tip: "gider",
    },
    {
      ad: "Net satış geliri",
      aciklama: "Komisyon sonrası eline geçen",
      tutar: net,
      tip: "toplam",
    },
    {
      ad: "Ürün alımları",
      aciklama: `${alimListesi.length} tamamlanan alım`,
      tutar: -urunToplam,
      tip: "gider",
    },
    {
      ad: "Net durum",
      aciklama: "Net satış geliri − toplam harcama",
      tutar: netDurum,
      tip: "toplam",
    },
  ];

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <HesapNav active="/cuzdan" />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <HesapKart oturumKullanici={oturumKullanici} />

        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink-900">
            Mali Tablom
          </h1>
          <p className="mb-4 mt-1 text-[13px] font-medium text-ink-400">
            Tamamlanan alım ve satışlarının tek tabloda dökümü — ne harcadın, ne
            kazandın, elinde ne kaldı.
          </p>

          {/* ── Üç rakam: harcama, kazanç, net ── */}
          <div className="grid gap-3.5 md:grid-cols-3">
            <div className="rounded-card bg-ink-900 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-accent">
                Toplam harcama
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-accent">
                {fiyatText(harcama)}
              </div>
              <Link
                href="/aldiklarim"
                className="mt-3 inline-block text-[11.5px] font-bold text-[#b6a9d4] hover:text-white"
              >
                Aldıklarım ({alimListesi.length}) ›
              </Link>
            </div>

            <div className="rounded-card bg-ink-900 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-accent">
                Net kazanç
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-accent">
                {fiyatText(net)}
              </div>
              <Link
                href="/sattiklarim"
                className="mt-3 inline-block text-[11.5px] font-bold text-[#b6a9d4] hover:text-white"
              >
                Sattıklarım ({satisListesi.length}) ›
              </Link>
            </div>

            <div className="rounded-card bg-ink-900 p-5 text-white">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#8b7bb0]">
                Net durum
              </div>
              <div
                className={`mt-2.5 text-[30px] font-extrabold leading-none ${
                  netDurum < 0 ? "text-white" : "text-accent"
                }`}
              >
                {isaretliTutar(netDurum)}
              </div>
              <div className="mt-3 text-[11.5px] font-medium leading-[1.5] text-[#b6a9d4]">
                {netDurum < 0
                  ? "Aldıkların sattıklarından fazla."
                  : "Sattıkların aldıklarından fazla."}
              </div>
            </div>
          </div>

          {/* ── Mali özet tablosu ── */}
          <section className="mt-3.5 overflow-hidden rounded-card border border-border bg-card">
            <div className="flex items-center justify-between gap-3 bg-subtle px-[18px] py-3">
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-ink-400">
                Kalem
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-ink-400">
                Tutar
              </span>
            </div>
            {ozetSatirlari.map((s) => (
              <div
                key={s.ad}
                className={`flex items-center justify-between gap-3 border-t border-hairline px-[18px] py-3.5 ${
                  s.tip === "toplam" ? "bg-page" : ""
                }`}
              >
                <span className="min-w-0">
                  <span
                    className={`block text-[13px] leading-snug text-ink-900 ${
                      s.tip === "toplam" ? "font-extrabold" : "font-semibold"
                    }`}
                  >
                    {s.ad}
                  </span>
                  <span className="mt-[3px] block text-[11px] font-medium text-ink-300">
                    {s.aciklama}
                  </span>
                </span>
                <span
                  className={`flex-none whitespace-nowrap text-right text-[14px] tabular-nums ${
                    s.tip === "toplam"
                      ? "text-[15px] font-extrabold text-ink-900"
                      : s.tutar < 0
                        ? "font-bold text-danger"
                        : "font-bold text-accent-ink"
                  }`}
                >
                  {isaretliTutar(s.tutar)}
                </span>
              </div>
            ))}
          </section>

          {/* ── Bakiye ve aktarım ── */}
          <div className="mt-3.5 flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-5">
            <div className="min-w-[220px] flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Aktarılabilir bakiye
              </div>
              <div className="mt-2 text-[26px] font-extrabold leading-none text-ink-900">
                {fiyatText(bakiye)}
              </div>
              <p className="mt-2 text-[11.5px] font-medium leading-[1.5] text-ink-300">
                Net kazancının {fiyatText(net - bakiye)}{" "}
                kadarı IBAN&apos;ına aktarıldı; kalan tutar bakiyende bekliyor.
              </p>
            </div>
            <div className="flex-none text-right">
              {bekleyen.length > 0 && (
                <div className="mb-2 rounded-control bg-primary-soft px-4 py-2.5 text-[12px] font-bold leading-relaxed text-primary-hover">
                  {fiyatText(bekleyen.reduce((t, a) => t + a.tutar, 0))} aktarım
                  talebin işlemde
                </div>
              )}
              <button
                type="button"
                disabled={
                  aktarimIsliyor ||
                  cekilebilir === null ||
                  cekilebilir < MIN_AKTARIM
                }
                onClick={() => void aktarimAc()}
                className="cursor-pointer rounded-control bg-accent px-[18px] py-3 text-[13px] font-extrabold leading-none text-ink-900 transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aktarimIsliyor ? "Gönderiliyor…" : "IBAN'a Aktar"}
              </button>
              {cekilebilir !== null && cekilebilir < MIN_AKTARIM && (
                <p className="mt-1.5 text-[11.5px] font-medium text-ink-400">
                  En az {fiyatText(MIN_AKTARIM)} bakiye gerekiyor.
                </p>
              )}
              {aktarimHatasi && (
                <p
                  role="alert"
                  className="mt-1.5 max-w-[220px] text-[11.5px] font-bold text-acil"
                >
                  {aktarimHatasi}
                </p>
              )}
            </div>
          </div>

          {/* ── Hareket dökümü ── */}
          <section className="mt-3.5 overflow-x-auto rounded-card border border-border bg-card">
            <div className="min-w-[620px]">
              <div className="flex gap-3 bg-subtle px-[18px] py-3 text-[11px] font-bold uppercase tracking-[1px] text-ink-400">
                <span className="flex-[0.8]">Tarih</span>
                <span className="flex-[2]">İşlem</span>
                <span className="flex-[0.8] text-right">Kesinti</span>
                <span className="flex-[0.9] text-right">Tutar</span>
              </div>
              {hareketler.map((h) => (
                <Link
                  key={h.slug}
                  href={`/islem/${h.slug}`}
                  className="flex items-center gap-3 border-t border-hairline px-[18px] py-3.5 text-[12.5px] font-medium transition-colors hover:bg-subtle"
                >
                  <span className="flex-[0.8] text-ink-500">{h.tarih}</span>
                  <span className="flex-[2] min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink-900">
                        {h.ilanBaslik}
                      </span>
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-[4px] text-[10px] font-bold ${
                          h.tur === "satis"
                            ? "bg-accent text-accent-ink"
                            : "bg-primary-soft text-primary-hover"
                        }`}
                      >
                        {h.tur === "satis" ? "Satış" : "Alım"}
                      </span>
                    </span>
                    <span className="mt-[3px] block text-[11px] text-ink-300">
                      {h.urun} · {h.kisi}
                    </span>
                  </span>
                  <span className="flex-[0.8] text-right text-[11.5px] text-ink-400">
                    {h.kesinti
                      ? `${fiyatText(h.kesinti)} ${h.kesintiEtiketi}`
                      : "—"}
                  </span>
                  <span
                    className={`flex-[0.9] text-right font-extrabold tabular-nums ${
                      h.tutar < 0 ? "text-danger" : "text-accent-ink"
                    }`}
                  >
                    {isaretliTutar(h.tutar)}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-ink-300">
            Tabloda yalnızca tamamlanmış işlemler yer alır: bedeli ödenmiş
            alımlar ve tahsil edilmiş satışlar. Devam eden siparişler, tutarı
            kesinleşene kadar buraya girmez. Aktarımlar hafta içi aynı gün,
            hafta sonu ilk iş günü gerçekleşir; her satış için e-fatura e-posta
            adresine gönderilir.
          </p>
        </div>
      </div>
    </main>
  );
}
