"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fiyatText } from "@/lib/data";
import type { GelenSunum } from "@/lib/gelen-sunumlar";
import type { Sunumum } from "@/lib/sunumlarim";
import type { Talep } from "@/lib/data";
import type { Kullanici } from "@/lib/kullanicilar";
import { TalepCard } from "@/components/TalepCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { HesapNav } from "@/components/HesapNav";
import { profilYolu, useOturumSahibi } from "@/lib/aktif-kullanici";
import { HesapKart } from "@/components/HesapKart";
import type { IptalSebep } from "@/lib/iptal";
import { eslesmeOzeti, kunyeSatirlari } from "@/components/SunumOnizleme";
import { yenidenYayinlanabilirMi } from "@/lib/talep-durum";
import type { AliciMetrik } from "@/lib/alici-kalitesi";
import { sunumYanitKalanMs } from "@/lib/gelen-sunumlar";
import {
  taslakOzeti,
  taslakSil,
  taslakZamanMetni,
  useTaslak,
} from "@/lib/taslak";

type Tab =
  | "talepler"
  | "gelen"
  | "sunumlar"
  | "takip"
  | "yorumlar"
  /** Yayından kaldırdığım talepler — kayıt olarak duruyor. */
  | "kaldirilan"
  /** Yarım kalmış ilan taslağı. */
  | "taslaklar";

const pill =
  "inline-flex flex-none items-center rounded-full px-[11px] py-[7px] text-[11.5px] font-bold leading-none";





// Küçük, sade çizgi ikonlar (renkli/zıplayan değil — işi tatlandıran dokunuş).
/**
 * Alt bölümlerin (Kaldırdıklarım, Taslaklar) başlığı ve dönüş bağlantısı.
 *
 * Bu bölümlere "Taleplerim" sekmesindeki düğmelerden giriliyor ve o düğmeler
 * yalnızca orada duruyor; kullanıcının nerede olduğunu ve nasıl döneceğini
 * bölümün kendisi söylemeli.
 */
/**
 * Talebin neden yayından kalktığını söyleyen küçük etiket.
 *
 * İki sebep çok farklı şeyler anlatır: biri alışverişin tamamlandığını,
 * diğeri kullanıcının kendi kararını. Aynı ızgarada yan yana durdukları
 * için ayrımın kartta görünmesi gerekir.
 *
 * Damgası olmayan eski kayıtlarda hiçbir şey yazılmaz — uydurulmuş bir
 * gerekçe, gerekçesizlikten kötüdür.
 */
/**
 * "Kalıcı olarak sil" — iki aşamalı silmenin ikinci adımı.
 *
 * Talep önce yayından kalkar ve burada durur; kalıcı silme ayrı ve onaylı
 * bir adımdır. Geri alınamaz bir işlemi tek tıka indirmek doğru değil.
 *
 * ALIŞVERİŞE DÖNÜŞEN TALEPTE DÜĞME HİÇ ÇIKMAZ: o kaydı silmek iki tarafın
 * sohbetini, sipariş kaydını ve para geçmişini birden yok ederdi. Sunucu da
 * aynı kuralı uyguluyor (bkz. lib/depo.ts → talepKaliciSil); buradaki
 * gizleme yalnızca kullanıcıyı boşuna denemekten kurtarır.
 */
