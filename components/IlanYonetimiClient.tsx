"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Chip } from "@/components/ui/Chip";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getTalep, talepNo, talepGorselleri, fiyatText } from "@/lib/data";

type Durum = "yayinda" | "durakladi" | "kaldirildi";

// Bu yönetim ekranı Dawn FM talebine ait — veriyi tek kaynaktan al.
const TALEP_ID = "dawn-fm-imzali-cd";
const talep = getTalep(TALEP_ID)!;
const talepGorsel = talepGorselleri(TALEP_ID)[0];

const gunler = [
  { gun: "29 Haz", say: 26, h: 26 },
  { gun: "30 Haz", say: 31, h: 31 },
  { gun: "1 Tem", say: 22, h: 22 },
  { gun: "2 Tem", say: 40, h: 40 },
  { gun: "3 Tem", say: 48, h: 48 },
  { gun: "4 Tem", say: 36, h: 36 },
  { gun: "5 Tem", say: 55, h: 55 },
  { gun: "6 Tem", say: 61, h: 61 },
  { gun: "7 Tem", say: 44, h: 44 },
  { gun: "8 Tem", say: 70, h: 70 },
  { gun: "9 Tem", say: 58, h: 58 },
  { gun: "10 Tem", say: 86, h: 86 },
  { gun: "11 Tem", say: 78, h: 78 },
  { gun: "Bugün", say: 64, h: 64, bugun: true },
];

const huni = [
  { ad: "Görüntülenme", sag: "1.284", sagMuted: false, w: 100, renk: "#7c3aed" },
  { ad: "Takip eden", sag: "34 · %2,6", sagMuted: true, w: 42, renk: "#9f6ff0" },
  { ad: "Sunum gönderen", sag: "12 · %0,9", sagMuted: true, w: 26, renk: "#c4a5f7" },
  { ad: "Teklif istediğin", sag: "2", sagMuted: true, w: 13, renk: "#bef264" },
  { ad: "Aktif sohbet", sag: "1", sagMuted: true, w: 7, renk: "#bef264" },
];

const statCards = [
  { etiket: "Görüntülenme", deger: "1.284", alt: "↑ %18 bu hafta", altKind: "good" as const },
  { etiket: "Takip", deger: "34", alt: "↑ 6 yeni", altKind: "good" as const },
  { etiket: "Sunum", deger: "12", alt: "İncele ›", altKind: "link" as const, href: "/sunum-karsilastirma" },
  { etiket: "Teklif istenen", deger: "2", alt: "1 aktif sohbet ›", altKind: "link" as const, href: "/mesajlar" },
];

const uzatBtn =
  "flex-1 cursor-pointer rounded-control bg-primary-soft px-3 py-3 text-[12.5px] font-bold text-primary-hover hover:bg-primary-soft-hover";

