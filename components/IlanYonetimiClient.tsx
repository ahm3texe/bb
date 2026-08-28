"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Chip } from "@/components/ui/Chip";
import { Button, ButtonLink } from "@/components/ui/Button";
import { talepNo, talepGorselleri, fiyatText } from "@/lib/data";
import type { Talep } from "@/lib/data";
import { kalanGun, YAYIN_SURESI_GUN } from "@/lib/talep-durum";

// NOT: Bu ekran bir dönem tamamen kurguydu — "1.284 görüntülenme", 14 günlük
// çubuk grafik, dönüşüm hunisi ve "kategorisinin 2,1 katı sunum aldı" cümlesi
// sabit değerlerdi. Dahası, Duraklat / Kaldır düğmeleri yalnızca yerel state'i
// değiştiriyordu: kullanıcı "Duraklatıldı" görüyor, sayfayı yenileyince ilan
// yayında kalmaya devam ediyordu.
//
// Artık gösterilen her sayı gerçek kayıttan geliyor (bkz.
// `talepIstatistikleri`) ve her düğme gerçek uca yazıyor. Görüntülenme
// ölçülmediği için o kart ve ona dayanan grafik/huni kaldırıldı — ölçülmeyen
// bir şeyi göstermenin doğru yolu yok.

export type TalepIstatistik = {
  sunum: number;
  takip: number;
  teklifli: number;
  aktifSohbet: number;
};

