"use client";

import { useState } from "react";
import Link from "next/link";
import { HesapNav } from "@/components/HesapNav";
import { HesapKart } from "@/components/HesapKart";
import { fiyatText } from "@/lib/data";
import {
  alimlarim,
  bakiyedekiTutar,
  maliHareketler,
  satisOzeti,
  satislarim,
  toplamHarcama,
} from "@/lib/islemlerim";

/** İşaretli tutar: gelir "+", gider "−" önekiyle gösterilir. */
function isaretliTutar(n: number): string {
  return `${n < 0 ? "−" : "+"}${fiyatText(Math.abs(n))}`;
}

export function CuzdanClient() {
  const [aktarimTalebi, setAktarimTalebi] = useState(false);

  const harcama = toplamHarcama();
  const urunToplam = alimlarim.reduce((t, a) => t + a.tutar, 0);
  const kargoToplam = alimlarim.reduce((t, a) => t + a.kargo, 0);
  const { brut, komisyon, net } = satisOzeti();
  const bakiye = bakiyedekiTutar();
  const netDurum = net - harcama;
  const hareketler = maliHareketler();

  // Mali özet tablosu — her satır tek bir kalem, sonuç satırları vurgulu.
  const ozetSatirlari: {
    ad: string;
    aciklama: string;
    tutar: number;
    tip: "gelir" | "gider" | "toplam";
  }[] = [
    {
      ad: "Satış geliri (brüt)",
      aciklama: `${satislarim.length} tamamlanan satış`,
      tutar: brut,
      tip: "gelir",
    },
    {
      ad: "BulBana komisyonu",
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
      aciklama: `${alimlarim.length} tamamlanan alım`,
      tutar: -urunToplam,
      tip: "gider",
    },
    {
      ad: "Ödenen kargo",
      aciklama: "Satıcının karşılamadığı gönderiler",
      tutar: -kargoToplam,
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
        <HesapKart />

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
            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Toplam harcama
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-ink-900">
                {fiyatText(harcama)}
              </div>
              <Link
                href="/aldiklarim"
                className="mt-3 inline-block text-[11.5px] font-bold text-primary hover:text-primary-hover"
              >
                Aldıklarım ({alimlarim.length}) ›
              </Link>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                Net kazanç
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-accent-ink">
                {fiyatText(net)}
              </div>
              <Link
                href="/sattiklarim"
                className="mt-3 inline-block text-[11.5px] font-bold text-primary hover:text-primary-hover"
              >
                Sattıklarım ({satislarim.length}) ›
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
            {aktarimTalebi ? (
              <div className="flex-none rounded-control bg-accent px-4 py-3 text-xs font-bold leading-relaxed text-accent-ink">
                Aktarım talebin alındı ✓
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAktarimTalebi(true)}
                className="flex-none cursor-pointer rounded-control bg-accent px-[18px] py-3 text-[13px] font-extrabold leading-none text-ink-900 transition-colors hover:brightness-95"
              >
                IBAN&apos;a Aktar
              </button>
            )}
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
                  key={h.id}
                  href={`/islem/${h.id}`}
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
                      {h.baslik} · {h.kisi}
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
