"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { kategoriler, iller, binlikAyir } from "@/lib/data";
import { kategoriIkonlar } from "@/components/KategoriIkon";

type Alarm = {
  id: number;
  ad: string;
  kriterler: string[];
  aktif: boolean;
  eslesme: number;
  son: { baslik: string; fiyat: string; zaman: string; href: string } | null;
  kanal: string;
};

const ilkAlarmlar: Alarm[] = [
  {
    id: 1,
    ad: "Müzik & Plak — imzalı",
    kriterler: ["Müzik & Plak", '"imzalı"', "2.000 TL üzeri", "Tüm Türkiye"],
    aktif: true,
    eslesme: 4,
    son: {
      baslik: 'İmzalı The Weeknd "Dawn FM" CD arıyorum',
      fiyat: "4.500 TL",
      zaman: "2 gün önce",
      href: "/ilan/dawn-fm-imzali-cd",
    },
    kanal: "Uygulama + E-posta",
  },
  {
    id: 2,
    ad: "Retro Elektronik",
    kriterler: ["Elektronik", '"kutulu"', "Ankara"],
    aktif: true,
    eslesme: 2,
    son: {
      baslik: "Nokia 3310 arıyorum — kutulu, çalışır",
      fiyat: "1.500 TL",
      zaman: "5 gün önce",
      href: "/ilan/nokia-3310-kutulu",
    },
    kanal: "Uygulama",
  },
  {
    id: 3,
    ad: "Plak — ilk baskı",
    kriterler: ["Müzik & Plak", '"ilk baskı"', "3.000 TL üzeri"],
    aktif: false,
    eslesme: 0,
    son: null,
    kanal: "E-posta",
  },
];

// Alarm filtresi — İlan Aç formundaki detaylarla aynı seçenekler.
const durumSecenekleri = ["Kutusu açılmamış", "Az kullanılmış", "Kullanılmış"];
const defoSecenekleri = [
  { v: "farketmez", l: "Farketmez" },
  { v: "defosuz", l: "Defosuz" },
  { v: "defolu", l: "Defolu da olur" },
] as const;
type DefoSecim = (typeof defoSecenekleri)[number]["v"];

