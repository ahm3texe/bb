"use client";

import Link from "next/link";
import { HesapNav } from "@/components/HesapNav";
import { HesapKart } from "@/components/HesapKart";
import { fiyatText } from "@/lib/data";
import { useOturumSahibi } from "@/lib/aktif-kullanici";
import {
  alimlar,
  komisyon,
  paraDurumlari,
  satisOzeti,
  satislar,
  toplamHarcama,
} from "@/lib/islemler";
import type { Islem } from "@/lib/islemler";

/**
 * Aldıklarım ve Sattıklarım aynı iskeleti paylaşır: üstte üç özet kartı,
 * altta tamamlanmış işlemlerin listesi. Fark yalnızca paranın yönü ve
 * karşı tarafın rolüdür. Veri aktif hesaba göre süzülür.
 */
export function AlimSatimListesi({
  tur,
  islemler = [],
  oturumKullanici,
  aktarilanToplam = 0,
}: {
  tur: "alim" | "satis";
  /** Sunucudan gelen tamamlanmış işlem kayıtları. */
  islemler?: Islem[];
  oturumKullanici: string;
  /** IBAN'a aktarımı tamamlanmış toplam tutar — para etiketi bundan türer. */
  aktarilanToplam?: number;
}) {
  const aktif = useOturumSahibi();
  const alim = tur === "alim";
  const liste = alim ? alimlar(islemler, aktif.kullanici) : satislar(islemler, aktif.kullanici);

  const harcama = toplamHarcama(islemler, aktif.kullanici);
  const { brut, komisyon: kesinti, net } = satisOzeti(islemler, aktif.kullanici);

  // Paranın nerede olduğu kayda yazılmaz; aktarım defterinden türetilir.
  const paraDurumu = paraDurumlari(islemler, aktif.kullanici, aktarilanToplam);

  const anaTutar = alim ? harcama : net;
  const ortalama = liste.length ? Math.round(anaTutar / liste.length) : 0;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <HesapNav active={alim ? "/aldiklarim" : "/sattiklarim"} />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <HesapKart oturumKullanici={oturumKullanici} />

        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink-900">
            {alim ? "Aldıklarım" : "Sattıklarım"}
          </h1>
          <p className="mb-4 mt-1 text-[13px] font-medium text-ink-400">
            {alim
              ? "Yalnızca tamamlanan alımlar: bedeli ödenmiş ve teslimatı onaylanmış siparişler."
              : "Yalnızca tamamlanan satışlar: bedeli tahsil edilip hesabına geçmiş siparişler."}
          </p>

          <div className="grid gap-3.5 md:grid-cols-3">
            <div className="rounded-card bg-ink-900 p-5 text-white">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-accent">
                {alim ? "Toplam harcama" : "Net kazanç"}
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-accent">
                {fiyatText(anaTutar)}
              </div>
              <div className="mt-3 text-[11.5px] font-medium leading-[1.5] text-[#b6a9d4]">
                {alim
                  ? `${liste.length} tamamlanan alım`
                  : `${fiyatText(brut)} brüt − ${fiyatText(kesinti)} komisyon`}
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                {alim ? "Tamamlanan alım" : "Tamamlanan satış"}
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-ink-900">
                {liste.length}
              </div>
              <div className="mt-3 text-[11.5px] font-medium text-ink-300">
                {alim ? "Tamamı teslimat onaylı" : "Tamamının bedeli tahsil edildi"}
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-400">
                {alim ? "Ortalama sipariş" : "Ortalama satış"}
              </div>
              <div className="mt-2.5 text-[30px] font-extrabold leading-none text-ink-900">
                {fiyatText(ortalama)}
              </div>
              {/* "Kargo dahil" YAZIYORDU ama kargo bedeli Bulbana'dan
                  geçmiyor: taraflar sohbette kendi aralarında anlaşıyor ve
                  `Islem.kargo` alanı tam da bu yüzden kaldırılmıştı
                  (bkz. BACKEND.md → Kargo bedeli muhasebede yok). */}
              <div className="mt-3 text-[11.5px] font-medium text-ink-300">
                {alim ? "Yalnızca ürün bedeli" : "Komisyon sonrası"}
              </div>
            </div>
          </div>

          <section className="mt-5 rounded-panel border border-border bg-card p-[22px]">
            <h2 className="mb-4 text-[17px] font-extrabold text-ink-900">
              {alim ? "Tamamlanan alımlar" : "Tamamlanan satışlar"} (
              {liste.length})
            </h2>

            {liste.length ? (
              <div className="flex flex-col">
                {liste.map((i) => {
                  const karsi = alim ? i.satici : i.alici;
                  const tutar = alim ? i.fiyat : i.fiyat - komisyon(i);
                  return (
                    <Link
                      key={i.id}
                      href={`/islem/${alim ? "alim" : "satis"}-${i.id}`}
                      className="-mx-2 flex flex-wrap items-center gap-3.5 rounded-[12px] border-t border-hairline px-2 py-3.5 transition-colors hover:bg-subtle"
                    >
                      <div
                        className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                          alim
                            ? "bg-primary-soft text-primary-hover"
                            : "bg-accent text-accent-ink"
                        }`}
                      >
                        {karsi.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-[200px] flex-1">
                        <div className="text-[13.5px] font-bold leading-snug text-ink-900">
                          {i.ilanBaslik}
                        </div>
                        <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                          {i.sunum.urun} · {karsi} · {i.tarih}
                        </div>
                      </div>
                      <div className="flex-none text-right">
                        <div
                          className={`text-[14px] font-extrabold ${
                            alim ? "text-ink-900" : "text-accent-ink"
                          }`}
                        >
                          {fiyatText(tutar)}
                        </div>
                        <div className="mt-[3px] text-[11px] font-medium text-ink-300">
                          {/* Kargo bedeli Bulbana'dan geçmiyor; sunumda
                              kimin göndereceği yazılı, tutarını taraflar
                              kendi aralarında hallediyor. */}
                          {alim
                            ? i.sunum.kargo
                            : `${fiyatText(i.fiyat)} − ${fiyatText(komisyon(i))} komisyon`}
                        </div>
                      </div>
                      <span
                        className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                          alim
                            ? "bg-primary-soft text-primary-hover"
                            : paraDurumu.get(i.id) !== "IBAN'a aktarıldı"
                              ? "bg-primary-soft text-primary-hover"
                              : "bg-page text-ink-500"
                        }`}
                      >
                        {alim
                          ? "Teslim alındı"
                          : (paraDurumu.get(i.id) ?? "Bakiyede")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] font-medium text-ink-400">
                {aktif.kullanici} hesabında tamamlanmış{" "}
                {alim ? "alım" : "satış"} yok.
              </p>
            )}

            <p className="mt-4 text-[11.5px] font-medium leading-[1.5] text-ink-300">
              {alim
                ? "Devam eden siparişlerin (ödeme, kargo, teslimat onayı bekleyenler) bu listede görünmez."
                : "Alıcı onayı bekleyen ya da kargo aşamasındaki satışların burada görünmez."}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
