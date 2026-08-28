"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Talep } from "@/lib/data";
import { fiyatText, talepGorselleri, KART_GORSEL_ORANI } from "@/lib/data";

export function TalepCard({
  talep,
  favoride = false,
  ilgili = false,
}: {
  talep: Talep;
  /** Favori listesinden gelen kartlarda kalp dolu başlar. */
  favoride?: boolean;
  /**
   * Bu talebin sahibi ya da ona sunum yapmış satıcı mıyım? Alışverişi
   * biten talebi yalnızca bu kişiler açabilir; diğerlerine kart "artık
   * mevcut değil" der.
   */
  ilgili?: boolean;
}) {
  const gorseller = talepGorselleri(talep);
  // Alışverişi tamamlanan talep listede 12 saat daha durur; ilgisi
  // olmayanlar için tıklanamaz.
  const kapali = !!talep.kapandi && !ilgili;
  const [uyari, setUyari] = useState(false);
  const [idx, setIdx] = useState(0);
  const [favori, setFavori] = useState(favoride);
  const cokluGorsel = gorseller.length > 1;

  /**
   * Favoriyi SUNUCUYA yazar.
   *
   * Bu düğme bir dönem yalnızca yerel state çeviriyordu: kullanıcı karttan
   * favorilediğini sanıyor, sayfa yenilenince kayboluyor ve "Favorilerim"
   * boş kalıyordu. İlan DETAY sayfasındaki kalp doğru çalıştığı için hata
   * gözden kaçmıştı — aynı ürünün iki yerinde iki farklı davranış vardı.
   *
   * Önce ekranda çevrilir (hızlı geri bildirim), sunucu reddederse geri alınır.
   */
  const favoriDegistir = async () => {
    const yeni = !favori;
    setFavori(yeni);
    const r = await fetch("/api/favoriler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talepId: talep.id }),
    }).catch(() => undefined);
    if (!r?.ok) {
      setFavori(!yeni);
      return;
    }
    const { favoride } = (await r.json().catch(() => ({}))) as {
      favoride?: boolean;
    };
    if (typeof favoride === "boolean") setFavori(favoride);
  };

  // Kart bir <Link>; okların ilana gitmesini engelle, sadece görsel değiştir.
  const gecis = (e: React.MouseEvent, yon: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + yon + gorseller.length) % gorseller.length);
  };

  // KARTLAR EŞİT YÜKSEKLİKTE. Kart `block` olduğu için yüksekliği
  // içeriğine bağlıydı: "Muadil kabul" rozeti taşıyan kart, yanındakinden
  // bir rozet boyu uzun duruyor ve ızgarada asimetri yaratıyordu. Artık
  // kart bir sütun ve `h-full` ile satırın yüksekliğini alıyor; metin
  // bloğu (`flex-1`) kalan boşluğu doldurduğu için rozet olsun olmasın
  // kartların dış ölçüsü aynı kalıyor.
  const kartCls = `group flex h-full flex-col overflow-hidden rounded-card border text-left transition-colors hover:border-primary ${
    // Üst sıra: etiket yok — kart hafif yeşil zeminle standart ilanlardan ayrışır.
    talep.pazarlik ? "border-accent bg-accent/45" : "border-border bg-card"
  }`;

  // Kapalı talepte kart bir düğmedir: tıklanınca ilana gitmez, yalnızca
  // "artık mevcut değil" uyarısını gösterir.
  const govde = (
    <>
      {/* Kart alanı dikey (bkz. lib/data.ts → KART_GORSEL_ORANI); görsel
          `object-contain` ile İÇİNE SIĞAR.
          `cover` ile yatay çekilmiş bir fotoğrafın sağı solu kırpılıyordu ve
          kırpılan yer çoğu zaman ürünün kendisiydi — kart, alıcının ürünü
          ilk gördüğü yer. Kırpmak yerine yanlarda boşluk bırakmak doğru:
          fotoğrafın tamamı görünür (bkz. SunumOnizleme, aynı gerekçe). */}
      <div
        className={`relative flex ${KART_GORSEL_ORANI} items-center justify-center overflow-hidden ${
          gorseller.length ? "bg-subtle" : "ref-image"
        }`}
      >
        {gorseller.length ? (
          <Image
            src={gorseller[idx]}
            alt={talep.baslik}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="font-mono text-[10px] text-ink-400">
            referans görsel
          </span>
        )}

        {/* Sol üst: favori kalbi */}
        <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Alışverişi biten talep favorilenemez: aynı uyarı gösterilir.
              if (kapali) {
                setUyari(true);
                return;
              }
              void favoriDegistir();
            }}
            aria-pressed={favori}
            aria-label={favori ? "Favorilerden çıkar" : "Favorilere ekle"}
            title={favori ? "Favorilerden çıkar" : "Favorilere ekle"}
            className="group/fav flex h-7 w-7 items-center justify-center rounded-full bg-card/85 shadow-sm backdrop-blur transition-colors hover:bg-card"
          >
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-[15px] w-[15px] transition-colors ${
                favori
                  ? "fill-[#e11d48] text-[#e11d48]"
                  : "fill-none text-ink-700 group-hover/fav:fill-[#e11d48] group-hover/fav:text-[#e11d48]"
              }`}
              aria-hidden
            >
              <path d="M12 20.5s-7.3-4.6-9.3-9.2A5.1 5.1 0 0112 5.6a5.1 5.1 0 019.3 5.7c-2 4.6-9.3 9.2-9.3 9.2z" />
            </svg>
          </button>
        </div>

        {/* Sağ üst: acil etiketi */}
        {talep.acil && (
          <span className="absolute right-2.5 top-2.5 z-20 rounded-md bg-acil px-2 py-[5px] text-[11px] font-extrabold uppercase tracking-[1px] text-white shadow-sm">
            ! Acil
          </span>
        )}

        {/* MUADİL ŞERİDİ KALDIRILDI (görselin sağ alt köşesinde çapraz
            duruyordu). Alıcının "muadili de olur" tercihi kartta yer
            kaplamamalı: satıcıyı yalnızca ARARKEN ilgilendiriyor ve
            Keşfet'teki "Muadil kabul" filtresiyle (bkz. muadilKabulEder)
            zaten seçilebiliyor. Tercih ilan detayındaki künyede "Muadil
            ürün" satırı olarak yazılı kalır. */}

        {/* Görsel önizleme — sağa/sola geçiş */}
        {cokluGorsel && (
          <>
            <button
              type="button"
              aria-label="Önceki görsel"
              onClick={(e) => gecis(e, -1)}
              className="absolute left-1.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-card/85 text-[15px] font-bold leading-none text-ink-900 opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-card group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Sonraki görsel"
              onClick={(e) => gecis(e, 1)}
              className="absolute right-1.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-card/85 text-[15px] font-bold leading-none text-ink-900 opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-card group-hover:opacity-100"
            >
              ›
            </button>
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1 drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]">
              {gorseller.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-3.5 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Görsel ile metin bloğu arasında ayırıcı çizgi. İkisi bitişikti ve
          `object-contain` sonrası görselin yanlarında kalan `bg-subtle`
          boşluk, metin bloğunun zeminine karışıyordu: fotoğrafın nerede
          bitip kartın bilgi alanının nerede başladığı belli olmuyordu.
          Pazarlıklı kartta zemin yeşil olduğu için sınır büsbütün
          kayboluyordu.

          Ton `border-hairline` değil `border-border`: hairline (#f1edf8)
          beyaz görsel zemininde ve pazarlıklı kartın yeşilinde neredeyse
          görünmüyordu, yani çizgi vardı ama ayırmıyordu. `border-border`
          kartın kendi çerçevesiyle aynı renk — hâlâ ince, ama belirleyici
          ve karta yabancı bir ton eklemiyor. */}
      <div className="flex flex-1 flex-col border-t border-border p-[15px]">
        {/* Fiyat */}
        <div className="text-[20px] font-extrabold leading-none text-ink-900">
          {fiyatText(talep.fiyatNum)}
        </div>
        {/* MARKA · başlık */}
        <div className="mt-[10px] text-[11px] font-extrabold uppercase tracking-[0.8px] text-primary">
          {talep.marka}
        </div>
        {/* BAŞLIK TEK SATIR; taşan kısım üç nokta ile kısalır.
            İki satıra izin veriliyordu ve başlık sınırı 105 karaktere
            çıkınca ızgarada kartların yüksekliği başlık uzunluğuna göre
            oynuyordu. Tamamı `title` içinde duruyor. */}
        <div
          title={talep.baslik}
          className="mt-1 line-clamp-1 text-[18px] font-bold leading-snug text-ink-900"
        >
          {talep.baslik}
        </div>
        {/* Açıklama */}
        <div className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-ink-400">
          {talep.aciklama}
        </div>
        {/* Acil etiketi görselin sol üstünde durur; üst sıra bir sıralama
            önceliğidir, kartta etiket olarak gösterilmez. */}
      </div>
    </>
  );

  return (
    <div className="relative h-full">
      {uyari && (
        <div
          role="status"
          onClick={() => setUyari(false)}
          className="absolute inset-0 z-30 flex cursor-pointer items-center justify-center rounded-card bg-ink-900/80 p-4 text-center"
        >
          <span className="text-[14.5px] font-extrabold leading-snug text-white">
            Bu talep artık mevcut değil
          </span>
        </div>
      )}
      {kapali ? (
        // Kart <button> olamaz: içinde favori kalbi gibi başka düğmeler var
        // ve HTML'de düğme içine düğme konulamaz. Bunun yerine tıklanabilir
        // bir bölge: fare, klavye (Enter/Space) ve ekran okuyucu çalışır.
        <div
          role="button"
          tabIndex={0}
          onClick={() => setUyari(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setUyari(true);
            }
          }}
          className={`${kartCls} w-full cursor-default`}
        >
          {govde}
        </div>
      ) : (
        <Link href={`/ilan/${talep.id}`} className={kartCls}>
          {govde}
        </Link>
      )}
    </div>
  );
}