export function TalepAlarmlariClient() {
  const [alarmlar, setAlarmlar] = useState<Alarm[]>(ilkAlarmlar);

  // Form — kategori TEK seçilir; ürün durumu çoklu seçilebilir.
  const [seciliKat, setSeciliKat] = useState<string | null>(null);
  const [kelime, setKelime] = useState("");
  const [marka, setMarka] = useState("");
  const [model, setModel] = useState("");
  const [yil, setYil] = useState("");
  const [renk, setRenk] = useState("");
  const [minFiyat, setMinFiyat] = useState("");
  const [maxFiyat, setMaxFiyat] = useState("");
  const [il, setIl] = useState("");
  const [ilce, setIlce] = useState("");
  const [durumlar, setDurumlar] = useState<string[]>([]);
  // "Hepsi" açıkken tekil durum seçimleri kapalı olur.
  const [hepsiDurum, setHepsiDurum] = useState(true);
  const [defo, setDefo] = useState<DefoSecim | null>("farketmez");
  // Muadil ürün: alıcı birebir aynısı yerine muadilini de kabul ediyor mu?
  const [muadil, setMuadil] = useState<boolean | null>(null);
  const [kanalApp, setKanalApp] = useState(true);
  const [kanalMail, setKanalMail] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);

  const nextId = useRef(4);
  const toastT = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => () => {
    if (toastT.current) clearTimeout(toastT.current);
  }, []);

  const alarmSayisi = alarmlar.length;
  const haftalikEslesme = alarmlar.reduce(
    (t, a) => t + (a.aktif ? a.eslesme : 0),
    0,
  );
  const kaydetOk = seciliKat !== null && (kanalApp || kanalMail);

  function katSec(ad: string) {
    setSeciliKat((prev) => (prev === ad ? null : ad));
  }
  function durumToggle(d: string) {
    setDurumlar((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function durdur(id: number) {
    setAlarmlar((prev) =>
      prev.map((a) => (a.id === id ? { ...a, aktif: !a.aktif } : a)),
    );
  }
  function sil(id: number) {
    setAlarmlar((prev) => prev.filter((a) => a.id !== id));
  }

  function kaydet() {
    if (!kaydetOk) return;
    const kriterler: string[] = [];
    kriterler.push(seciliKat!);
    if (marka.trim()) kriterler.push(marka.trim());
    if (model.trim()) kriterler.push(model.trim());
    if (renk.trim()) kriterler.push(renk.trim());
    if (yil.trim()) kriterler.push(yil.trim());
    if (kelime.trim()) kriterler.push(`"${kelime.trim()}"`);
    if (durumlar.length) kriterler.push(durumlar.join(" / "));
    if (muadil !== null)
      kriterler.push(muadil ? "muadil olur" : "muadil olmaz");
    if (defo === "defosuz") kriterler.push("defosuz");
    if (defo === "defolu") kriterler.push("defolu olabilir");
    const enAz = minFiyat.trim();
    const enCok = maxFiyat.trim();
    if (enAz && enCok) kriterler.push(`${enAz}–${enCok} TL`);
    else if (enAz) kriterler.push(`${enAz} TL üzeri`);
    else if (enCok) kriterler.push(`${enCok} TL altı`);
    kriterler.push(
      il ? (ilce.trim() ? `${il} · ${ilce.trim()}` : il) : "Tüm Türkiye",
    );

    const kanal =
      [kanalApp ? "Uygulama" : null, kanalMail ? "E-posta" : null]
        .filter(Boolean)
        .join(" + ") || "Uygulama";

    const ana = seciliKat!;
    const etiket = marka.trim() || kelime.trim();

    const yeni: Alarm = {
      id: nextId.current,
      ad: ana + (etiket ? " — " + etiket : ""),
      kriterler,
      aktif: true,
      eslesme: 0,
      son: null,
      kanal,
    };
    nextId.current += 1;
    setAlarmlar((prev) => [yeni, ...prev]);

    // Sıfırla
    setSeciliKat(null);
    setKelime("");
    setMarka("");
    setModel("");
    setYil("");
    setRenk("");
    setMinFiyat("");
    setMaxFiyat("");
    setIl("");
    setIlce("");
    setDurumlar([]);
    setHepsiDurum(true);
    setDefo("farketmez");
    setMuadil(null);
    setKaydedildi(true);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setKaydedildi(false), 4000);
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
        <span className="font-semibold text-ink-900">Talep Alarmları</span>
      </nav>

      <div className="mb-5">
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Talep Alarmları
        </h1>
        <p className="mt-1.5 max-w-[640px] text-[14.5px] font-medium leading-relaxed text-ink-700">
          Kriterlerini belirle ve kaydet; eşleşen bir talep yayınlandığı anda
          bildirim al. Dükkânda müşteri beklemek yerine, satın almaya hazır
          alıcıların taleplerine doğrudan ulaş.
        </p>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── SOL: alarm listesi ── */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-3">
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

        {/* ── SAĞ: "nasıl çalışır?" (üstte) + yeni alarm ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          {/* Bilgi kutusu — en üstte */}
          <div className="rounded-card bg-accent p-[18px] text-ink-900">
            <div className="text-[15px] font-extrabold">
              Alarmlar nasıl çalışır?
            </div>
            <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-accent-ink">
              Bir alıcı, belirlediğin kriterlere uygun bir talep oluşturduğunda
              anında bildirim alırsın. Talebe erken sunum gönderen satıcıların
              satışa ulaşma oranı <strong className="text-ink-900">3 kat</strong>{" "}
              daha yüksektir. Daha fazla kategori ve kriter için alarm
              oluşturarak daha çok talebi zamanında yakalayabilirsin.
            </p>
          </div>

          <div className="rounded-card border border-border bg-card p-5">
            <div className="text-[16.5px] font-extrabold text-ink-900">
              Yeni Alarm Oluştur
            </div>

            {/* Kategori — tek seçim */}
            <div className="mt-4 mb-2 flex items-baseline justify-between gap-2">
              <label className="text-[13.5px] font-bold text-ink-900">Kategori</label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {kategoriler.map((k) => {
                const aktif = seciliKat === k.ad;
                const Ikon = kategoriIkonlar[k.ad];
                return (
                  <button
                    key={k.ad}
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => katSec(k.ad)}
                    className={aktif ? chipActive : chipPassive}
                  >
                    {Ikon && <Ikon className="h-[17px] w-[17px] flex-none" />}
                    {k.ad}
                    {aktif ? " ✓" : ""}
                  </button>
                );
              })}
            </div>

            {/* Marka / Model */}
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Marka</label>
                <input
                  value={marka}
                  onChange={(e) => setMarka(e.target.value.slice(0, 24))}
                  placeholder="örn. Nokia"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Model</label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value.slice(0, 24))}
                  placeholder="örn. 3310"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Yıl / Renk */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Yıl</label>
                <input
                  inputMode="numeric"
                  value={yil}
                  onChange={(e) =>
                    setYil(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
                  }
                  placeholder="örn. 2000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Renk</label>
                <input
                  value={renk}
                  onChange={(e) => setRenk(e.target.value.slice(0, 20))}
                  placeholder="örn. mavi"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Anahtar kelime */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Anahtar kelime
            </label>
            <input
              value={kelime}
              onChange={(e) => setKelime(e.target.value.slice(0, 40))}
              placeholder="örn. imzalı, ilk baskı, kutulu..."
              className={inputCls}
            />

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

            {/* Ürün durumu — çoklu; "Hepsi" seçiliyken diğerleri kapalı */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Ürün durumu
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={hepsiDurum}
                onClick={() => {
                  // Tekrar tıklayınca kapanır; kapanınca tekil durumlar seçilebilir.
                  setHepsiDurum((v) => !v);
                  setDurumlar([]);
                }}
                className={hepsiDurum ? chipActive : chipPassive}
              >
                Hepsi{hepsiDurum ? " ✓" : ""}
              </button>
              {durumSecenekleri.map((d) => {
                const aktif = durumlar.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={aktif}
                    disabled={hepsiDurum}
                    onClick={() => durumToggle(d)}
                    className={`${aktif ? chipActive : chipPassive} disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border-input disabled:hover:text-ink-500`}
                  >
                    {d}
                    {aktif ? " ✓" : ""}
                  </button>
                );
              })}
            </div>

            {/* Ürün defosu */}
            <label className="mt-3.5 mb-2 block text-[13.5px] font-bold text-ink-900">
              Ürün defosu
            </label>
            <div className="flex flex-wrap gap-1.5">
              {defoSecenekleri.map((o) => {
                const farketmez = o.v === "farketmez";
                // "Farketmez" açıkken diğer iki seçenek kapalı; tekrar tıklayınca açılır.
                const kapali = defo === "farketmez" && !farketmez;
                return (
                  <button
                    key={o.v}
                    type="button"
                    aria-pressed={defo === o.v}
                    disabled={kapali}
                    onClick={() =>
                      setDefo((d) =>
                        farketmez && d === "farketmez" ? null : o.v,
                      )
                    }
                    className={`${defo === o.v ? chipActive : chipPassive} disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border-input disabled:hover:text-ink-500`}
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

            {/* Şehir / İlçe */}
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Şehir</label>
                <select
                  value={il}
                  onChange={(e) => setIl(e.target.value)}
                  className={`${inputCls} cursor-pointer appearance-none`}
                >
                  <option value="">Tüm Türkiye</option>
                  {iller.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>İlçe</label>
                <input
                  value={ilce}
                  onChange={(e) => setIlce(e.target.value.slice(0, 24))}
                  disabled={!il}
                  placeholder={il ? "örn. Kadıköy" : "önce şehir"}
                  className={`${inputCls} disabled:cursor-not-allowed disabled:bg-page disabled:text-ink-300`}
                />
              </div>
            </div>

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
          </div>
        </aside>
      </div>
    </main>
  );
}