export function IlanYonetimiClient({
  talep,
  istatistik,
  ilanlarim = [],
}: {
  /**
   * Yönetilen ilan — oturum sahibinin kendi talebi, SUNUCUDAN gelir.
   * Eskiden `oturumAnaTalepId()` + `getTalep()` ile çözülüyordu; ikisi de
   * sabit (ve boş) dizileri okuduğu için ekran hiçbir zaman veri
   * göstermiyordu.
   */
  talep?: Talep;
  /** Gerçek kayıtlardan türetilmiş sayılar. */
  istatistik?: TalepIstatistik;
  /**
   * Kullanıcının tüm ilanları — yalnızca seçici için (id + başlık).
   *
   * Sayfa eskiden her zaman ilk talebi açıyordu; birden fazla ilanı olan
   * kullanıcı diğerlerine ulaşamıyordu.
   */
  ilanlarim?: { id: string; baslik: string }[];
}) {
  const router = useRouter();
  const talepGorsel = talep ? talepGorselleri(talep)[0] : undefined;

  const [isliyor, setIsliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [kaldirSoru, setKaldirSoru] = useState(false);

  // Durum ve kalan gün ARTIK yerel state değil: ikisi de talebin kendi
  // kaydından okunur, işlem sonrası `router.refresh()` ile tazelenir.
  const donduruldu = Boolean(talep?.donduruldu);
  const kaldirildi = Boolean(talep?.silindi);
  const kalan = talep ? kalanGun(talep) : 0;
  const surePct = Math.max(
    4,
    Math.min(100, Math.round((kalan / YAYIN_SURESI_GUN) * 100)),
  );

  const sayi = istatistik ?? {
    sunum: 0,
    takip: 0,
    teklifli: 0,
    aktifSohbet: 0,
  };

  /** Talebi dondurur ya da yeniden yayına alır — gerçek uca yazar. */
  async function yayinDurumu(islem: "dondur" | "yayinla") {
    if (isliyor || !talep) return;
    setIsliyor(true);
    setHata("");
    try {
      const r = await fetch(`/api/talepler/${talep.id}/yayin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islem }),
      });
      if (!r.ok) {
        const v = await r.json().catch(() => ({}));
        throw new Error(v.hata ?? "İşlem tamamlanamadı.");
      }
      router.refresh();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setIsliyor(false);
    }
  }

  /** İlanı yayından kaldırır. Sunucu gerekirse arşivler (bkz. talepSil). */
  async function ilaniKaldir() {
    if (isliyor || !talep) return;
    setIsliyor(true);
    setHata("");
    try {
      const r = await fetch(`/api/talepler/${talep.id}`, { method: "DELETE" });
      if (!r.ok) {
        const v = await r.json().catch(() => ({}));
        throw new Error(v.hata ?? "İlan kaldırılamadı.");
      }
      setKaldirSoru(false);
      router.replace("/profil");
      router.refresh();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İlan kaldırılamadı.");
      setIsliyor(false);
    }
  }

  let durumText = `Yayında · ${kalan} gün kaldı`;
  let durumVariant: "good" | "muted" | "danger" = "good";
  if (donduruldu) {
    durumText = "Duraklatıldı — satıcılara kapalı";
    durumVariant = "muted";
  }
  if (kaldirildi) {
    durumText = "Yayından kaldırıldı";
    durumVariant = "danger";
  }

  if (!talep) {
    return (
      <main className="mx-auto max-w-[640px] px-6 pb-20 pt-16">
        <div className="rounded-panel border border-border bg-card p-9 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-2xl text-primary-hover">
            ⌕
          </div>
          <h1 className="mt-5 text-[22px] font-extrabold text-ink-900">
            Yönetilecek bir ilanın yok
          </h1>
          <p className="mx-auto mt-2.5 max-w-md text-sm font-medium leading-relaxed text-ink-500">
            Talep açtığında gelen sunumları, takip sayısını ve kalan süreyi
            bu sayfadan izleyebilirsin.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <ButtonLink href="/ilan-ac" variant="primary" size="lg">
              Aradığını İlan Et
            </ButtonLink>
            <ButtonLink href="/kesfet" variant="secondary" size="lg">
              Talepleri Keşfet
            </ButtonLink>
          </div>
        </div>
      </main>
    );
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
            {talep.baslik} · İlan No: {talepNo(talep.id)}
          </div>
          {/* Birden fazla ilan varsa hangisinin yönetildiği seçilebilmeli;
              yoksa ekran sessizce hep aynı ilanı açar. */}
          {ilanlarim.length > 1 && (
            <label className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-500">
              Yönetilen ilan:
              <select
                value={talep.id}
                onChange={(e) =>
                  router.push(
                    `/ilan-yonetimi?id=${encodeURIComponent(e.target.value)}`,
                  )
                }
                className="max-w-[320px] rounded-control border-[1.5px] border-border-input bg-card px-3 py-2 text-[12.5px] font-semibold text-ink-900 outline-none focus:border-primary"
              >
                {ilanlarim.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.baslik}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <Chip variant={durumVariant} className="text-[11.5px]">
          {durumText}
        </Chip>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── SOL: İSTATİSTİK ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Özet kartları — hepsi gerçek kayıttan sayılır. */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-card border border-border bg-card p-4">
              <div className="text-[11.5px] font-medium text-ink-400">
                Takip
              </div>
              <div className="mt-2 text-2xl font-extrabold text-ink-900">
                {sayi.takip}
              </div>
              <div className="mt-[7px] text-[11px] font-medium text-ink-300">
                {sayi.takip === 1 ? "kişi favoriledi" : "kişi favoriledi"}
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-4">
              <div className="text-[11.5px] font-medium text-ink-400">
                Açık sunum
              </div>
              <div className="mt-2 text-2xl font-extrabold text-ink-900">
                {sayi.sunum}
              </div>
              {sayi.sunum > 0 ? (
                <Link
                  href="/sunum-karsilastirma"
                  className="mt-[7px] inline-block text-[11px] font-bold"
                >
                  Karşılaştır ›
                </Link>
              ) : (
                <div className="mt-[7px] text-[11px] font-medium text-ink-300">
                  henüz sunum yok
                </div>
              )}
            </div>

            <div className="rounded-card border border-border bg-card p-4">
              <div className="text-[11.5px] font-medium text-ink-400">
                Pazarlık
              </div>
              <div className="mt-2 text-2xl font-extrabold text-ink-900">
                {sayi.teklifli}
              </div>
              {sayi.aktifSohbet > 0 ? (
                <Link
                  href="/mesajlar"
                  className="mt-[7px] inline-block text-[11px] font-bold"
                >
                  {sayi.aktifSohbet} aktif sohbet ›
                </Link>
              ) : (
                <div className="mt-[7px] text-[11px] font-medium text-ink-300">
                  teklif gelmedi
                </div>
              )}
            </div>
          </div>

          {/* Sunum durumu */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <h2 className="text-[17px] font-extrabold text-ink-900">
              İlanın nerede?
            </h2>
            {sayi.sunum === 0 ? (
              <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink-500">
                Henüz sunum gelmedi. Talebine uyan ürünü olan satıcılar
                ilanını gördükçe sunum gönderir; sunumları yalnızca sen
                görürsün.
              </p>
            ) : (
              <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink-500">
                <strong className="text-ink-900">{sayi.sunum} açık sunum</strong>{" "}
                değerlendirmeni bekliyor
                {sayi.teklifli > 0 ? (
                  <>
                    {" "}
                    ve{" "}
                    <strong className="text-ink-900">
                      {sayi.teklifli} tanesinde
                    </strong>{" "}
                    pazarlık başladı
                  </>
                ) : null}
                . Sunumları yan yana koyup karşılaştırabilirsin.
              </p>
            )}
            <p className="mt-3.5 rounded-control bg-page px-3 py-2.5 text-xs font-medium leading-relaxed text-ink-400">
              Görüntülenme sayacı henüz yok; ölçülmeyen bir rakamı burada
              göstermiyoruz.
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
                    className="object-contain"
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
              href={`/ilan/${talep.id}`}
              variant="secondary"
              className="mt-3.5 w-full"
            >
              İlanı Görüntüle
            </ButtonLink>
          </div>

          {/* Süre — kalan gün talebin kendi kaydından hesaplanır. */}
          <div className="rounded-card border border-border bg-card p-[18px]">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-ink-900">
                İlan Süresi
              </span>
              <span className="text-[13.5px] font-extrabold text-ink-900">
                {donduruldu ? "Duraklatıldı" : `${kalan} gün kaldı`}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#efebf5]">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${surePct}%` }}
              />
            </div>
            {/*
              "+7 / +14 gün uzat" düğmeleri kaldırıldı: karşılıkları yoktu,
              yalnızca yerel sayacı artırıyorlardı. Sürenin gerçek karşılığı
              yeniden yayına almaktır — sunucu sayacı YAYIN_SURESI_GUN'den
              başlatır (bkz. talepYayinDurumu).
            */}
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-ink-300">
              İlan {YAYIN_SURESI_GUN} gün yayında kalır. Süre dolunca yayından
              kalkar; yeniden yayına aldığında sayaç baştan başlar.
              Duraklatırsan kalan süre saklanır.
            </p>
          </div>

          {/* Eylemler — hepsi gerçek uca yazar. */}
          <div className="rounded-card border border-border bg-card p-[18px]">
            <div className="mb-3 text-sm font-extrabold text-ink-900">
              Eylemler
            </div>
            <ButtonLink
              href={`/ilan-ac?duzenle=${talep.id}`}
              variant="primary"
              className="w-full"
            >
              İlanı Düzenle
            </ButtonLink>

            {!kaldirildi &&
              (donduruldu ? (
                <button
                  type="button"
                  disabled={isliyor}
                  onClick={() => void yayinDurumu("yayinla")}
                  className="mt-2 w-full cursor-pointer rounded-xl border-[1.5px] border-accent bg-accent-soft px-[18px] py-3.5 text-[13.5px] font-bold text-accent-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isliyor ? "Yayınlanıyor…" : "Yayına Devam Et ▸"}
                </button>
              ) : (
                <Button
                  variant="secondary"
                  className="mt-2 w-full"
                  disabled={isliyor}
                  onClick={() => void yayinDurumu("dondur")}
                >
                  {isliyor ? "Duraklatılıyor…" : "İlanı Duraklat"}
                </Button>
              ))}

            {!kaldirildi && !kaldirSoru && (
              <button
                type="button"
                onClick={() => setKaldirSoru(true)}
                className="mt-2 w-full cursor-pointer p-2.5 text-[12.5px] font-semibold text-danger"
              >
                İlanı yayından kaldır
              </button>
            )}

            {!kaldirildi && kaldirSoru && (
              <div className="mt-2.5 rounded-control border border-danger-line bg-danger-soft p-3">
                <div className="text-[12.5px] font-bold leading-snug text-danger">
                  İlan kaldırılsın mı?
                  {sayi.sunum > 0 || sayi.aktifSohbet > 0
                    ? ` ${sayi.sunum} sunum ve ${sayi.aktifSohbet} sohbet kapanır.`
                    : " Bu işlem geri alınamaz."}
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
                    disabled={isliyor}
                    onClick={() => void ilaniKaldir()}
                    className="flex-1 cursor-pointer rounded-control bg-danger px-2.5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isliyor ? "Kaldırılıyor…" : "Evet, kaldır"}
                  </button>
                </div>
              </div>
            )}

            {kaldirildi && (
              <div className="mt-2.5 rounded-control bg-page p-3 text-center">
                <div className="text-[12.5px] font-bold leading-snug text-ink-500">
                  İlan yayından kaldırıldı.
                </div>
              </div>
            )}

            {hata && (
              <p
                role="alert"
                className="mt-2.5 rounded-control bg-danger-soft px-3 py-2.5 text-xs font-semibold leading-snug text-danger"
              >
                {hata}
              </p>
            )}
          </div>

          {/* Bilgi + karşılaştır */}
          <div className="rounded-card bg-ink-900 p-[18px] text-white">
            <div className="text-[13.5px] font-extrabold">
              {sayi.sunum > 0
                ? `Sunumların ${sayi.sunum} tanesi de sana özel`
                : "Gelen sunumlar yalnızca sana görünür"}
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
