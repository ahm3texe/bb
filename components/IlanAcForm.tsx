"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { kategoriler, fiyatText, getTalep, binlikAyir } from "@/lib/data";
import { ilAdlari, ilceler } from "@/lib/turkiye-il-ilce";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { kategoriIkonlar } from "@/components/KategoriIkon";

const MIN_ACIKLAMA = 30;

// Alıcının kabul ettiği ürün durumu (tek seçim).
const durumList = ["Hepsi", "Kutusu açılmamış", "Az kullanılmış", "Kullanılmış"];
// İlan süresi sabittir: 30 gün (formda gösterilir, seçilemez).
const ilList = ilAdlari;

const inputCls =
  "w-full box-border rounded-control border-[1.5px] border-border-input px-3.5 py-[13px] text-[15px] font-medium leading-snug text-ink-900 outline-none focus:border-primary";

const pillActive =
  "cursor-pointer rounded-full border-[1.5px] border-primary bg-primary-soft px-3.5 py-[11px] text-[13.5px] font-bold text-primary-hover";
const pillPassive =
  "cursor-pointer rounded-full border-[1.5px] border-border-input bg-card px-3.5 py-[11px] text-[13.5px] font-semibold text-ink-500 hover:border-primary hover:text-primary";

const stepBadge =
  "flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-primary text-[13.5px] font-bold text-white";

const labelCls = "mb-2 block text-[14px] font-bold text-ink-900";