export function IlanYonetimiClient() {
  const [kalanGun, setKalanGun] = useState(21);
  const [uzatildi, setUzatildi] = useState(false);
  const [durum, setDurum] = useState<Durum>("yayinda");
  const [kaldirSoru, setKaldirSoru] = useState(false);

  const surePct = Math.max(4, Math.min(100, Math.round((kalanGun / 30) * 100)));
  // Yalnızca yayında olan ilanın süresi uzatılabilir.
  const uzatilabilir = kalanGun < 30 && durum === "yayinda";

  function uzat(g: number) {
    const yeni = Math.min(30, kalanGun + g);
    if (yeni > kalanGun) {
      setKalanGun(yeni);
      setUzatildi(true);
    }
  }

  let durumText = `Yayında · ${kalanGun} gün kaldı`;
  let durumVariant: "good" | "muted" | "danger" = "good";
  if (durum === "durakladi") {
    durumText = "Duraklatıldı — satıcılara kapalı";
    durumVariant = "muted";
  }
  if (durum === "kaldirildi") {
    durumText = "Yayından kaldırıldı";
    durumVariant = "danger";
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[18px]">
      {/* Breadcrumb */}
      <nav
        aria-label="Sayfa yolu"
        className="flex flex-wrap items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-ink-400"
      >
        <Link href="/profil" className="text-ink-400 hover:text-primary">
          Profilim
        </Link>
        <span aria-hidden>›</span>
        <Link href="/profil" className="text-ink-400 hover:text-primary">
          Taleplerim
        </Link>
        <span aria-hidden>›</span>
        <span className="font-semibold text-ink-900">İlan Yönetimi</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
            İlan Yönetimi
          </h1>
          <div className="mt-1.5 text-[13px] font-medium text-ink-400">
            {talep.baslik} · İlan No: {talepNo(TALEP_ID)}
          </div>
        </div>
        <Chip variant={durumVariant} className="text-[11.5px]">
          {durumText}
        </Chip>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── SOL: İSTATİSTİK ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Özet kartları */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map((c) => (
              <div
                key={c.etiket}
                className="rounded-card border border-border bg-card p-4"
              >
                <div className="text-[11.5px] font-medium text-ink-400">
                  {c.etiket}
                </div>
                <div className="mt-2 text-2xl font-extrabold text-ink-900">
                  {c.deger}
                </div>
                {c.altKind === "good" ? (
                  <div className="mt-[7px] text-[11px] font-bold text-accent-ink">
                    {c.alt}
                  </div>
                ) : (
                  <Link
                    href={c.href!}
                    className="mt-[7px] inline-block text-[11px] font-bold"
                  >
                    {c.alt}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Görüntülenme grafiği */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-extrabold text-ink-900">
                Günlük Görüntülenme
              </h2>
              <span className="text-xs font-semibold text-ink-400">
                Son 14 gün
              </span>
            </div>
            <div className="mt-[18px] flex h-[150px] items-end gap-2">
              {gunler.map((g) => (
                <div
                  key={g.gun}
                  title={`${g.gun} · ${g.say} görüntülenme`}
                  className={`flex-1 rounded-t-md ${g.bugun ? "bg-primary" : ""}`}
                  style={{
                    height: `${g.h}%`,
                    background: g.bugun ? undefined : "#d8ccf0",
                    borderRadius: "6px 6px 3px 3px",
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10.5px] font-semibold text-ink-300">
              <span>29 Haz</span>
              <span>6 Tem</span>
              <span>Bugün</span>
            </div>
            <p className="mt-3.5 rounded-control bg-accent-soft px-3 py-2.5 text-xs font-medium leading-relaxed text-accent-ink">
              <strong className="text-accent-ink">
                10 Temmuz&apos;daki sıçrama
              </strong>
              , ilanın &quot;Müzik &amp; Plak&quot; kategorisinde öne çıkmasıyla
              geldi. Çubukların üzerine gelerek gün detayını görebilirsin.
            </p>
          </section>

          {/* Dönüşüm hunisi */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <h2 className="mb-[18px] text-[17px] font-extrabold text-ink-900">
              Dönüşüm Hunisi
            </h2>
            <div className="flex flex-col gap-3">
              {huni.map((h) => (
                <div key={h.ad}>
                  <div className="mb-1.5 flex justify-between text-[12.5px] font-semibold">
                    <span className="text-ink-900">{h.ad}</span>
                    <span
                      className={
                        h.sagMuted
                          ? "text-ink-400"
                          : "font-extrabold text-ink-900"
                      }
                    >
                      {h.sag}
                    </span>
                  </div>
                  <div
                    className="h-[26px] rounded-lg"
                    style={{ width: `${h.w}%`, background: h.renk }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium leading-relaxed text-ink-400">
              Bu ilan, kategorisindeki ortalamanın{" "}
              <strong className="text-accent-ink">2,1 katı</strong> sunum aldı.
              Görüntülenme→sunum dönüşümünü artırmak için açıklamana pazarlık
              payı ve durum toleransı ekleyebilirsin.
            </p>
          </section>
        </div>

        {/* ── SAĞ: YÖNETİM ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          {/* İlan kartı */}
          <div className="rounded-card border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-[62px] w-[62px] flex-none overflow-hidden rounded-xl bg-subtle">
                {talepGorsel && (
                  <Image
                    src={talepGorsel}
                    alt=""
                    fill
                    sizes="62px"
                    className="object-cover"
                  />
                )}
              </div>
              <div>
                <div className="text-[13.5px] font-bold leading-snug text-ink-900">
                  {talep.baslik}
                </div>
                <div className="mt-1.5 text-[15px] font-extrabold text-primary">
                  {fiyatText(talep.fiyatNum)}
                </div>
              </div>
            </div>
            <ButtonLink
              href="/ilan/dawn-fm-imzali-cd"
              variant="secondary"
              className="mt-3.5 w-full"
            >
              İlanı Görüntüle
            </ButtonLink>
          </div>

          {/* Süre */}
          <div className="rounded-card border border-border bg-card p-[18px]">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-ink-900">
                İlan Süresi
              </span>
              <span className="text-[13.5px] font-extrabold text-ink-900">
                {kalanGun} gün kaldı
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#efebf5]">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${surePct}%` }}
              />
            </div>
            <div className="mt-3.5 flex gap-2">
              {uzatilabilir ? (
                <>
                  <button type="button" onClick={() => uzat(7)} className={uzatBtn}>
                    +7 gün uzat
                  </button>
                  <button type="button" onClick={() => uzat(14)} className={uzatBtn}>
                    +14 gün uzat
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 cursor-not-allowed rounded-control bg-[#efebf5] px-3 py-3 text-center text-[12.5px] font-bold text-ink-300">
                    +7 gün uzat
                  </div>
                  <div className="flex-1 cursor-not-allowed rounded-control bg-[#efebf5] px-3 py-3 text-center text-[12.5px] font-bold text-ink-300">
                    +14 gün uzat
                  </div>
                </>
              )}
            </div>
            {uzatildi && (
              <div className="mt-2.5 rounded-lg bg-accent-soft px-[11px] py-[9px] text-xs font-bold leading-snug text-accent-ink">
                Süre uzatıldı ✓ — takipçilere bildirildi.
              </div>
            )}
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-ink-300">
              Süre en fazla 30 güne çıkarılabilir. Süre dolunca ilan yayından
              kalkar; dilediğinde yeniden yayınlarsın.
            </p>
          </div>

          {/* Eylemler */}
          <div className="rounded-card border border-border bg-card p-[18px]">
            <div className="mb-3 text-sm font-extrabold text-ink-900">
              Eylemler
            </div>
            <ButtonLink
              href={`/ilan-ac?duzenle=${TALEP_ID}`}
              variant="primary"
              className="w-full"
            >
              İlanı Düzenle
            </ButtonLink>

            {durum !== "kaldirildi" &&
              (durum === "yayinda" ? (
                <Button
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => setDurum("durakladi")}
                >
                  İlanı Duraklat
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDurum("yayinda")}
                  className="mt-2 w-full cursor-pointer rounded-xl border-[1.5px] border-accent bg-accent-soft px-[18px] py-3.5 text-[13.5px] font-bold text-accent-ink hover:brightness-95"
                >
                  Yayına Devam Et ▸
                </button>
              ))}

            {durum !== "kaldirildi" && !kaldirSoru && (
              <button
                type="button"
                onClick={() => setKaldirSoru(true)}
                className="mt-2 w-full cursor-pointer p-2.5 text-[12.5px] font-semibold text-danger"
              >
                İlanı yayından kaldır
              </button>
            )}

            {durum !== "kaldirildi" && kaldirSoru && (
              <div className="mt-2.5 rounded-control border border-danger-line bg-danger-soft p-3">
                <div className="text-[12.5px] font-bold leading-snug text-danger">
                  İlan kaldırılsın mı? 12 sunum ve 1 aktif sohbet kapanır.
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setKaldirSoru(false)}
                    className="flex-1 cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-2.5 py-2.5 text-xs font-bold text-ink-900"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKaldirSoru(false);
                      setDurum("kaldirildi");
                    }}
                    className="flex-1 cursor-pointer rounded-control bg-danger px-2.5 py-2.5 text-xs font-bold text-white"
                  >
                    Evet, kaldır
                  </button>
                </div>
              </div>
            )}

            {durum === "kaldirildi" && (
              <div className="mt-2.5 rounded-control bg-page p-3 text-center">
                <div className="text-[12.5px] font-bold leading-snug text-ink-500">
                  İlan yayından kaldırıldı.
                </div>
                <button
                  type="button"
                  onClick={() => setDurum("yayinda")}
                  className="mt-2 cursor-pointer p-1 text-[12.5px] font-bold text-primary"
                >
                  Geri al
                </button>
              </div>
            )}
          </div>

          {/* Bilgi + karşılaştır */}
          <div className="rounded-card bg-ink-900 p-[18px] text-white">
            <div className="text-[13.5px] font-extrabold">
              Sunumların 12&apos;si de sana özel
            </div>
            <p className="mt-2 text-[11.5px] font-medium leading-relaxed text-[#cfc5e8]">
              Sunumları yalnızca sen görürsün. Beğendiklerinden teklif iste —
              teklif gelince pazarlık sohbette başlar.
            </p>
            <ButtonLink
              href="/sunum-karsilastirma"
              variant="lime"
              className="mt-3 w-full"
            >
              ⇄ Sunum Karşılaştırma
            </ButtonLink>
          </div>
        </aside>
      </div>
    </main>
  );
}