function KaliciSil({ talep }: { talep: Talep }) {
  const router = useRouter();
  const [soru, setSoru] = useState(false);
  const [isliyor, setIsliyor] = useState(false);
  const [hata, setHata] = useState("");

  // Alışverişe dönüşen talep silinemez (sunucu da reddeder); düğmeyi hiç
  // göstermemek kullanıcıyı boşuna denemekten kurtarır.
  if (talep.kaldirmaSebebi === "alisveris") return null;

  async function sil() {
    if (isliyor) return;
    setIsliyor(true);
    setHata("");
    const r = await fetch(
      `/api/talepler/${encodeURIComponent(talep.id)}?kalici=1`,
      { method: "DELETE" },
    ).catch(() => undefined);
    const v = (await r?.json().catch(() => ({}))) as { hata?: string };
    if (!r?.ok) {
      setHata(v.hata ?? "Silinemedi, tekrar dene.");
      setIsliyor(false);
      return;
    }
    // Kayıt gerçekten gitti; liste sunucudan tazelenir.
    router.refresh();
  }

  if (!soru)
    return (
      <button
        type="button"
        onClick={() => setSoru(true)}
        className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-2.5 py-1.5 text-[11.5px] font-bold text-ink-500 transition-colors hover:border-danger-line hover:text-danger"
      >
        Talebi sil
      </button>
    );

  return (
    <div className="rounded-control border border-danger-line bg-danger-soft px-2.5 py-2 text-center">
      <p className="text-[11px] font-bold leading-snug text-danger">
        Kayıt tamamen silinecek: gelen sunumlar ve sohbetler de gider. Bu
        işlem geri alınamaz.
      </p>
      {hata && (
        <p role="alert" className="mt-1 text-[11px] font-bold text-danger">
          {hata}
        </p>
      )}
      <div className="mt-1.5 flex justify-center gap-1.5">
        <button
          type="button"
          disabled={isliyor}
          onClick={() => void sil()}
          className="cursor-pointer rounded-control bg-danger px-2.5 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-60"
        >
          {isliyor ? "Siliniyor…" : "Evet, sil"}
        </button>
        <button
          type="button"
          onClick={() => setSoru(false)}
          className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-2.5 py-1.5 text-[11px] font-bold text-ink-500"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}

function KalkmaSebebi({ talep }: { talep: Talep }) {
  const alisveris = talep.kaldirmaSebebi === "alisveris";
  // Dondurma damgası kaldırma damgasından ayrı tutulur: dondurulan talep
  // geri yayına alınabilir, kaldırılan alınamaz.
  const metin = alisveris
    ? "Alışverişe dönüştüğü için yayından kalktı"
    : talep.donduruldu
      ? "Sen dondurdun — yayına geri alabilirsin"
      : talep.kaldirmaSebebi === "kullanici"
        ? "Yayından kaldırdın"
        : null;
  if (!metin) return null;

  return (
    <p
      className={`rounded-control px-2.5 py-1.5 text-center text-[11.5px] font-semibold leading-snug ${
        alisveris ? "bg-accent-soft text-accent-ink" : "bg-page text-ink-500"
      }`}
    >
      {metin}
    </p>
  );
}

function BolumBasligi({
  baslik,
  sayi,
  onDon,
}: {
  baslik: string;
  sayi: string;
  onDon: () => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[16px] font-extrabold text-ink-900">{baslik}</h2>
        <span className="text-[12px] font-medium text-ink-400">{sayi}</span>
      </div>
      <button
        type="button"
        onClick={onDon}
        className="cursor-pointer text-[13px] font-bold text-primary hover:text-primary-hover"
      >
        ‹ Taleplerim
      </button>
    </div>
  );
}

function TabIcon({ tip }: { tip: Tab }) {
  const cls = "h-[17px] w-[17px] flex-none";
  const p = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (tip === "talepler")
    // büyüteç — aradıklarım
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M20 20l-4.5-4.5" />
      </svg>
    );
  if (tip === "kaldirilan")
    // çöp kutusu — yayından kaldırdıklarım
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    );
  if (tip === "taslaklar")
    // kalem — yarım kalmış ilan
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M4 20h4L19 9a2.1 2.1 0 10-3-3L5 17v3z" />
        <path d="M14.5 7.5l3 3" />
      </svg>
    );
  if (tip === "sunumlar")
    // koli — sattıklarım / sunumlarım
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3.3 8L12 13l8.7-5M12 13v8.5" />
      </svg>
    );
  if (tip === "gelen")
    // gelen kutusu — ilanıma gelen sunumlar
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M3 13h5l1.5 2.5h5L16 13h5" />
        <path d="M5.5 5h13l2.5 8v6H3v-6z" />
      </svg>
    );
  if (tip === "takip")
    // kalp — favorilerim
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
        <path d="M12 20.3l-7.1-7.1a4.5 4.5 0 116.4-6.4l.7.7.7-.7a4.5 4.5 0 116.4 6.4z" />
      </svg>
    );
  // yıldız — değerlendirmeler
  return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden {...p}>
      <path d="M12 3l2.7 5.8 6.3.6-4.8 4.2 1.5 6.2L12 16.9 6.3 20l1.5-6.2L3 9.6l6.3-.6z" />
    </svg>
  );
}

// Rol rengi: alıcı=mor, satıcı=yeşil, favoriler=kırmızı (kalp), nötr (yorumlar).
type TabRenk = "mor" | "yesil" | "kirmizi" | "notr";
const tabs: { value: Tab; label: string; renk: TabRenk }[] = [
  // Taleplerim sayısı aktif hesaba göre değiştiği için render sırasında yazılır.
  { value: "talepler", label: "Taleplerim", renk: "mor" },
  {
    value: "gelen",
    label: "Gelen Sunumlar",
    renk: "mor",
  },
  { value: "sunumlar", label: "Sunumlarım", renk: "yesil" },
  { value: "takip", label: "Favorilerim", renk: "kirmizi" },
  // Değerlendirmeler sekmesi yok; kimlik kartındaki "15 değerlendirme"
  // bağlantısı (?tab=yorumlar) bu panele götürür.
];