export function IlanAcForm() {
  const [kategori, setKategori] = useState("");
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState(""); // Talep notu
  const [fiyat, setFiyat] = useState("");
  const [acilSecim, setAcilSecim] = useState(false);
  const [pazarlikSecim, setPazarlikSecim] = useState(false);
  const [marka, setMarka] = useState("");
  const [model, setModel] = useState("");
  const [yil, setYil] = useState("");
  const [renk, setRenk] = useState("");
  const [defo, setDefo] = useState<null | boolean>(null);
  const [durum, setDurum] = useState("Hepsi");
  const [muadilSecim, setMuadilSecim] = useState(false);
  const [il, setIl] = useState<string>("");
  const [ilce, setIlce] = useState("");
  const ilceList = il ? ilceler(il) : [];
  const [mahalle, setMahalle] = useState("");
  const [mahalleList, setMahalleList] = useState<string[]>([]);
  const [mahalleYukleniyor, setMahalleYukleniyor] = useState(false);
  const [konumTarifi, setKonumTarifi] = useState("");
  const [fotolar, setFotolar] = useState(0);
  const sure = 30;
  const [published, setPublished] = useState(false);
  const [toastOn, setToastOn] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Düzenleme modu: ?duzenle=<id> ile gelindiğinde mevcut talebi ön-doldur.
  const params = useSearchParams();
  const duzenleId = params.get("duzenle");
  const duzenleModu = !!duzenleId && !!getTalep(duzenleId);

  useEffect(() => () => clearTimeout(toastRef.current), []);

  // İl + ilçe seçilince mahalleler sunucudan çekilir (veri seti istemciye gömülmez).
  useEffect(() => {
    if (!il || !ilce) {
      setMahalleList([]);
      setMahalleYukleniyor(false);
      return;
    }
    const ac = new AbortController();
    setMahalleYukleniyor(true);
    fetch(
      `/api/mahalleler?il=${encodeURIComponent(il)}&ilce=${encodeURIComponent(ilce)}`,
      { signal: ac.signal },
    )
      .then((r) => r.json())
      .then((d: { mahalleler?: string[] }) => setMahalleList(d.mahalleler ?? []))
      .catch(() => {
        if (!ac.signal.aborted) setMahalleList([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setMahalleYukleniyor(false);
      });
    return () => ac.abort();
  }, [il, ilce]);

  useEffect(() => {
    if (!duzenleId) return;
    const t = getTalep(duzenleId);
    if (!t) return;
    setKategori(t.kategori);
    setBaslik(t.baslik);
    setMarka(t.marka);
    setAciklama(t.aciklama);
    setFiyat(String(t.fiyatNum));
    setAcilSecim(!!t.acil);
    setPazarlikSecim(!!t.pazarlik);
    setDurum(durumList.includes(t.durum) ? t.durum : "Hepsi");
    setIl(t.il);
    setIlce(t.ilce);
    setFotolar(1);
  }, [duzenleId]);

  const baslikOk = baslik.trim().length >= 5;
  const aciklamaOk = aciklama.trim().length >= MIN_ACIKLAMA;
  const kategoriOk = kategori !== "";
  const fiyatNum = parseInt(fiyat, 10) || 0;
  const fiyatOk = fiyatNum > 0;
  const fotoOk = fotolar >= 1;
  const canPublish = baslikOk && aciklamaOk && kategoriOk && fiyatOk && fotoOk;


  function saveDraft() {
    try {
      localStorage.setItem(
        "bb_ilan_taslak",
        JSON.stringify({ kategori, baslik, aciklama, fiyat, acilSecim, pazarlikSecim, muadilSecim, marka, model, yil, renk, defo, durum, il, ilce, mahalle, konumTarifi, sure }),
      );
    } catch {
      // localStorage kullanılamıyorsa sessizce geç.
    }
    setToastOn(true);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastOn(false), 3600);
  }

  const konumText = [mahalle, ilce, il].filter((p) => p.trim()).join(", ");
  const fotoText = fotolar > 0 ? `kapak görseli · ${fotolar}/6` : "referans görsel ekle";

  // ── Başarı ekranı ──
  if (published) {
    return (
      <main className="mx-auto max-w-[640px] px-6 pb-20 pt-16">
        <style>{`@keyframes bbFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div
          className="rounded-panel border border-border bg-card p-9 text-center"
          style={{ animation: "bbFadeUp 0.25s ease" }}
        >
          <div className="mx-auto flex h-[62px] w-[62px] items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white">
            ✓
          </div>
          <h1 className="mt-5 text-[26px] font-extrabold text-ink-900">
            Talebin yayında!
          </h1>
          <p className="mx-auto mt-2.5 max-w-md text-sm font-medium leading-relaxed text-ink-500">
            “{baslik.trim() || "Talebin"}” talebi{" "}
            <strong className="text-ink-900">{sure} gün</strong> boyunca satıcılara
            açık. Sunumlar geldikçe bildirim alacaksın; sunumları yalnızca sen
            görebilirsin.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <ButtonLink href="/ilan-yonetimi" variant="primary" size="lg">
              İlanı Yönet
            </ButtonLink>
            <ButtonLink href="/kesfet" variant="secondary" size="lg">
              Keşfet&apos;e Dön
            </ButtonLink>
          </div>
          <p className="mt-5 text-[13px] font-medium text-ink-500">
            İlanını{" "}
            <Link href="/ilan-yonetimi" className="font-semibold">
              İlan Yönetimi
            </Link>{" "}
            ekranından düzenleyebilir, süresini uzatabilir ya da kapatabilirsin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[18px]">
      {/* Breadcrumb */}
      <nav
        aria-label="Sayfa yolu"
        className="flex flex-wrap items-center gap-1.5 py-1.5 text-[13px] font-medium text-ink-500"
      >
        <Link href="/" className="text-ink-400 hover:text-primary">
          Ana Sayfa
        </Link>
        <span aria-hidden>›</span>
        <span className="font-semibold text-ink-900">
          {duzenleModu ? "Talebi Düzenle" : "Yeni Talep"}
        </span>
      </nav>

      <div className="mb-5">
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          {duzenleModu ? "Talebini Düzenle" : "Aradığını İlan Et"}
        </h1>
        <p className="mt-2 max-w-[560px] text-sm font-medium leading-relaxed text-ink-500">
          {duzenleModu
            ? "Bilgileri güncelle; değişiklikler yayındaki talebine yansır."
            : "Fiyatı sen belirle, satıcılar sunumlarıyla sana gelsin. İlan açmak ücretsizdir."}
        </p>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── FORM ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* 1 · Kategori + başlık + talep notu */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={stepBadge}>1</span>
              <h2 className="text-[16.5px] font-extrabold text-ink-900">
                Ne arıyorsun?
              </h2>
              {/* İlan süresi sabit — kullanıcıya baştan bildirilir. */}
              <span className="ml-auto rounded-full bg-primary-soft px-3 py-[7px] text-[12.5px] font-bold text-primary-hover">
                İlan süresi 30 gündür
              </span>
            </div>

            <div className="mt-[18px]">
              <label className={labelCls}>
                Kategori <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {kategoriler.map((k) => {
                  const active = kategori === k.ad;
                  const Ikon = kategoriIkonlar[k.ad];
                  return (
                    <button
                      key={k.ad}
                      type="button"
                      onClick={() => setKategori(k.ad)}
                      className={`flex items-center gap-[9px] rounded-control border-[1.5px] p-2.5 text-left ${
                        active
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-card hover:border-primary"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${
                          active
                            ? "bg-primary text-white"
                            : "bg-primary-soft text-primary-hover"
                        }`}
                      >
                        {Ikon ? <Ikon className="h-[15px] w-[15px]" /> : k.harf}
                      </span>
                      <span
                        className={`text-[13px] font-semibold leading-tight ${
                          active ? "font-bold text-primary-hover" : "text-ink-500"
                        }`}
                      >
                        {k.ad}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-[18px]">
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="ia-baslik" className="text-[14px] font-bold text-ink-900">
                  Talep başlığı <span className="text-danger">*</span>
                </label>
                <span
                  className={`text-[12.5px] font-semibold ${
                    baslikOk ? "text-primary-hover" : "text-danger"
                  }`}
                >
                  {baslik.length}/70{baslikOk ? "" : " · en az 5 karakter"}
                </span>
              </div>
              <input
                id="ia-baslik"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value.slice(0, 70))}
                placeholder={'örn. İmzalı "Dawn FM" CD arıyorum'}
                className={inputCls}
              />
            </div>

            <div className="mt-[18px]">
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="ia-not" className="text-[14px] font-bold text-ink-900">
                  Talep notu <span className="text-danger">*</span>
                </label>
                <span
                  className={`text-[12.5px] font-semibold ${
                    aciklamaOk ? "text-primary-hover" : "text-danger"
                  }`}
                >
                  {aciklama.length}/500
                  {aciklamaOk ? "" : ` · en az ${MIN_ACIKLAMA} karakter`}
                </span>
              </div>
              <textarea
                id="ia-not"
                rows={4}
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value.slice(0, 500))}
                placeholder="Aradığın ürünü tarif et: hangi baskı/versiyon, kabul ettiğin durumlar, kutu/aksesuar şartların…"
                className={`${inputCls} resize-y font-medium leading-relaxed`}
              />
              <p className="mt-[7px] text-[13px] font-medium text-ink-500">
                Ne kadar net yazarsan, sunumlar o kadar isabetli olur.
              </p>
            </div>
          </section>

          {/* 2 · Fiyat + öne çıkarma etiketleri */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>2</span>
              <h2 className="text-[16.5px] font-extrabold text-ink-900">
                Fiyat ve öne çıkarma
              </h2>
            </div>

            <div className="mt-4 flex flex-wrap items-stretch gap-x-5 gap-y-[18px]">
              {/* Sol kolon: fiyat + görünürlük destekleri */}
              <div className="flex-none">
                <label htmlFor="ia-fiyat" className={labelCls}>
                  Fiyat <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-1.5 rounded-control border-[1.5px] border-border-input bg-card py-0 pl-1 pr-3 sm:w-fit">
                  <input
                    id="ia-fiyat"
                    inputMode="numeric"
                    value={binlikAyir(fiyat)}
                    onChange={(e) =>
                      setFiyat(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))
                    }
                    placeholder="0"
                    aria-label="Fiyat (TL)"
                    className="w-[110px] border-none bg-transparent px-2.5 py-1.5 text-[17px] font-extrabold text-ink-900 outline-none"
                  />
                  <span className="text-base font-extrabold text-ink-400">TL</span>
                </div>

                {/* Görünürlük destekleri — fiyat kutusunun altında */}
                <div className="mt-[18px]">
                  <label className={labelCls}>Görünürlük destekleri</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAcilSecim((v) => !v)}
                      aria-pressed={acilSecim}
                      className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-[11px] text-[13.5px] font-bold transition-colors ${
                        acilSecim
                          ? "border-danger bg-danger text-white"
                          : "border-border-input bg-card text-ink-500 hover:border-danger hover:text-danger"
                      }`}
                    >
                      Acil !
                    </button>
                    <button
                      type="button"
                      onClick={() => setPazarlikSecim((v) => !v)}
                      aria-pressed={pazarlikSecim}
                      className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-[11px] text-[13.5px] font-bold transition-colors ${
                        pazarlikSecim
                          ? "border-accent bg-accent-soft text-accent-ink"
                          : "border-border-input bg-card text-ink-500 hover:border-accent hover:text-accent-ink"
                      }`}
                    >
                      Üst sıra
                    </button>
                  </div>
                </div>
              </div>

              {/* Sağ kolon: bilgi baloncuğu — fiyatın sağındaki boşluğu dikeyde doldurur */}
              <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-[20px] bg-primary-soft px-4 py-2.5 text-[13px] font-medium leading-relaxed text-primary-hover">
                <span aria-hidden className="text-[26px] leading-none">
                  💡
                </span>
                <div className="flex flex-col gap-2">
                  <p>
                    <b>Acil</b> etiketi, talebinizi öne çıkararak daha fazla
                    satıcının dikkatini çeker ve daha kısa sürede daha fazla
                    teklif almanıza yardımcı olur.
                  </p>
                  <p>
                    <b>Üst Sıra</b> seçeneğiyle ilanınız, ilgili kategorinin üst
                    sıralarında gösterilir. İlan kartınız hafif yeşil bir arka
                    planla vurgulanarak standart ilanlardan kolayca ayrışır.
                  </p>
                  <p>
                    Bu iki görünürlük desteğini kullanarak talebinize{" "}
                    <b>2 kata kadar daha hızlı</b> karşılık bulabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

          </section>

          {/* 3 · Ürün detayları */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>3</span>
              <h2 className="text-[16.5px] font-extrabold text-ink-900">
                Ürün detayları
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-[18px] sm:grid-cols-2">
              <div>
                <label htmlFor="ia-marka" className={labelCls}>Marka / Tür</label>
                <input id="ia-marka" value={marka} onChange={(e) => setMarka(e.target.value.slice(0, 40))} placeholder="örn. The Weeknd, Sega" className={inputCls} />
              </div>
              <div>
                <label htmlFor="ia-model" className={labelCls}>Model</label>
                <input id="ia-model" value={model} onChange={(e) => setModel(e.target.value.slice(0, 40))} placeholder="örn. Dawn FM, 3310" className={inputCls} />
              </div>
              <div>
                <label htmlFor="ia-yil" className={labelCls}>Yıl</label>
                <input id="ia-yil" inputMode="numeric" value={yil} onChange={(e) => setYil(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="örn. 2022" className={inputCls} />
              </div>
              <div>
                <label htmlFor="ia-renk" className={labelCls}>Renk</label>
                <input id="ia-renk" value={renk} onChange={(e) => setRenk(e.target.value.slice(0, 30))} placeholder="örn. Siyah, Mor" className={inputCls} />
              </div>
            </div>

            <div className="mt-[18px]">
              <label className={labelCls}>Muadil ürün kabul eder misin?</label>
              <div className="flex gap-2">
                {[
                  { v: true, l: "Evet" },
                  { v: false, l: "Hayır" },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    onClick={() => setMuadilSecim(o.v)}
                    className={muadilSecim === o.v ? pillActive : pillPassive}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-500">
                “Evet” dersen aradığın ürünün muadili (eşdeğeri) olan sunumları da
                değerlendirdiğini belirtirsin; talebine{" "}
                <strong className="text-ink-700">“Muadil kabul”</strong> etiketi
                eklenir.
              </p>
            </div>

            <div className="mt-[18px]">
              <label className={labelCls}>Üründe defo kabul eder misin?</label>
              <div className="flex gap-2">
                {[
                  { v: false, l: "Hayır, defosuz" },
                  { v: true, l: "Evet, olabilir" },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    onClick={() => setDefo(o.v)}
                    className={defo === o.v ? pillActive : pillPassive}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-[18px]">
              <label className={labelCls}>Kabul ettiğin ürün durumu</label>
              <div className="flex flex-wrap gap-2">
                {durumList.map((d) => {
                  const hepsi = d === "Hepsi";
                  // "Hepsi" açıkken tekil durumlar kapalı; tekrar tıklayınca açılır.
                  const kapali = durum === "Hepsi" && !hepsi;
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={durum === d}
                      disabled={kapali}
                      onClick={() =>
                        setDurum((v) => (hepsi && v === "Hepsi" ? "" : d))
                      }
                      className={`${durum === d ? pillActive : pillPassive} disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border-input disabled:hover:text-ink-500`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4 · Konum + görsel/video + süre */}
          <section className="rounded-panel border border-border bg-card p-[22px]">
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>4</span>
              <h2 className="text-[16.5px] font-extrabold text-ink-900">
                Konum, görsel ve süre
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ia-il" className={labelCls}>Şehir</label>
                <select
                  id="ia-il"
                  value={il}
                  onChange={(e) => {
                    setIl(e.target.value);
                    setIlce("");
                  }}
                  className={`${inputCls} cursor-pointer bg-card`}
                >
                  <option value="" disabled>
                    Şehir seç
                  </option>
                  {ilList.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ia-ilce" className={labelCls}>İlçe</label>
                <select
                  id="ia-ilce"
                  value={ilce}
                  onChange={(e) => {
                    setIlce(e.target.value);
                    setMahalle("");
                  }}
                  disabled={!il}
                  className={`${inputCls} cursor-pointer bg-card disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-300`}
                >
                  <option value="" disabled>
                    {il ? "İlçe seç" : "Önce şehir seç"}
                  </option>
                  {ilceList.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ia-mahalle" className={labelCls}>Mahalle</label>
                <select
                  id="ia-mahalle"
                  value={mahalle}
                  onChange={(e) => setMahalle(e.target.value)}
                  disabled={!il || !ilce || mahalleList.length === 0}
                  className={`${inputCls} cursor-pointer bg-card disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-300`}
                >
                  <option value="" disabled>
                    {!il || !ilce
                      ? "Önce ilçe seç"
                      : mahalleYukleniyor
                          ? "Mahalleler yükleniyor…"
                          : mahalleList.length === 0
                            ? "Mahalle bulunamadı"
                            : "Mahalle seç"}
                  </option>
                  {mahalleList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <label
                    htmlFor="ia-konum-tarifi"
                    className="block text-[14px] font-bold text-ink-900"
                  >
                    Konum tarifi
                  </label>
                  <span className="text-[12.5px] font-semibold text-ink-500">
                    {konumTarifi.length}/60
                  </span>
                </div>
                <input
                  id="ia-konum-tarifi"
                  value={konumTarifi}
                  onChange={(e) => setKonumTarifi(e.target.value.slice(0, 60))}
                  maxLength={60}
                  placeholder="Örn. metro çıkışına 5 dk, sahil tarafı"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="mt-[18px]">
              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-[14px] font-bold text-ink-900">
                  Fotoğraf / Video ekle <span className="text-danger">*</span>
                </label>
                <span className={`text-[12.5px] font-semibold ${fotoOk ? "text-primary-hover" : "text-danger"}`}>
                  {fotolar}/6{fotoOk ? "" : " · en az 1"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {Array.from({ length: 6 }, (_, i) => {
                  const filled = i < fotolar;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFotolar(i < fotolar ? i : i + 1)}
                      aria-label={filled ? `Görsel ${i + 1} — kaldır` : "Görsel/video ekle"}
                      className={`flex aspect-square items-center justify-center rounded-control border-[1.5px] text-[12.5px] font-bold transition-colors ${
                        filled
                          ? "border-primary bg-primary-soft text-primary-hover"
                          : "border-dashed border-border-input bg-subtle text-ink-400 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {filled ? `✓ ${i + 1}` : "+"}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-ink-500">
                Aradığın ürünün fiziksel bir örneği elinde yoksa, ürünü
                tanımlayan bir referans görsel veya video yüklemen yeterlidir.
                Eklediğin ilk görsel kapak görseli olarak kullanılır. Önizleme
                kutularına tıklayarak görsel ve videoları ekleyebilir veya
                kaldırabilirsin.
              </p>
            </div>

          </section>

          {/* Yayınla */}
          <section className="flex flex-wrap items-center gap-3.5 rounded-panel border border-border bg-card px-[22px] py-[18px]">
            <Button variant="secondary" size="lg" onClick={saveDraft}>
              Taslak Kaydet
            </Button>
            <div className="min-w-[200px] flex-1">
              {canPublish ? (
                <div className="text-[13px] font-medium leading-relaxed text-primary-hover">
                  Her şey tamam — talebin yayına hazır ✓
                </div>
              ) : (
                <div className="text-[13px] font-medium leading-relaxed text-danger">
                  İlan açmak için tüm alanlar doldurulmalıdır.
                </div>
              )}
            </div>
            <Button
              variant="primary"
              disabled={!canPublish}
              onClick={() => canPublish && setPublished(true)}
              className="px-7 py-[17px] text-[15.5px]"
            >
              İlanı Yayınla
            </Button>
          </section>
        </div>

        {/* ── SAĞ SÜTUN: dikey önizleme ── */}
        <aside className="flex flex-col gap-3.5 lg:self-stretch">
          {/* Güvence sistemi — sayfa akışında kalır, kaydırmada sabitlenmez */}
          <div className="rounded-card bg-ink-900 p-[18px] text-white">
            <div className="flex items-center gap-2 text-[15px] font-extrabold uppercase leading-snug tracking-[0.6px] text-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[20px] w-[20px] flex-none"
                aria-hidden
              >
                <path d="M12 3l7 3v5c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Güvence Sistemi
            </div>
            <p className="mt-2.5 text-[13.5px] font-semibold leading-relaxed text-[#e9e4f6]">
              Ürünün, satıcının açıklamalarına veya belirtilen özelliklere uygun
              olmaması durumunda iade sürecini başlatabilirsiniz. Ürün satıcıya
              iade olarak ulaştıktan sonra ödemenizin tamamı, herhangi bir kesinti
              uygulanmadan tarafınıza iade edilir.
            </p>
          </div>

          {/* Önizleme — kaydırmada ekrana kilitlenir */}
          <div className="lg:sticky lg:top-[150px]">
            <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[1.4px] text-ink-500">
              Canlı önizleme — talep kartın
            </div>
            <div
              className={`mx-auto w-[260px] max-w-full overflow-hidden rounded-card border shadow-[var(--shadow-pop)] transition-colors ${
                // Üst sıra: etiket yerine hafif yeşil zemin — kartlardaki davranışın aynısı.
                pazarlikSecim
                  ? "border-accent bg-accent/15"
                  : "border-border bg-card"
              }`}
            >
              {/* Dikey görsel alanı (3:4) */}
              <div className="ref-image relative flex aspect-[3/4] items-center justify-center">
                <span className="font-mono text-[11.5px] text-[#7d738f]">
                  {fotoText}
                </span>
                <span className="absolute left-2.5 top-2.5 rounded-md bg-accent px-2 py-[5px] text-[11px] font-extrabold uppercase tracking-[1px] text-ink-900">
                  Talep
                </span>
              </div>
              <div className="p-[14px]">
                <div className="text-base font-extrabold text-ink-900">
                  {fiyatOk ? fiyatText(fiyatNum) : "— TL"}
                </div>
                <div className="mt-[9px] text-[11px] font-extrabold uppercase tracking-[0.8px] text-primary">
                  {marka.trim() || "MARKA"}
                </div>
                <div className="mt-0.5 text-[13px] font-semibold leading-snug text-ink-900">
                  {baslik.trim() || "Talep başlığın burada görünecek"}
                </div>
                <div className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-ink-500">
                  {aciklama.trim() || "Kısa açıklaman burada görünecek."}
                </div>
                {/* Üst sıra çip olarak gösterilmez — kart zemini yeşile döner. */}
                {(acilSecim || muadilSecim) && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {acilSecim && <Chip variant="acil">! Acil</Chip>}
                    {muadilSecim && <Chip variant="violet">Muadil kabul</Chip>}
                  </div>
                )}
                <div className="mt-2.5 border-t border-hairline pt-2 text-[12.5px] font-medium text-ink-500">
                  {konumText} · 0 sunum
                </div>
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* Taslak toast */}
      {toastOn && (
        <>
          <style>{`@keyframes bbToastUp{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
          <div
            role="status"
            className="fixed bottom-7 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink-900 px-5 py-3.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-pop)]"
            style={{ animation: "bbToastUp 0.25s ease" }}
          >
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-[11.5px] font-extrabold text-ink-900">
              ✓
            </span>
            Taslağın bu cihaza kaydedildi — bir dahaki sefere kaldığın yerden
            devam edebilirsin.
          </div>
        </>
      )}
    </main>
  );
}
