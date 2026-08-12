"use client";

import { useState } from "react";
import Link from "next/link";
import { fiyatText } from "@/lib/data";
import type { Talep } from "@/lib/data";
import type { Kullanici } from "@/lib/kullanicilar";
import { aliciKalitesi, SEVIYE_STIL } from "@/lib/alici-kalitesi";
import { TalepCard } from "@/components/TalepCard";
import { satislar } from "@/lib/islemler";

/** Puanı yıldız dizisine çevirir: 4 → "★★★★☆" */
function yildizText(puan: number): string {
  const dolu = Math.round(puan);
  return "★".repeat(dolu) + "☆".repeat(5 - dolu);
}

/**
 * Başkasının profil sayfası. Düzen, kendi profil sayfasıyla aynıdır:
 * solda kimlik kartı, sağda metrikler ve sekmeler. Tüm veri
 * lib/kullanicilar'daki kayıttan gelir — sayfa hiçbir şeyi sabit tutmaz.
 */
export function KullaniciProfili({
  k,
  acikTalepler,
  kendiProfilim = false,
}: {
  k: Kullanici;
  /** Bu kullanıcının açık talepleri (seed'den süzülür). */
  acikTalepler: Talep[];
  /** Oturum sahibinin kendi profiline bakması durumu. */
  kendiProfilim?: boolean;
}) {
  const [tab, setTab] = useState<"talepler" | "satislar" | "yorumlar">(
    "talepler",
  );
  const [follow, setFollow] = useState(false);
  const [bildirildi, setBildirildi] = useState(false);

  const alici = aliciKalitesi(k.aliciMetrik);
  // Satışlar merkezi işlem listesinden gelir — alıcı tarafıyla hep tutarlı.
  const satisListesi = satislar(k.kullanici);

  // Puan dağılımı yorumlardan türetilir — sayı ile liste hep tutarlı kalır.
  const dagilim = [5, 4, 3, 2, 1].map((y) => {
    const sayi = k.yorumlar.filter((r) => r.puan === y).length;
    return {
      yildiz: y,
      sayi,
      genislik: k.yorumlar.length ? (sayi / k.yorumlar.length) * 100 : 0,
      renk: y >= 4 ? "bg-primary" : y === 3 ? "bg-star" : "bg-danger",
    };
  });

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[22px]">
      <nav className="pb-3.5 text-[12.5px] font-medium text-ink-400">
        <Link href="/kesfet" className="text-ink-400 hover:text-primary">
          Talepleri Keşfet
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">{k.kullanici}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── Sol: kimlik kartı ── */}
        <aside className="overflow-hidden rounded-panel border border-border bg-card lg:sticky lg:top-[150px]">
          <div className="h-16 bg-gradient-to-br from-primary-soft via-primary/20 to-accent-soft" />
          <div className="px-5 pb-5 text-center">
            <div className="-mt-9 mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ink-900 text-xl font-extrabold text-accent ring-4 ring-card">
              {k.harf}
            </div>
            <h1 className="mt-2.5 text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
              {k.kullanici}
            </h1>
            <div className="mt-1 text-[15.5px] font-extrabold text-star-ink">
              ★ {k.puan.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}{" "}
              <span className="text-[13px] font-semibold text-ink-400">
                · {k.degerlendirme} değerlendirme
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              {k.rozet && (
                <span className="rounded-full bg-accent px-[10px] py-[7px] text-[11.5px] font-bold text-accent-ink">
                  {k.rozet}
                </span>
              )}
              <span
                className={`rounded-full px-[10px] py-[7px] text-[11.5px] font-bold ${SEVIYE_STIL[alici.seviye].rozet}`}
                title={alici.ozet}
              >
                Alıcı Kalitesi: {alici.etiket}
              </span>
            </div>
            <p className="mt-3.5 text-pretty text-[14px] font-medium leading-relaxed text-ink-700">
              {k.bio}
            </p>
            <div className="mt-3 border-t border-hairline pt-3 text-[13.5px] font-medium text-ink-400">
              {k.konum} · {k.uyelik}&apos;ten beri üye
            </div>
            {k.chipler.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {k.chipler.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-page px-2.5 py-[7px] text-[11.5px] font-semibold text-ink-500"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {kendiProfilim ? (
                <Link
                  href="/profil"
                  className="rounded-[12px] bg-primary px-[18px] py-3 text-center text-sm font-bold text-white hover:bg-primary-hover"
                >
                  Profilimi Yönet
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setFollow((v) => !v)}
                    className={`cursor-pointer rounded-[12px] px-[18px] text-sm font-bold ${
                      follow
                        ? "border-[1.5px] border-[#ddd6fe] bg-primary-soft py-[11px] text-primary-hover"
                        : "bg-primary py-3 text-white hover:bg-primary-hover"
                    }`}
                  >
                    {follow ? "Takip ediliyor ✓" : "Takip Et"}
                  </button>
                  <Link
                    href="/mesajlar"
                    className="rounded-[12px] border-[1.5px] border-border-input bg-card px-[18px] py-[11px] text-center text-[13.5px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                  >
                    Mesaj Gönder
                  </Link>
                  {bildirildi ? (
                    <span className="p-1.5 text-center text-xs font-bold text-accent-ink">
                      Bildirimin alındı ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBildirildi(true)}
                      className="cursor-pointer p-1.5 text-xs font-semibold text-ink-300 hover:text-primary"
                    >
                      Profili bildir
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Sağ: metrikler + sekmeler ── */}
        <div className="min-w-0">
          <section className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
            <div className="rounded-[14px] bg-accent p-4">
              <div className="text-2xl font-extrabold text-footer">
                {k.tamamlananSatis}
              </div>
              <div className="mt-1.5 text-xs font-semibold leading-snug text-footer">
                Tamamlanan satış
              </div>
            </div>
            <div className="rounded-[14px] bg-footer p-4">
              <div className="text-2xl font-extrabold text-accent">
                {k.aliciMetrik.tamamlananAlim}
              </div>
              <div className="mt-1.5 text-xs font-semibold leading-snug text-accent">
                Tamamlanan alım
              </div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-4">
              <div className="text-2xl font-extrabold text-ink-900">
                %{k.zamanindaKargo}
              </div>
              <div className="mt-1.5 text-xs font-semibold leading-snug text-ink-400">
                Zamanında kargo
              </div>
            </div>
          </section>

          {/* Sekmeler */}
          <div className="mt-[22px] flex flex-wrap gap-2 border-b border-border">
            {(
              [
                ["talepler", `Aktif Talepler (${acikTalepler.length})`],
                ["satislar", `Tamamlanan Satışlar (${satisListesi.length})`],
                ["yorumlar", `Değerlendirmeler (${k.degerlendirme})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`cursor-pointer border-b-[2.5px] px-4 py-3 text-sm ${
                  tab === id
                    ? "border-primary font-bold text-primary"
                    : "border-transparent font-semibold text-ink-400 hover:text-ink-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Aktif talepler */}
          {tab === "talepler" && (
            <section className="mt-[18px]">
              {acikTalepler.length ? (
                <div className="grid max-w-[900px] grid-cols-2 gap-4 md:grid-cols-3">
                  {acikTalepler.map((t) => (
                    <TalepCard key={t.id} talep={t} />
                  ))}
                </div>
              ) : (
                <p className="rounded-card border border-border bg-card p-5 text-[13px] font-medium text-ink-400">
                  {k.kullanici} şu anda açık bir talep yayınlamıyor.
                </p>
              )}
            </section>
          )}

          {/* Tamamlanan satışlar */}
          {tab === "satislar" && (
            <section className="mt-[18px]">
              {satisListesi.length ? (
                <>
                  <div className="grid max-w-[900px] grid-cols-2 gap-4 md:grid-cols-3">
                    {satisListesi.map((s) => (
                      <article
                        key={s.id}
                        className="flex flex-col overflow-hidden rounded-card border border-border bg-card"
                      >
                        <div className="ref-image relative flex aspect-[3/4] items-center justify-center">
                          <span className="font-mono text-[10px] text-ink-400">
                            referans görsel
                          </span>
                          <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-1.5 text-[10.5px] font-bold text-accent-ink">
                            Tamamlandı
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-3.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-300">
                            {s.kategori}
                          </div>
                          <h3 className="mt-1 line-clamp-2 text-[13.5px] font-bold leading-snug text-ink-900">
                            {s.ilanBaslik}
                          </h3>
                          <div className="mt-1.5 line-clamp-1 text-[11.5px] font-medium text-ink-400">
                            {s.sunum.urun}
                          </div>
                          <div className="mt-auto pt-2.5 text-[15px] font-extrabold text-ink-900">
                            {fiyatText(s.fiyat)}
                          </div>
                          <div className="mt-1 text-[11.5px] font-medium text-ink-400">
                            {s.alici} · {s.tarih}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="mt-4 max-w-[900px] text-[11.5px] font-medium leading-[1.5] text-ink-300">
                    Listede yalnızca teslimatı onaylanmış satışlar yer alır.
                  </p>
                </>
              ) : (
                <p className="rounded-card border border-border bg-card p-5 text-[13px] font-medium text-ink-400">
                  {k.kullanici} henüz tamamlanmış bir satış yapmadı.
                </p>
              )}
            </section>
          )}

          {/* Değerlendirmeler */}
          {tab === "yorumlar" && (
            <section className="mt-[18px] grid items-start gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="rounded-card border border-border bg-card p-[18px]">
                <div className="flex items-baseline gap-2">
                  <span className="text-[34px] font-extrabold leading-none text-ink-900">
                    {k.puan.toLocaleString("tr-TR", {
                      minimumFractionDigits: 1,
                    })}
                  </span>
                  <span className="text-[15px] font-bold text-star-ink" aria-hidden>
                    {yildizText(k.puan)}
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-ink-400">
                  {k.degerlendirme} değerlendirme
                </div>
                <div className="mt-3.5 flex flex-col gap-[7px]">
                  {dagilim.map((p) => (
                    <div key={p.yildiz} className="flex items-center gap-2">
                      <span className="w-3 text-[11px] font-semibold text-ink-500">
                        {p.yildiz}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                        <div
                          className={`h-full rounded-full ${p.renk}`}
                          style={{ width: `${p.genislik}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[11px] font-semibold text-ink-300">
                        {p.sayi}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3.5 text-[11px] font-medium leading-normal text-ink-300">
                  Değerlendirmeler yalnızca tamamlanmış siparişlerden
                  yazılabilir.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {k.yorumlar.length ? (
                  k.yorumlar.map((y) => (
                    <article
                      key={`${y.yazan}-${y.urun}`}
                      className="rounded-[14px] border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-soft text-[11.5px] font-bold text-primary-hover">
                          {y.harf}
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/profil/${y.yazan}`}
                            className="text-[13.5px] font-bold leading-tight text-ink-900 hover:text-primary"
                          >
                            {y.yazan}
                          </Link>
                          <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                            {y.urun} · {y.tarih}
                          </div>
                        </div>
                        <span className="flex-none text-[13px] font-bold text-star-ink">
                          {yildizText(y.puan)}
                        </span>
                      </div>
                      <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink-700">
                        {y.text}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-card border border-border bg-card p-5 text-[13px] font-medium text-ink-400">
                    Henüz değerlendirme yazılmamış.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
