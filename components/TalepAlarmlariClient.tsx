"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { kategoriler, binlikAyir, URUN_DURUMLARI } from "@/lib/data";
import { ilAdlari, ilceler } from "@/lib/turkiye-il-ilce";
import { kategoriIkonlar } from "@/components/KategoriIkon";
import { SecimKutusu } from "@/components/ui/SecimKutusu";
import {
  RENKLER,
  cesitlerFor,
  markalarFor,
  modelEtiketi,
  modelSlotuCinsiyetMi,
  modellerFor,
  turlerFor,
  yilEtiketi,
  yilSecenekleriFor,
  yilSlotuBedenMi,
} from "@/lib/urun-agaci";

type Alarm = {
  id: string;
  ad: string;
  kriterler: string[];
  aktif: boolean;
  eslesme: number;
  son: { baslik: string; fiyat: string; zaman: string; href: string } | null;
  kanal: string;
};

const ilkAlarmlar: Alarm[] = [];

/** Bir alarmda tutulabilecek en fazla anahtar kelime sayısı. */
const EN_FAZLA_KELIME = 30;

/** Listede doğrudan görünen kelime sayısı; kalanı "…" altında saklanır. */
const GORUNEN_KELIME = 5;

/** Bir alarmın kapsayabileceği en fazla konum sayısı. */
const EN_FAZLA_KONUM = 5;

/** İlçe kutusundaki kapsayıcı seçenek — o ilin tamamı. */
const TUM_ILCELER = "Tüm ilçeler";

/** Konum satırı — ilce boşsa il'in tamamı kapsanır. */
type Konum = { il: string; ilce: string };

/** Çipte ve kriterlerde görünen tek satırlık ad. */
function konumEtiketi(k: Konum): string {
  return k.ilce ? `${k.il} · ${k.ilce}` : `${k.il} (tüm ilçeler)`;
}

// Alarm filtresi — İlan Aç formundaki detaylarla aynı seçenekler.
const durumSecenekleri = [...URUN_DURUMLARI];
// "Farketmez" listenin tamamını kapsar; ürün durumundaki "Hepsi" ile aynı rol.
const defoSecenekleri = [
  { v: "defosuz", l: "Defosuz" },
  { v: "defolu", l: "Defolu da olur" },
] as const;
type DefoSecim = (typeof defoSecenekleri)[number]["v"];

/**
 * Kategori seçim kutusu — tek kategori seçilir. Bir alarm yalnızca bir
 * kategoriyi kapsar: satıcı başka kategori için ayrı alarm kurar (ve
 * ayrı ödemesini yapar). Escape ve dışarı tıklamada kapanır.
 */