// Aktif ve hover renk sınıfları — renk eşlemesini hissettirir.
const tabRenkCls: Record<TabRenk, { aktif: string; pasif: string }> = {
  mor: {
    aktif: "border-primary font-bold text-primary",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-primary",
  },
  yesil: {
    aktif: "border-accent-ink font-bold text-accent-ink",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-accent-ink",
  },
  kirmizi: {
    aktif: "border-danger font-bold text-danger",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-danger",
  },
  notr: {
    aktif: "border-ink-900 font-bold text-ink-900",
    pasif: "border-transparent font-semibold text-ink-400 hover:text-ink-900",
  },
};

const tabValues: Tab[] = [
  "talepler",
  "gelen",
  "sunumlar",
  "takip",
  "yorumlar",
  "kaldirilan",
  "taslaklar",
];

/** Satıcının kendi sunumunu geri çekmesi. */
function SunumGeriCek({ sunumId }: { sunumId: string }) {
  const router = useRouter();
  const [soru, setSoru] = useState(false);
  const [isliyor, setIsliyor] = useState(false);
  const [hata, setHata] = useState("");

  if (!soru)
    return (
      <button
        type="button"
        onClick={() => setSoru(true)}
        className="cursor-pointer text-[12px] font-bold text-ink-400 hover:text-acil"
      >
        Sunumu geri çek
      </button>
    );

  return (
    <div className="rounded-control border border-acil-line bg-acil-soft p-2.5 text-center">
      <p className="text-[11.5px] font-bold leading-relaxed text-acil">
        Sunumun geri çekilecek. Talep açıksa yeniden sunum yapabilirsin.
      </p>
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          disabled={isliyor}
          onClick={() => {
            setIsliyor(true);
            setHata("");
            void fetch(`/api/sunumlar/${encodeURIComponent(sunumId)}`, {
              method: "DELETE",
            })
              .then(async (r) => {
                if (!r.ok) {
                  const v = await r.json().catch(() => ({}));
                  throw new Error(v.hata ?? "Geri çekilemedi.");
                }
                router.refresh();
              })
              .catch((e) =>
                setHata(e instanceof Error ? e.message : "Geri çekilemedi."),
              )
              .finally(() => setIsliyor(false));
          }}
          className="cursor-pointer rounded-control bg-acil px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-60"
        >
          {isliyor ? "Çekiliyor…" : "Evet, geri çek"}
        </button>
        <button
          type="button"
          onClick={() => setSoru(false)}
          className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-3 py-1.5 text-[12px] font-bold text-ink-900"
        >
          Vazgeç
        </button>
      </div>
      {hata && (
        <p role="alert" className="mt-1 text-[11.5px] font-bold text-acil">
          {hata}
        </p>
      )}
    </div>
  );
}

/** Yayından kalkmış talebi geri açan küçük düğme. */
function YenidenYayinla({
  talepId,
  durum,
}: {
  talepId: string;
  durum: "donduruldu" | "kapandi" | "suresi-doldu";
}) {
  const router = useRouter();
  const [isliyor, setIsliyor] = useState(false);
  const [hata, setHata] = useState("");
  // Satışı tamamlanan talebi yeniden açmak bilinçli bir karar olmalı.
  const [soru, setSoru] = useState(false);

  function yayinla() {
          setIsliyor(true);
          setHata("");
          void fetch(`/api/talepler/${talepId}/yayin`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ islem: "yayinla" }),
          })
            .then(async (r) => {
              if (!r.ok) {
                const v = await r.json().catch(() => ({}));
                throw new Error(v.hata ?? "İşlem tamamlanamadı.");
              }
              router.refresh();
            })
            .catch((e) =>
              setHata(e instanceof Error ? e.message : "İşlem tamamlanamadı."),
            )
            .finally(() => setIsliyor(false));
  }

  if (soru)
    return (
      <div className="rounded-control border border-primary/40 bg-primary-soft/50 p-3 text-center">
        <p className="text-[12.5px] font-bold leading-relaxed text-primary-hover">
          Bu talep ile aradığın ürüne ulaştın. Yeni bir arayış olarak bu
          talebi tekrar yayına almak istediğine emin misin?
        </p>
        <div className="mt-2.5 flex justify-center gap-2">
          <button
            type="button"
            disabled={isliyor}
            onClick={() => {
              setSoru(false);
              yayinla();
            }}
            className="cursor-pointer rounded-control bg-primary px-3 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-60"
          >
            {isliyor ? "Yayınlanıyor…" : "Evet"}
          </button>
          <button
            type="button"
            onClick={() => setSoru(false)}
            className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-3 py-2 text-[12.5px] font-bold text-ink-900"
          >
            Vazgeç
          </button>
        </div>
      </div>
    );

  return (
    <div>
      <button
        type="button"
        disabled={isliyor}
        onClick={() => {
          // Satış tamamlandıysa önce onay sorulur.
          if (durum === "kapandi") setSoru(true);
          else yayinla();
        }}
        className="w-full cursor-pointer rounded-control bg-primary px-3 py-2.5 text-[13px] font-bold text-white transition-opacity hover:brightness-95 disabled:opacity-60"
      >
        {isliyor ? "Yayınlanıyor…" : "Talebi tekrar yayına al"}
      </button>
      <p className="mt-1 text-center text-[11.5px] font-medium text-ink-400">
        {durum === "donduruldu"
          ? "Donduruldu — yayında değil"
          : durum === "kapandi"
            ? "Alışveriş tamamlandı — yayında değil"
            : "Süresi doldu"}
      </p>
      {hata && (
        <p role="alert" className="mt-1 text-center text-[11.5px] font-bold text-acil">
          {hata}
        </p>
      )}
    </div>
  );
}