function KategoriSecici({
  secili,
  onDegis,
}: {
  secili: string;
  onDegis: (yeni: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full box-border items-center justify-between gap-2 rounded-[11px] border-[1.5px] px-[13px] py-3 text-left text-[14px] font-medium outline-none ${
          open ? "border-accent-ink" : "border-border-input"
        } ${secili ? "text-ink-900" : "text-ink-300"}`}
      >
        <span className="truncate">{secili || "Kategori seç"}</span>
        <span
          className={`flex-none text-[10px] text-ink-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-card border border-border bg-card shadow-pop"
        >
          <div className="max-h-[248px] overflow-y-auto py-1">
            {kategoriler.map((k) => {
              const aktif = secili === k.ad;
              const Ikon = kategoriIkonlar[k.ad];
              return (
                <button
                  key={k.ad}
                  type="button"
                  role="option"
                  aria-selected={aktif}
                  onClick={() => {
                    // Aynı kategoriye tekrar tıklamak seçimi kaldırır.
                    onDegis(aktif ? "" : k.ad);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-[9px] text-left text-[13.5px] hover:bg-subtle ${
                    aktif
                      ? "bg-accent-soft font-bold text-accent-ink"
                      : "font-semibold text-ink-700"
                  }`}
                >
                  {Ikon && (
                    <Ikon className="h-[17px] w-[17px] flex-none text-ink-500" />
                  )}
                  {k.ad}
                  {aktif && <span className="ml-auto flex-none">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TalepAlarmlariClient() {
  const [alarmlar, setAlarmlar] = useState<Alarm[]>(ilkAlarmlar);

  // Alarmlar sunucuda saklanır; sayfa yenilenince kaybolmaz.
  useEffect(() => {
    let iptal = false;
    fetch("/api/alarmlar")
      .then((r) => (r.ok ? r.json() : { alarmlar: [] }))
      .then((v: { alarmlar?: Alarm[] }) => {
        if (!iptal) setAlarmlar(v.alarmlar ?? []);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  // Form — kategori çoklu seçilir; ürün durumu da çoklu seçilebilir.
  // Bir alarm tek kategoriyi kapsar; başka kategori için ayrı alarm kurulur.
  const [kategori, setKategori] = useState("");
  // Anahtar kelimeler — Enter ya da virgülle eklenir, en fazla EN_FAZLA_KELIME tane.
  const [kelime, setKelime] = useState("");
  const [kelimeler, setKelimeler] = useState<string[]>([]);
  // "…" kutucuğu: üstüne gelince kalan kelimeler görünür, tıklayınca sabitlenir.
  const [kelimelerAcik, setKelimelerAcik] = useState(false);
  // Ürün detayları — İlan Aç formundaki zincirin aynısı; seçilen
  // kategorinin ürün ağacından beslenir.
  const [tur, setTur] = useState("");
  const [cesit, setCesit] = useState("");
  const [marka, setMarka] = useState("");
  const [model, setModel] = useState("");
  const [yil, setYil] = useState("");
  const [renk, setRenk] = useState("");
  const [minFiyat, setMinFiyat] = useState("");
  const [maxFiyat, setMaxFiyat] = useState("");
  // Konumlar — en fazla EN_FAZLA_KONUM tane il/ilçe çifti. Liste boşken
  // alarm tüm Türkiye'yi kapsar; il seçilip ilçe boş bırakılırsa o ilin
  // tamamı kapsanır.
  const [konumlar, setKonumlar] = useState<Konum[]>([]);
  const [il, setIl] = useState("");
  const [ilce, setIlce] = useState("");
  // Boş liste = "Hepsi": kapsayıcı seçenek ayrı bir bayrak değil, listenin
  // boş hali. Böylece iki state'in birbiriyle çelişmesi mümkün olmuyor.
  const [durumlar, setDurumlar] = useState<string[]>([]);
  const hepsiDurum = durumlar.length === 0;
  // Aynı kural: boş liste = "Farketmez".
  const [defolar, setDefolar] = useState<DefoSecim[]>([]);
  const hepsiDefo = defolar.length === 0;
  // Muadil ürün: alıcı birebir aynısı yerine muadilini de kabul ediyor mu?
  const [muadil, setMuadil] = useState<boolean | null>(null);
  const [kanalApp, setKanalApp] = useState(true);
  const [kanalMail, setKanalMail] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  /** Kayıt başarısızsa gerekçe — sessiz başarısızlık olmasın. */
  const [kayitHatasi, setKayitHatasi] = useState("");

  const toastT = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => () => {
    if (toastT.current) clearTimeout(toastT.current);
  }, []);

  const turler = kategori ? turlerFor(kategori) : [];
  const cesitler = tur ? cesitlerFor(kategori, tur) : [];
  const markalar = cesit ? markalarFor(kategori, tur, cesit) : [];
  const modeller = marka ? modellerFor(kategori, tur, cesit, marka) : [];
  const yilSecenekleri = kategori ? yilSecenekleriFor(kategori) : [];
  const renkSecenekleri = [...RENKLER];

  /** Kategori seçimi değişince ürün zinciri baştan kurulur. */
  function kategoriyiDegistir(yeni: string) {
    setKategori(yeni);
    setTur("");
    setCesit("");
    setMarka("");
    setModel("");
    setYil("");
    setRenk("");
  }

  const alarmSayisi = alarmlar.length;
  const haftalikEslesme = alarmlar.reduce(
    (t, a) => t + (a.aktif ? a.eslesme : 0),
    0,
  );
  const kaydetOk = kategori !== "" && (kanalApp || kanalMail);

  /** Yazılanı listeye ekler; tekrarları ve sınır aşımını sessizce yutar. */
  function kelimeEkle(ham: string) {
    const yeni = ham.trim().slice(0, 40);
    if (!yeni) return;
    setKelimeler((prev) =>
      prev.length >= EN_FAZLA_KELIME ||
      prev.some((k) => k.toLocaleLowerCase("tr") === yeni.toLocaleLowerCase("tr"))
        ? prev
        : [...prev, yeni],
    );
    setKelime("");
  }

  /** Seçili il/ilçe ikilisini konum listesine ekler. */
  function konumEkle() {
    if (!il) return;
    setKonumlar((prev) => {
      if (prev.length >= EN_FAZLA_KONUM) return prev;
      // Aynı çift ikinci kez eklenmez; ilin tamamı seçilirse o ilin
      // tekil ilçeleri listede kalmaz (zaten kapsanıyorlar).
      if (prev.some((k) => k.il === il && k.ilce === ilce)) return prev;
      const temiz = ilce ? prev : prev.filter((k) => k.il !== il);
      if (!ilce && prev.some((k) => k.il === il && !k.ilce)) return prev;
      return [...temiz, { il, ilce }];
    });
    setIl("");
    setIlce("");
  }

  function konumSil(hedef: Konum) {
    setKonumlar((prev) =>
      prev.filter((k) => !(k.il === hedef.il && k.ilce === hedef.ilce)),
    );
  }

  function kelimeSil(k: string) {
    setKelimeler((prev) => {
      const yeni = prev.filter((x) => x !== k);
      // Kalanlar tek satıra sığıyorsa açık kalmasına gerek yok.
      if (yeni.length <= GORUNEN_KELIME) setKelimelerAcik(false);
      return yeni;
    });
  }

  /**
   * Ürün durumu seçimi. "Hepsi" açıkken tekil bir seçeneğe basmak Hepsi'yi
   * bırakır ve yalnızca o seçeneği işaretler. Tekillerin tamamı seçilirse
   * anlamı zaten "hepsi" olduğu için Hepsi kutucuğu devralır; hiçbiri
   * kalmazsa da yine Hepsi'ye döner.
   */
  function durumToggle(d: string) {
    setDurumlar((prev) => {
      const yeni = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d];
      // Tekillerin tamamı seçilince anlamı "hepsi" olur → kapsayıcıya döner.
      return yeni.length === durumSecenekleri.length ? [] : yeni;
    });
  }

  /** Ürün defosu — "Farketmez" ile aynı devir kuralı. */
  function defoToggle(d: DefoSecim) {
    setDefolar((prev) => {
      const yeni = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d];
      return yeni.length === defoSecenekleri.length ? [] : yeni;
    });
  }

  async function durdur(id: string) {
    const hedef = alarmlar.find((a) => a.id === id);
    if (!hedef) return;
    setAlarmlar((prev) =>
      prev.map((a) => (a.id === id ? { ...a, aktif: !a.aktif } : a)),
    );
    const r = await fetch(`/api/alarmlar/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !hedef.aktif }),
    }).catch(() => undefined);
    // Sunucu reddederse ekranı geri al.
    if (!r?.ok)
      setAlarmlar((prev) =>
        prev.map((a) => (a.id === id ? { ...a, aktif: hedef.aktif } : a)),
      );
  }

  async function sil(id: string) {
    const yedek = alarmlar;
    setAlarmlar((prev) => prev.filter((a) => a.id !== id));
    const r = await fetch(`/api/alarmlar/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => undefined);
    if (!r?.ok) setAlarmlar(yedek);
  }

  function kaydet() {
    if (!kaydetOk) return;
    const kriterler: string[] = [kategori];
    if (tur.trim()) kriterler.push(tur.trim());
    if (cesit.trim()) kriterler.push(cesit.trim());
    if (marka.trim()) kriterler.push(marka.trim());
    if (model.trim()) kriterler.push(model.trim());
    if (renk.trim()) kriterler.push(renk.trim());
    if (yil.trim()) kriterler.push(yil.trim());
    // Kaydederken kutuda yazılı kalan kelime de listeye dahil edilir.
    const tumKelimeler = [
      ...kelimeler,
      ...(kelime.trim() ? [kelime.trim()] : []),
    ].slice(0, EN_FAZLA_KELIME);
    for (const k of tumKelimeler) kriterler.push(`"${k}"`);
    if (!hepsiDurum && durumlar.length)
      kriterler.push(durumlar.join(" / "));
    if (muadil !== null)
      kriterler.push(muadil ? "muadil olur" : "muadil olmaz");
    if (!hepsiDefo) {
      if (defolar.includes("defosuz")) kriterler.push("defosuz");
      if (defolar.includes("defolu")) kriterler.push("defolu olabilir");
    }
    const enAz = minFiyat.trim();
    const enCok = maxFiyat.trim();
    if (enAz && enCok) kriterler.push(`${enAz}–${enCok} TL`);
    else if (enAz) kriterler.push(`${enAz} TL üzeri`);
    else if (enCok) kriterler.push(`${enCok} TL altı`);
    // Kaydederken kutuda seçili kalan il de listeye dahil edilir.
    const tumKonumlar = [
      ...konumlar,
      ...(il && !konumlar.some((k) => k.il === il && k.ilce === ilce)
        ? [{ il, ilce }]
        : []),
    ].slice(0, EN_FAZLA_KONUM);
    kriterler.push(
      tumKonumlar.length
        ? tumKonumlar.map(konumEtiketi).join(" / ")
        : "Tüm Türkiye",
    );

    const kanal =
      [kanalApp ? "Uygulama" : null, kanalMail ? "E-posta" : null]
        .filter(Boolean)
        .join(" + ") || "Uygulama";

    const ana = kategori;
    const etiket = marka.trim() || tumKelimeler[0] || "";

    void (async () => {
      const r = await fetch("/api/alarmlar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad: ana + (etiket ? " — " + etiket : ""),
          kriterler,
          // Eşleşme sunucuda bu yapısal filtreyle aranır.
          filtre: {
            kategori,
            tur,
            cesit,
            marka,
            model,
            yil,
            renk,
            kelimeler: tumKelimeler,
            durumlar,
            defolar,
            muadil,
            minFiyat: minFiyat.trim() ? Number(minFiyat) : null,
            maxFiyat: maxFiyat.trim() ? Number(maxFiyat) : null,
            konumlar: tumKonumlar,
          },
          kanal,
          kanallar: { uygulama: kanalApp, eposta: kanalMail },
          // E-posta adresi gönderilmez: sunucu hesabın kaydından okur.
        }),
      }).catch(() => undefined);

      // SIFIRLAMA VE BİLDİRİM YANITTAN SONRA.
      //
      // Eskiden ikisi de bu bloğun DIŞINDA, senkron çalışıyordu: istek
      // başarısız olsa bile kullanıcı "Kaydedildi" görüyor ve onlarca
      // kriterle doldurduğu formu kaybediyordu. Yanlış bilgi ve veri
      // kaybı bir aradaydı.
      const v = (await r?.json().catch(() => ({}))) as {
        hata?: string;
        alarm?: Alarm;
      };
      if (!r?.ok || !v.alarm) {
        setKayitHatasi(v?.hata ?? "Alarm kaydedilemedi. Tekrar dene.");
        return;
      }

      setKayitHatasi("");
      setAlarmlar((prev) => [v.alarm!, ...prev]);

      setKategori("");
      setKelime("");
      setKelimeler([]);
      setKelimelerAcik(false);
      setTur("");
      setCesit("");
      setMarka("");
      setModel("");
      setYil("");
      setRenk("");
      setMinFiyat("");
      setMaxFiyat("");
      setKonumlar([]);
      setIl("");
      setIlce("");
      setDurumlar([]);
      setDefolar([]);
      setMuadil(null);
      setKaydedildi(true);
      if (toastT.current) clearTimeout(toastT.current);
      toastT.current = setTimeout(() => setKaydedildi(false), 4000);
    })();
  }

  const labelCls = "mb-2 block text-[13.5px] font-bold text-ink-900";
  const inputCls =
    "w-full box-border rounded-[11px] border-[1.5px] border-border-input px-[13px] py-3 text-[14px] font-medium text-ink-900 outline-none focus:border-accent-ink";
  const chipActive =
    "flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-accent bg-accent-soft px-3 py-[9px] text-[13px] font-bold text-accent-ink";
  const chipPassive =
    "flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-border-input bg-card px-3 py-[9px] text-[13px] font-semibold text-ink-500 hover:border-accent-ink hover:text-accent-ink";

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[18px]">
      {/* Breadcrumb */}
      <nav className="py-1.5 pb-3.5 text-[13px] font-medium text-ink-500">
        <Link href="/profil" className="text-ink-400 hover:text-primary">
          Profilim
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">Talep Alarmı</span>
      </nav>

      {/* Başlık ile "nasıl çalışır?" kutusu aynı satırda; alttaki grid ile
          aynı sütun ölçüsünü kullanır ki iki sütun tam hizalansın. */}
      <div className="mb-5 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
            Talep Alarmı
          </h1>
          <p className="mt-1.5 max-w-[640px] text-[14.5px] font-medium leading-relaxed text-ink-700">
            Kriterlerini belirle ve kaydet; eşleşen bir talep yayınlandığı anda
            bildirim al. Dükkânda müşteri beklemek yerine, satın almaya hazır
            alıcıların taleplerine doğrudan ulaş.
          </p>
          {/* Liste başlığı burada duruyor ki alttaki alarm kutucukları
              sağdaki "Yeni Alarm Oluştur" kutusuyla tam hizalansın. */}
          <div className="mt-5 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold text-ink-900">
              Alarmların <span className="text-accent-ink">({alarmSayisi})</span>
            </h2>
            <span className="text-[13px] font-medium text-ink-500">
              Bu hafta toplam{" "}
              <strong className="text-accent-ink">
                {haftalikEslesme} eşleşme
              </strong>
            </span>
          </div>
        </div>
        {/* "Nasıl çalışır?" — başlıkla aynı hizada */}
        <div className="rounded-card bg-accent p-[18px] text-ink-900">
          <div className="text-[15px] font-extrabold">
            Talep Alarmı nasıl çalışır?
          </div>
          <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-accent-ink">
            Bir alıcı, belirlediğin kriterlere uygun bir talep oluşturduğunda
            anında bildirim alırsın. Talebe erken sunum gönderen satıcıların
            satışa ulaşma oranı <strong className="text-ink-900">3 kat</strong>{" "}
            daha yüksektir. Daha fazla kategori ve kriter için alarm
            oluşturarak daha çok talebi zamanında yakalayabilirsin.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── SOL: alarm listesi ── */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {alarmlar.length === 0 ? (
            <div className="rounded-card border border-dashed border-border-input bg-card px-6 py-14 text-center">
              <div className="text-[15px] font-bold text-ink-900">
                Henüz alarmın yok
              </div>
              <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium text-ink-500">
                Sağdaki formdan ilk alarmını kur — eşleşen talep düştüğünde
                bildirim gönderelim.
              </p>
            </div>
          ) : (
            alarmlar.map((a) => (
              <article
                key={a.id}
                className={`rounded-card border border-border p-[18px] transition-colors ${
                  a.aktif ? "bg-card" : "bg-subtle/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[15px] ${
                      a.aktif ? "bg-primary-soft" : "bg-page opacity-60 grayscale"
                    }`}
                  >
                    🔔
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`truncate text-[14.5px] font-bold leading-tight ${
                        a.aktif ? "text-ink-900" : "text-ink-500"
                      }`}
                    >
                      {a.ad}
                    </h3>
                    <div className="mt-1 truncate text-[13px] font-medium text-ink-500">
                      {a.kriterler.join("  ·  ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={a.aktif}
                    aria-label={a.aktif ? "Alarmı duraklat" : "Alarmı aç"}
                    onClick={() => durdur(a.id)}
                    className={`relative mt-0.5 h-[22px] w-[38px] flex-none cursor-pointer rounded-full transition-colors ${
                      a.aktif ? "bg-accent" : "bg-border-input"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all ${
                        a.aktif ? "left-[18px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => sil(a.id)}
                    title="Alarmı sil"
                    className="-mr-1 flex-none cursor-pointer p-1.5 text-[15px] font-semibold text-ink-500 hover:text-danger"
                  >
                    ✕
                  </button>
                </div>

                {a.son ? (
                  <Link
                    href={a.son.href}
                    className="mt-3 flex items-center gap-2.5 rounded-[11px] border border-hairline bg-subtle px-3 py-2.5 transition-colors hover:border-primary"
                  >
                    <span className="flex-none rounded-md bg-accent px-1.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-ink-900">
                      Eşleşme
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink-900">
                      {a.son.baslik}
                    </span>
                    <span className="flex-none text-[13.5px] font-extrabold text-accent-ink">
                      {a.son.fiyat}
                    </span>
                    <span className="hidden flex-none text-[12.5px] font-medium text-ink-500 sm:block">
                      {a.son.zaman}
                    </span>
                  </Link>
                ) : a.aktif ? (
                  <div className="mt-3 rounded-[11px] border border-dashed border-border-input px-3 py-2.5 text-[13px] font-medium text-ink-500">
                    Henüz eşleşme yok — uyan ilk talepte haber vereceğiz.
                  </div>
                ) : null}

                <div className="mt-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-ink-500">
                  <span className={a.aktif ? "text-accent-ink" : "text-ink-500"}>
                    {a.aktif
                      ? a.eslesme > 0
                        ? `${a.eslesme} eşleşme/hafta`
                        : "Eşleşme bekleniyor"
                      : "Duraklatıldı"}
                  </span>
                  <span className="text-ink-300" aria-hidden>
                    ·
                  </span>
                  <span>{a.kanal}</span>
                </div>
              </article>
            ))
          )}
        </div>

        {/* ── SAĞ: yeni alarm formu ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          <div className="rounded-card border border-border bg-card p-5">
            <div className="text-[16.5px] font-extrabold text-ink-900">
              Yeni Alarm Oluştur
            </div>

            {/* Kategori — tek seçim; bir alarm tek kategori kapsar */}
            <div className="mt-4 mb-2 flex items-baseline justify-between gap-2">
              <label className="text-[13.5px] font-bold text-ink-900">
                Kategori
              </label>
              {kategori && (
                <button
                  type="button"
                  onClick={() => kategoriyiDegistir("")}
                  className="text-[12.5px] font-semibold text-ink-400 hover:text-primary"
                >
                  Seçimi temizle
                </button>
              )}
            </div>
            <KategoriSecici secili={kategori} onDegis={kategoriyiDegistir} />
            <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink-400">
              Her alarm tek kategoriyi kapsar. Başka kategoriyi de takip etmek
              istersen, o kategori için ayrı bir alarm kur.
            </p>

            {/* Ürün detayları — İlan Aç formundaki Tür → Çeşit → Marka →
                Model → Yıl → Renk zincirinin aynısı; seçilen kategoriye
                göre dolar. */}

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="al-tur" className={labelCls}>
                  Tür
                </label>
                <SecimKutusu
                  id="al-tur"
                  deger={tur}
                  onDegis={(v) => {
                    setTur(v);
                    setCesit("");
                    setMarka("");
                    setModel("");
                  }}
                  secenekler={turler}
                  placeholder="Tür seç"
                  serbestPlaceholder="örn. Plak, Konsol, Kol saati"
                  kapali={!kategori}
                  kapaliMetin="Önce kategori seç"
                  kompakt
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="al-cesit" className={labelCls}>
                  Çeşit
                </label>
                <SecimKutusu
                  id="al-cesit"
                  deger={cesit}
                  onDegis={(v) => {
                    setCesit(v);
                    setMarka("");
                    setModel("");
                  }}
                  secenekler={cesitler}
                  placeholder="Çeşit seç"
                  serbestPlaceholder="örn. Dizüstü, Masaüstü"
                  kapali={!tur}
                  kapaliMetin="Önce tür seç"
                  kompakt
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="al-marka" className={labelCls}>
                  Marka
                </label>
                <SecimKutusu
                  id="al-marka"
                  deger={marka}
                  onDegis={(v) => {
                    setMarka(v);
                    setModel("");
                  }}
                  secenekler={markalar}
                  placeholder="Marka seç"
                  serbestPlaceholder="örn. Apple, Sega, The Weeknd"
                  kapali={!cesit}
                  kapaliMetin="Önce çeşit seç"
                  kompakt
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="al-model" className={labelCls}>
                  {modelEtiketi(kategori)}
                </label>
                <SecimKutusu
                  id="al-model"
                  deger={model}
                  onDegis={setModel}
                  secenekler={modeller}
                  placeholder={
                    modelSlotuCinsiyetMi(kategori)
                      ? "Cinsiyet seç"
                      : "Model seç"
                  }
                  serbestPlaceholder={
                    modelSlotuCinsiyetMi(kategori)
                      ? "örn. Kadın, Unisex"
                      : "örn. MacBook Air, 3310"
                  }
                  kapali={!marka}
                  kapaliMetin="Önce marka seç"
                  kompakt
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="al-yil" className={labelCls}>
                  {yilEtiketi(kategori)}
                </label>
                <SecimKutusu
                  id="al-yil"
                  deger={yil}
                  onDegis={setYil}
                  secenekler={yilSecenekleri}
                  placeholder={
                    yilSlotuBedenMi(kategori) ? "Beden seç" : "Yıl seç"
                  }
                  kapali={!kategori}
                  kapaliMetin="Önce kategori seç"
                  kompakt
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="al-renk" className={labelCls}>
                  Renk
                </label>
                <SecimKutusu
                  id="al-renk"
                  deger={renk}
                  onDegis={setRenk}
                  secenekler={renkSecenekleri}
                  placeholder="Renk seç"
                  kompakt
                  inputCls={inputCls}
                />
              </div>
            </div>

            {/* Anahtar kelimeler — Enter ya da virgülle eklenir */}
            <div className="mt-3.5 mb-2 flex items-baseline justify-between gap-2">
              <label
                htmlFor="al-kelime"
                className="text-[13.5px] font-bold text-ink-900"
              >
                Anahtar kelime
              </label>
              <span className="text-[12.5px] font-semibold text-ink-400">
                {kelimeler.length}/{EN_FAZLA_KELIME}
              </span>
            </div>
            <input
              id="al-kelime"
              value={kelime}
              onChange={(e) => setKelime(e.target.value.slice(0, 40))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  kelimeEkle(kelime);
                } else if (e.key === "Backspace" && !kelime && kelimeler.length) {
                  // Boş kutuda backspace son kelimeyi geri alır.
                  setKelimeler((prev) => prev.slice(0, -1));
                }
              }}
              onBlur={() => kelimeEkle(kelime)}
              disabled={kelimeler.length >= EN_FAZLA_KELIME}
              placeholder={
                kelimeler.length >= EN_FAZLA_KELIME
                  ? `En fazla ${EN_FAZLA_KELIME} kelime`
                  : "örn. imzalı, ilk baskı, kutulu..."
              }
              className={`${inputCls} disabled:cursor-not-allowed disabled:bg-page disabled:text-ink-300`}
            />
            {kelimeler.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(kelimelerAcik
                  ? kelimeler
                  : kelimeler.slice(0, GORUNEN_KELIME)
                ).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => kelimeSil(k)}
                    title="Kaldır"
                    className={chipActive}
                  >
                    {k}
                    <span className="text-[11px] text-ink-500" aria-hidden>
                      ✕
                    </span>
                  </button>
                ))}

                {/* Kalanlar tek kutucukta: üstüne gelince balonda görünür,
                    tıklayınca hepsi açılıp tek tek silinebilir hale gelir. */}
                {kelimeler.length > GORUNEN_KELIME && (
                  <div className="group relative">
                    <button
                      type="button"
                      aria-expanded={kelimelerAcik}
                      onClick={() => setKelimelerAcik((v) => !v)}
                      className={chipPassive}
                    >
                      {kelimelerAcik
                        ? "− daha az"
                        : `… +${kelimeler.length - GORUNEN_KELIME}`}
                    </button>
                    {!kelimelerAcik && (
                      <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-20 hidden w-[260px] rounded-card border border-border bg-card p-2.5 shadow-pop group-hover:block">
                        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-[0.6px] text-ink-400">
                          Diğer kelimeler
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {kelimeler.slice(GORUNEN_KELIME).map((k) => (
                            <span
                              key={k}
                              className="rounded-full bg-subtle px-2 py-[3px] text-[12px] font-semibold text-ink-700"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1.5 text-[11.5px] font-medium text-ink-400">
                          Silmek için tıkla ve listeyi aç.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="mt-1.5 text-[12.5px] font-medium text-ink-400">
              Eklediğiniz anahtar kelimeler, ilan başlıkları ve
              açıklamalarında taranarak kriterlerinize uygun ilanları daha
              kolay keşfetmenizi sağlar.
            </p>

            {/* Muadil ürün */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Muadil ürün
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { v: true, l: "Evet" },
                { v: false, l: "Hayır" },
              ].map((o) => (
                <button
                  key={o.l}
                  type="button"
                  aria-pressed={muadil === o.v}
                  onClick={() => setMuadil((m) => (m === o.v ? null : o.v))}
                  className={muadil === o.v ? chipActive : chipPassive}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {/* Ürün durumu — çoklu; "Hepsi" kapsayıcı seçenek, hiçbir
                seçenek kilitlenmez (bkz. durumToggle). */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Ürün durumu
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={hepsiDurum}
                onClick={() => setDurumlar([])}
                className={hepsiDurum ? chipActive : chipPassive}
              >
                Hepsi
              </button>
              {durumSecenekleri.map((d) => {
                const aktif = !hepsiDurum && durumlar.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => durumToggle(d)}
                    className={aktif ? chipActive : chipPassive}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Ürün defosu — "Farketmez" kapsayıcı seçenek; ürün
                durumundaki kuralın aynısı geçerli (bkz. defoToggle). */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Ürün defosu
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={hepsiDefo}
                onClick={() => setDefolar([])}
                className={hepsiDefo ? chipActive : chipPassive}
              >
                Farketmez
              </button>
              {defoSecenekleri.map((o) => {
                const aktif = !hepsiDefo && defolar.includes(o.v);
                return (
                  <button
                    key={o.v}
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => defoToggle(o.v)}
                    className={aktif ? chipActive : chipPassive}
                  >
                    {o.l}
                  </button>
                );
              })}
            </div>

            {/* Fiyat aralığı — satıcı, bütçe bandına giren tüm talepleri yakalar */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Fiyat aralığı (TL)
            </label>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                aria-label="En az fiyat (TL)"
                value={binlikAyir(minFiyat)}
                onChange={(e) =>
                  setMinFiyat(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                placeholder="En az"
                className={inputCls}
              />
              <span className="flex-none text-[13px] font-semibold text-ink-500">
                —
              </span>
              <input
                inputMode="numeric"
                aria-label="En çok fiyat (TL)"
                value={binlikAyir(maxFiyat)}
                onChange={(e) =>
                  setMaxFiyat(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                placeholder="En çok"
                className={inputCls}
              />
            </div>

            {/* Şehir / İlçe — 81 ilin tamamı; en fazla EN_FAZLA_KONUM çift */}
            <div className="mt-3.5 mb-2 flex items-baseline justify-between gap-2">
              <label className="text-[13.5px] font-bold text-ink-900">
                Şehir / İlçe
              </label>
              <span className="text-[12.5px] font-semibold text-ink-400">
                {konumlar.length}/{EN_FAZLA_KONUM}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SecimKutusu
                id="al-il"
                deger={il}
                onDegis={(v) => {
                  setIl(v);
                  setIlce("");
                }}
                secenekler={ilAdlari}
                placeholder="Tüm Türkiye"
                kapali={konumlar.length >= EN_FAZLA_KONUM}
                kapaliMetin={`En fazla ${EN_FAZLA_KONUM} konum`}
                kompakt
                inputCls={inputCls}
              />
              <SecimKutusu
                id="al-ilce"
                deger={ilce}
                onDegis={(v) => setIlce(v === TUM_ILCELER ? "" : v)}
                secenekler={il ? [TUM_ILCELER, ...ilceler(il)] : []}
                placeholder={TUM_ILCELER}
                kapali={!il}
                kapaliMetin="Önce şehir seç"
                kompakt
                inputCls={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={konumEkle}
              disabled={!il || konumlar.length >= EN_FAZLA_KONUM}
              className="mt-2 w-full cursor-pointer rounded-[10px] border-[1.5px] border-border-input bg-card p-2.5 text-[13px] font-bold text-ink-700 hover:border-accent-ink hover:text-accent-ink disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:border-border-input"
            >
              + Konum ekle
            </button>
            {konumlar.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {konumlar.map((k) => (
                  <button
                    key={`${k.il}|${k.ilce}`}
                    type="button"
                    onClick={() => konumSil(k)}
                    title="Kaldır"
                    className={chipActive}
                  >
                    {konumEtiketi(k)}
                    <span className="text-[11px] text-ink-500" aria-hidden>
                      ✕
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink-400">
              Hiç konum eklemezsen alarm tüm Türkiye&apos;yi kapsar. İlçeyi boş
              bırakırsan seçtiğin ilin tamamı kapsanır.
            </p>

            {/* Bildirim kanalı */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Bildirim kanalı
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setKanalApp((v) => !v)}
                className={`flex-1 cursor-pointer rounded-[10px] border-[1.5px] p-2.5 text-[13px] font-semibold ${
                  kanalApp
                    ? "border-accent bg-accent-soft font-bold text-accent-ink"
                    : "border-border-input bg-card text-ink-500"
                }`}
              >
                Uygulama{kanalApp ? " ✓" : ""}
              </button>
              <button
                type="button"
                onClick={() => setKanalMail((v) => !v)}
                className={`flex-1 cursor-pointer rounded-[10px] border-[1.5px] p-2.5 text-[13px] font-semibold ${
                  kanalMail
                    ? "border-accent bg-accent-soft font-bold text-accent-ink"
                    : "border-border-input bg-card text-ink-500"
                }`}
              >
                E-posta{kanalMail ? " ✓" : ""}
              </button>
            </div>

            <button
              type="button"
              onClick={kaydet}
              disabled={!kaydetOk}
              className="mt-4 block w-full rounded-control bg-accent p-[15px] text-[15px] font-extrabold text-ink-900 transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#efebf5] disabled:text-ink-300"
            >
              Alarmı Oluştur
            </button>

            {kaydedildi && (
              <div className="mt-2.5 rounded-lg bg-accent-soft px-[11px] py-[9px] text-[13px] font-bold leading-normal text-accent-ink">
                Alarm kuruldu ✓ — eşleşen ilk talepte haber vereceğiz.
              </div>
            )}

            {kayitHatasi && (
              <div
                role="alert"
                className="mt-2.5 rounded-lg bg-danger-soft px-[11px] py-[9px] text-[13px] font-bold leading-normal text-danger"
              >
                {kayitHatasi}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