export function ProfilClient({
  baslangicTab,
  oturumKullanici,
  talepler,
  gelenSunumlar,
  sunumlarim,
  surenTalepler = [],
  yorumlar = [],
  puan = 0,
  degerlendirmeSayisi = 0,
  metrik,
  kusurlar = [],
}: {
  baslangicTab?: string;
  /** Giriş yapmış hesap — sunucudan gelir. */
  oturumKullanici: string;
  /** Sunucudan gelen veriler — client bileşen veri katmanına dokunmaz. */
  talepler: Talep[];
  gelenSunumlar: GelenSunum[];
  sunumlarim: Sunumum[];
  /** Siparişi süren talep kimlikleri — bunlar yeniden yayına alınamaz. */
  surenTalepler?: string[];
  /** Kullanıcı hakkında yazılan değerlendirmeler (sunucudan). */
  yorumlar?: Kullanici["yorumlar"];
  puan?: number;
  degerlendirmeSayisi?: number;
  /** Gerçek değerlendirmelerden hesaplanan alıcı metrikleri. */
  metrik?: AliciMetrik;
  /** Kusurlu bulunulan iptaller — gerekçesiyle (bkz. HesapKart). */
  kusurlar?: { sebep: IptalSebep; zaman: string }[];
}) {
  const [tab, setTab] = useState<Tab>(
    tabValues.includes(baslangicTab as Tab)
      ? (baslangicTab as Tab)
      : "talepler",
  );

  /**
   * Yarım kalmış ilan taslağı — TARAYICIDA saklanır.
   *
   * Bir dönem taslağa yalnızca İlan Aç sayfası açıldığında ulaşılabiliyordu:
   * kullanıcı başka sayfadaysa yarım kalmış ilanı olduğunu hiçbir yerden
   * öğrenemiyordu. Panel bunu Profilim'e taşır.
   */
  const taslak = useTaslak();
  const [taslakSilSoru, setTaslakSilSoru] = useState(false);

  function taslagiKaldir() {
    // `useTaslak` depoyu dinliyor; silince liste kendiliğinden boşalır.
    // Panel AÇIK kalır: kullanıcı silmenin sonucunu ("Kayıtlı taslağın
    // yok") görsün. Paneli kapatmak, işin olup olmadığını belirsiz
    // bırakırdı.
    taslakSil();
    setTaslakSilSoru(false);
  }

  const getTalep = (id: string) => talepler.find((t) => t.id === id);
  // Aktif hesabın talepleri — hesap değişince liste de değişir.
  const aktif = useOturumSahibi();
  const tumTaleplerim = talepler.filter((t) => t.sahibi === aktif.kullanici);

  /**
   * YAYINDAN KALDIRILANLAR AYRI DURUR.
   *
   * `silindi` damgalı talepler "Taleplerim" ızgarasında, açık ilanların
   * arasında listeleniyordu: kullanıcı hangisinin yayında olduğunu
   * karttan ayırt edemiyor, sekmedeki sayı da yayında olmayanları
   * sayıyordu. Kaldırılan talep silinmez — sohbet, sipariş ve sunum
   * geçmişi iki tarafta da durmalı (bkz. lib/depo.ts → talepSil) — ama
   * yeri açık taleplerin yanı değil.
   */
  /**
   * YAYINDAN KALKANLAR: dondurulmuş VE kaldırılmış talepler.
   *
   * Dondurma da bir yayından çekmedir — talep listelerden kalkar ve yeni
   * sunum almaz. Onu "Taleplerim" ızgarasında bırakmak, yayında olanla
   * olmayanı aynı yerde göstermek demekti.
   */
  const yayindanKalktiMi = (t: Talep) => Boolean(t.silindi || t.donduruldu);
  const taleplerim = tumTaleplerim.filter((t) => !yayindanKalktiMi(t));
  const kaldirilanlar = tumTaleplerim.filter(yayindanKalktiMi);

  // Gelen sunumlar yalnızca aktif hesabın kendi taleplerine gelenlerdir.
  // Kaldırılmış talebe gelen sunumlar da sayılır: kayıt duruyor.
  const kendiTalepIdleri = new Set(tumTaleplerim.map((t) => t.id));
  const gelenler = gelenSunumlar.filter((s) => kendiTalepIdleri.has(s.talepId));
  // Gönderilmiş sunumlar sunucuda zaten aktif hesaba göre süzülür
  // (bkz. gonderdigimSunumlarGetir). Burada ikinci bir "yalnızca varsayılan
  // hesap" kapısı vardı; hesap değiştirilince kendi sunumları gizleniyordu.
  const sunumlarimListesi = sunumlarim;
  // Değerlendirmeler sunucudan gelir; sabit fixture'a düşülmez.
  const yorumlarim = yorumlar;
  // Favoriler sunucudan gelir; sabit liste hiçbir hesapta doğru değildi.
  const [favoriIdler, setFavoriIdler] = useState<string[]>([]);
  useEffect(() => {
    let iptal = false;
    fetch("/api/favoriler")
      .then((r) => (r.ok ? r.json() : { favoriler: [] }))
      .then((v: { favoriler?: string[] }) => {
        if (!iptal) setFavoriIdler(v.favoriler ?? []);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [aktif.kullanici]);
  const takipEttiklerim = favoriIdler
    .map((id) => talepler.find((t) => t.id === id))
    .filter((t): t is Talep => Boolean(t));

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <HesapNav active="/profil" />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <HesapKart
          oturumKullanici={oturumKullanici}
          metrik={metrik}
          kusurlar={kusurlar}
          puan={puan}
          degerlendirme={degerlendirmeSayisi}
        />

        {/* ── Sağ: sekmeler + içerik ── */}
        <div className="min-w-0">
      {/* Başlık + sağda hızlı erişim butonları */}
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink-900">
            Profilim
          </h1>
        </div>
        <div className="ml-auto flex flex-none flex-col items-end gap-2">
          <ButtonLink
            href="/satici-performansi"
            variant="primary"
            size="sm"
            className="min-h-[42px] w-[172px] text-[14px]"
          >
            Performans Panelim
          </ButtonLink>
          <ButtonLink
            href="/talep-alarmlari"
            variant="lime"
            size="sm"
            className="min-h-[42px] w-[172px] text-[14px]"
          >
            Talep Alarmı Kur
          </ButtonLink>
        </div>
      </div>
      {/* ── Sekmeler ── */}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = tab === t.value;
          const renk = tabRenkCls[t.renk];
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              className={`-mb-px flex cursor-pointer items-center gap-1.5 border-b-[2.5px] px-[11px] py-2.5 text-[15px] leading-none transition-colors ${
                active ? renk.aktif : renk.pasif
              }`}
            >
              <TabIcon tip={t.value} />
              {t.value === "talepler"
                ? `Taleplerim (${taleplerim.length})`
                : t.value === "gelen"
                  ? `Gelen Sunumlar (${gelenler.length})`
                  : t.value === "sunumlar"
                    ? `Sunumlarım (${sunumlarimListesi.length})`
                    : t.value === "takip"
                      ? `Favorilerim (${takipEttiklerim.length})`
                      : t.label}
            </button>
          );
        })}
      </div>

      {/*
        EYLEM ÇUBUĞU YALNIZCA "TALEPLERİM"DE.
        Üçü de taleplerle ilgili; Gelen Sunumlar ya da Favorilerim
        sekmesinde alakasız duruyorlardı.

        Kaldırdıklarım/Taslaklar sekmesine geçildiğinde çubuk kaybolur ama
        kullanıcı çıkmazda kalmaz: sekme çubuğu yerinde durur ve o
        bölümlerin başında "Taleplerim'e dön" bağlantısı vardır.
      */}
      {tab === "talepler" && (
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTab("kaldirilan")}
          className="min-h-[42px] text-[14px]"
        >
          Yayından Kalkanlar ({kaldirilanlar.length})
        </Button>
        {/* İkisi de HER ZAMAN durur — sayı sıfır olsa bile giriş noktası
            sabit kalmalı; düğmenin kaybolması, kullanıcının aradığı yerin
            ekrandan yok olması demekti. */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTab("taslaklar")}
          className="min-h-[42px] text-[14px]"
        >
          Taslaklar ({taslak ? 1 : 0})
        </Button>
        <ButtonLink
          href="/ilan-ac"
          variant="primary"
          size="sm"
          className="min-h-[42px] w-[172px] text-[14px]"
        >
          + Yeni Talep Aç
        </ButtonLink>
      </div>
      )}

      {/* ── Taleplerim ── */}
      {tab === "talepler" && (
        <section className="mt-3">

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {taleplerim.map((t) => (
              // KART SATIRIN YÜKSEKLİĞİNİ ALIR. Kartın ALTINA eklenen
              // satırlar ("Yayından kaldırıldı", "Yeniden yayınla") hücreyi
              // uzatıyor ama kartın kendisi içeriği kadar kalıyordu: aynı
              // ızgarada kimi kart uzun kimi kısa görünüyordu. `flex-1`
              // kartı kalan boşluğa yayar, ek satırlar altta hizalanır.
              <div key={t.id} className="flex h-full flex-col gap-2">
                <div className="flex-1">
                  <TalepCard talep={t} ilgili />
                </div>
                {/* "Yayından kaldırıldı — kayıt olarak duruyor" satırı
                    buradaydı. Kaldırılan talepler artık bu ızgarada değil,
                    "Yayından Kaldırdıklarım" bölümünde; açık ilanların
                    arasında durmaları hangisinin yayında olduğunu
                    belirsizleştiriyordu.

                    Süresi dolan ya da dondurulan talep listelerden kalkar
                    ama KAYIT olarak kaldırılmış değildir; sahibi buradan
                    tek dokunuşla geri yayına alır. */}
                {yenidenYayinlanabilirMi(t) && !surenTalepler.includes(t.id) && (
                  <YenidenYayinla
                    talepId={t.id}
                    durum={
                      t.donduruldu
                        ? "donduruldu"
                        : t.kapandi
                          ? "kapandi"
                          : "suresi-doldu"
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}


      {/* ── Yayından Kalkanlar ── */}
      {tab === "kaldirilan" && (
        <section className="mt-3">
          <BolumBasligi
            baslik="Yayından kalkanlar"
            sayi={`${kaldirilanlar.length} talep`}
            onDon={() => setTab("talepler")}
          />
          {kaldirilanlar.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-input bg-subtle px-4 py-8 text-center text-[13.5px] font-medium leading-[1.6] text-ink-400">
              Yayından kalkmış talebin yok. Bir talep siparişe dönüştüğünde
              ya da sen kaldırdığında buraya taşınır; herkese açık
              listelerden kalkar ama kaydı burada durur.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {kaldirilanlar.map((t) => (
                  <div key={t.id} className="flex h-full flex-col gap-2">
                    <div className="flex-1">
                      <TalepCard talep={t} ilgili />
                    </div>
                    {/* GEREKÇE KARTIN ALTINDA. "Neden listede yok?" sorusu
                        ekranda yanıtlanmalı; iki sebep birbirinden çok
                        farklı sonuçlar doğuruyor (biri satışla bitti,
                        diğeri kullanıcının kararı). */}
                    <KalkmaSebebi talep={t} />
                    <KaliciSil talep={t} />
                  </div>
                ))}
              </div>
              {/* Kaldırılan talep SİLİNMEZ ve geri de açılmaz: sohbet,
                  sipariş ve sunum geçmişi iki tarafta da durmalı
                  (bkz. lib/depo.ts → talepYayindanKaldir,
                  lib/talep-durum.ts → yenidenYayinlanabilirMi). Kullanıcı
                  bunu bilmeli, yoksa "yeniden yayınla" düğmesini arar. */}
              <p className="mt-3.5 text-[12px] font-medium leading-[1.6] text-ink-400">
                Bu talepler herkese açık listelerden kalktı ve yeniden yayına
                alınamaz; alışveriş ve sunum geçmişi iki tarafta da durduğu
                için kayıt olarak saklanır. Aynı ürünü yeniden aramak
                istersen yeni bir talep açman gerekir.
              </p>
            </>
          )}
        </section>
      )}

      {/* ── Taslaklar ── */}
      {tab === "taslaklar" && (
        <section className="mt-3">
          <BolumBasligi
            baslik="Taslaklarım"
            sayi={`${taslak ? 1 : 0} taslak`}
            onDon={() => setTab("talepler")}
          />
          {!taslak ? (
            <div className="rounded-card border border-dashed border-border-input bg-subtle px-4 py-8 text-center">
              <p className="text-[13.5px] font-semibold text-ink-700">
                Kayıtlı taslağın yok.
              </p>
              <p className="mx-auto mt-1.5 max-w-[440px] text-[12.5px] font-medium leading-[1.6] text-ink-400">
                İlan açarken formu yarım bırakman gerekirse “Taslak Kaydet”
                diyebilirsin; kaydettiğin taslak burada görünür.
              </p>
              <ButtonLink
                href="/ilan-ac"
                variant="secondary"
                size="sm"
                className="mt-4"
              >
                İlan açmaya başla
              </ButtonLink>
            </div>
          ) : (
            (() => {
              const ozet = taslakOzeti(taslak);
              const zamanMetni = taslakZamanMetni(ozet.kaydedildi);
              return (
                <>
                  <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-4">
                    <div className="min-w-[200px] flex-1">
                      <div className="text-[15px] font-bold text-ink-900">
                        {ozet.baslik}
                      </div>
                      <div className="mt-[3px] text-[12.5px] font-medium text-ink-400">
                        {ozet.kategori} · {ozet.fiyat}
                        {/* Damgası olmayan eski taslaklarda tarih hiç
                            yazılmaz; uydurma tarih göstermektense boş
                            bırakmak doğrudur. */}
                        {zamanMetni ? ` · ${zamanMetni}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-none flex-wrap gap-2">
                      <ButtonLink
                        href="/ilan-ac?taslak=yukle"
                        variant="primary"
                        size="sm"
                      >
                        Düzenlemeye devam et
                      </ButtonLink>
                      {taslakSilSoru ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={taslagiKaldir}
                          >
                            Evet, sil
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setTaslakSilSoru(false)}
                          >
                            Vazgeç
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setTaslakSilSoru(true)}
                        >
                          Sil
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3.5 text-[12px] font-medium leading-[1.6] text-ink-400">
                    Taslak yalnızca bu tarayıcıda tutulur: başka cihazdan
                    görünmez ve tarayıcı verisini silersen kaybolur. Fotoğraf
                    ve videolar taslağa kaydedilmez, onları yeniden eklemen
                    gerekir.
                  </p>
                </>
              );
            })()
          )}
        </section>
      )}

      {/* ── Gelen Sunumlar — kendi ilanıma satıcıların gönderdikleri ── */}
      {tab === "gelen" && (
        <section className="mt-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-end gap-2">
            <ButtonLink
              href="/sunum-karsilastirma"
              variant="lime"
              size="sm"
              className="min-h-[42px] text-[14px]"
            >
              ⇄ Sunum Karşılaştırma
            </ButtonLink>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gelenler.map((s) => {
              // Her sunum kendi talebiyle karşılaştırılır — birden fazla
              // talebe sunum gelmişse hepsi aynı ilana göre ölçülemez.
              const sunumunTalebi = getTalep(s.talepId);
              const satirlar = kunyeSatirlari(s, sunumunTalebi);
              const { uyan, toplam, farkli } = eslesmeOzeti(
                satirlar,
                sunumunTalebi,
              );
              return (
                <Link
                  key={s.id}
                  href={`/sunum-detay?id=${encodeURIComponent(s.id)}`}
                  className="group flex flex-col overflow-hidden rounded-card border border-border bg-card transition-colors hover:border-primary"
                >
                  <div className="ref-image relative flex aspect-[3/4] items-center justify-center">
                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-ink-900/[0.82] px-2 py-1 text-[10.5px] font-semibold text-white">
                      {s.fotolar} foto{s.video ? " · video" : ""}
                    </span>
                    <span
                      className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        farkli.length === 0
                          ? "bg-accent text-ink-900"
                          : "bg-primary-soft text-primary-hover"
                      }`}
                    >
                      {uyan}/{toplam} uyuyor
                    </span>
                    <span className="font-mono text-[10.5px] text-ink-400">
                      sunum görseli
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <div className="text-[19px] font-extrabold text-primary-hover">
                      {fiyatText(s.fiyatNum)}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-ink-900">
                      {s.satici}{" "}
                      <span className="font-bold text-star-ink">★ {s.puan}</span>
                    </div>
                    {/* Sabit yükseklikler: "Sunumu incele" her kartta aynı hizada. */}
                    <p className="mt-1.5 line-clamp-2 h-[38px] text-[13.5px] font-medium leading-snug text-ink-700">
                      {s.baslik}
                    </p>
                    <div className="mt-2 line-clamp-2 h-[34px] text-[12.5px] font-medium leading-snug text-ink-400">
                      {s.durum} · {s.teslim} · {s.ne}
                    </div>
                    <div className="mt-1.5 line-clamp-1 h-[17px] text-[12.5px] font-semibold leading-[17px] text-danger">
                      {farkli.length > 0
                        ? `⚠ ${farkli.map((r) => r.k).join(", ")} farklı`
                        : ""}
                    </div>
                    {/* Alıcının yanıt süresi: 2 gün içinde karar verilmezse
                        sunum kendiliğinden düşer. */}
                    {(() => {
                      const kalan = sunumYanitKalanMs(s);
                      if (!kalan) return null;
                      const saat = Math.ceil(kalan / 3_600_000);
                      return (
                        <span className="mt-1.5 text-[12px] font-bold text-acil">
                          Yanıt için {saat > 24 ? `${Math.ceil(saat / 24)} gün` : `${saat} saat`} kaldı
                        </span>
                      );
                    })()}
                    <span className="mt-3 text-[13px] font-bold text-primary group-hover:text-primary-hover">
                      Sunumu incele ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sunumlarım ── */}
      {tab === "sunumlar" && (
        <section className="mt-3">
          {/* Kart ölçüsü Taleplerim sekmesiyle birebir aynı. */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {sunumlarimListesi.map((s) => (
              <article
                key={s.id}
                className="relative flex flex-col overflow-hidden rounded-card border border-border bg-card transition-colors hover:border-primary"
              >
                <div className="ref-image relative flex aspect-[3/4] items-center justify-center">
                  <span className="font-mono text-[10px] text-ink-400">
                    sunum görseli
                  </span>
                  <span className={`absolute left-2.5 top-2.5 ${pill} ${s.stCls}`}>
                    {s.st}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {/* Kartın tamamı ilanın inceleme sayfasına gider. */}
                  <Link
                    href={`/sunum-detay?id=${encodeURIComponent(s.id)}`}
                    className="text-[13.5px] font-bold leading-snug text-ink-900 after:absolute after:inset-0 after:content-[''] hover:text-primary"
                  >
                    {getTalep(s.talepId)?.baslik ?? s.sunum.baslik}
                  </Link>
                  <div className="mt-1.5 text-[11.5px] font-medium text-ink-400">
                    İlan sahibi:{" "}
                    <span className="font-semibold text-ink-900">
                      {s.sahibi}
                    </span>{" "}
                    · {s.tarih}
                  </div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-ink-400">
                    Alıcının fiyatı:{" "}
                    <span className="font-bold text-ink-900">
                      {fiyatText(getTalep(s.talepId)?.fiyatNum ?? 0)}
                    </span>
                  </div>
                  <p className="mt-2 text-[11.5px] font-medium leading-snug text-ink-400">
                    {s.not}
                  </p>
                  <div className="relative z-10 mt-auto flex flex-col gap-2 pt-3.5">
                    {s.aksiyon ? (
                      <ButtonLink
                        href={s.aksiyon.href}
                        variant={s.aksiyon.variant}
                        size="sm"
                        className="w-full"
                      >
                        {s.aksiyon.label}
                      </ButtonLink>
                    ) : (
                      <span className="block rounded-xl bg-page py-2.5 text-center text-[12px] font-semibold text-ink-400">
                        Yanıt bekleniyor
                      </span>
                    )}
                    {/* Alıcı karar vermeden satıcı sunumunu geri çekebilir. */}
                    {(s.sonuc ?? "beklemede") === "beklemede" && (
                      <SunumGeriCek sunumId={s.id} />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Favorilerim ── */}
      {tab === "takip" && (
        <section className="mt-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {takipEttiklerim.map((t) => (
              <TalepCard key={t.id} talep={t} favoride />
            ))}
          </div>
        </section>
      )}

      {/* ── Değerlendirmeler ── */}
      {tab === "yorumlar" && (
        <section className="mt-3">
          <div className="mb-3.5 flex items-center gap-2 text-[13px] font-semibold text-ink-500">
            <span className="text-[15px] font-extrabold text-star-ink">
              ★ {puan.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}
            </span>
            <span>
              · {degerlendirmeSayisi} değerlendirme — alım ve satış
              işlemlerinden
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {yorumlarim.map((y) => (
              <article
                key={`${y.yazan}-${y.urun}`}
                className="rounded-card border border-border bg-card px-[18px] py-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-soft text-[11.5px] font-bold text-primary-hover">
                    {y.harf}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={profilYolu(y.yazan, aktif.kullanici)}
                        className="text-[13.5px] font-bold text-ink-900 hover:text-primary"
                      >
                        {y.yazan}
                      </Link>
                    </div>
                    <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                      {y.urun} · {y.tarih}
                    </div>
                  </div>
                  <span className="flex-none text-[13px] font-bold text-star-ink">
                    {"★".repeat(y.puan)}
                    {"☆".repeat(5 - y.puan)}
                  </span>
                </div>
                <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink-700">
                  {y.text}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
        </div>
      </div>
    </main>
  );
}
