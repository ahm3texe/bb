"use client";

import { useState } from "react";
import Link from "next/link";

type Adim = "odeme" | "kargo" | "onay" | "puan" | "tamam";

const control =
  "w-full box-border rounded-control border-[1.5px] border-border-input bg-card px-3.5 py-3 text-ink-900 outline-none focus:border-primary";

const stepTanim = [
  { ad: "Ödeme", sub: "Güvenceye alınır" },
  { ad: "Kargo", sub: "3 gün kuralı" },
  { ad: "Teslim & Onay", sub: "Sen onaylarsın" },
  { ad: "Değerlendirme", sub: "Puan & yorum" },
];

const idxMap: Record<Adim, number> = {
  odeme: 0,
  kargo: 1,
  onay: 2,
  puan: 3,
  tamam: 4,
};

function durumRozet(adim: Adim) {
  switch (adim) {
    case "kargo":
      return { text: "Kargo yolda · ödeme güvencede", cls: "bg-primary-soft text-primary-hover" };
    case "onay":
      return { text: "Teslim edildi · onayın bekleniyor", cls: "bg-accent-soft text-accent-ink" };
    case "puan":
      return { text: "Ödeme satıcıya aktarıldı", cls: "bg-primary-soft text-primary-hover" };
    case "tamam":
      return { text: "Tamamlandı", cls: "bg-primary text-white" };
    default:
      return { text: "Ödeme bekleniyor", cls: "bg-accent-soft text-accent-ink" };
  }
}

export function SiparisClient() {
  const [adim, setAdim] = useState<Adim>("odeme");
  const [kartAd, setKartAd] = useState("");
  const [kartNo, setKartNo] = useState("");
  const [skt, setSkt] = useState("");
  const [cvv, setCvv] = useState("");
  const [adres, setAdres] = useState<"kayitli" | "yeni">("kayitli");
  const [yeniAdres, setYeniAdres] = useState("");
  const [yildiz, setYildiz] = useState(0);
  const [hoverYildiz, setHoverYildiz] = useState(0);
  const [yorum, setYorum] = useState("");

  const cur = idxMap[adim];
  const kartDigits = kartNo.replace(/\s/g, "");
  const sktDigits = skt.replace(/\D/g, "");
  const adresOk = adres === "kayitli" || yeniAdres.trim().length >= 15;
  const odemeOk =
    kartAd.trim().length >= 5 &&
    kartDigits.length === 16 &&
    sktDigits.length === 4 &&
    cvv.length === 3 &&
    adresOk;
  const puanOk = yildiz >= 1 && yorum.trim().length >= 10;
  const rozet = durumRozet(adim);

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Sayfa yolu"
        className="flex flex-wrap items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-ink-400"
      >
        <Link href="/mesajlar" className="text-ink-400 hover:text-primary">
          Mesajlar
        </Link>
        <span aria-hidden>›</span>
        <span className="font-semibold text-ink-900">Sipariş #BB-78412</span>
      </nav>

      <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Sipariş Takibi
        </h1>
        <span
          className={`rounded-full px-3 py-2 text-[11.5px] font-bold ${rozet.cls}`}
        >
          {rozet.text}
        </span>
      </div>

      {/* Adım çubuğu */}
      <div className="mb-[22px] grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stepTanim.map((t, i) => {
          const done = i < cur;
          const active = i === cur;
          return (
            <div
              key={t.ad}
              className="flex items-center gap-2.5 rounded-control border border-border bg-card px-3.5 py-3"
            >
              <span
                className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[12px] font-extrabold ${
                  done
                    ? "bg-primary text-white"
                    : active
                      ? "bg-accent text-ink-900"
                      : "bg-page text-ink-300"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <div>
                <div className="text-[12.5px] font-bold text-ink-900">
                  {t.ad}
                </div>
                <div className="mt-0.5 text-[10.5px] font-medium text-ink-300">
                  {t.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── Akış ── */}
        <div className="min-w-0">
          {/* 1 · ÖDEME */}
          {adim === "odeme" && (
            <section className="rounded-[18px] border border-border bg-card p-[22px]">
              <div className="flex flex-wrap items-center gap-2.5 rounded-control bg-primary-soft px-3.5 py-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-white">
                  ✓
                </span>
                <span className="text-[13px] font-bold leading-snug text-primary-hover">
                  Teklif kabul edildi — 4.500 TL üzerinde anlaşıldı.
                </span>
                <Link href="/mesajlar" className="ml-auto text-[12px] font-semibold">
                  Sohbete dön ›
                </Link>
              </div>

              <h2 className="mb-1 mt-5 text-[17px] font-extrabold text-ink-900">
                Ödemeyi güvenceye al
              </h2>
              <p className="mb-[18px] text-[12.5px] font-medium leading-relaxed text-ink-400">
                Ödemen satıcıya hemen geçmez — ürünü teslim alıp onaylayana kadar
                BulBana güvencesinde tutulur.
              </p>

              <div className="mb-3.5">
                <label
                  htmlFor="kartAd"
                  className="mb-[7px] block text-[12.5px] font-bold text-ink-900"
                >
                  Kart üzerindeki isim
                </label>
                <input
                  id="kartAd"
                  value={kartAd}
                  onChange={(e) => setKartAd(e.target.value.slice(0, 40))}
                  placeholder="Ad Soyad"
                  className={`${control} text-[13.5px] font-semibold`}
                />
              </div>
              <div className="mb-3.5">
                <label
                  htmlFor="kartNo"
                  className="mb-[7px] block text-[12.5px] font-bold text-ink-900"
                >
                  Kart numarası
                </label>
                <input
                  id="kartNo"
                  inputMode="numeric"
                  value={kartNo}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 16);
                    setKartNo(d.replace(/(\d{4})(?=\d)/g, "$1 "));
                  }}
                  placeholder="0000 0000 0000 0000"
                  className={`${control} text-[15px] font-bold tracking-[1px]`}
                />
              </div>
              <div className="mb-[18px] grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="skt"
                    className="mb-[7px] block text-[12.5px] font-bold text-ink-900"
                  >
                    Son kullanma
                  </label>
                  <input
                    id="skt"
                    inputMode="numeric"
                    value={skt}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setSkt(d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d);
                    }}
                    placeholder="AA/YY"
                    className={`${control} text-[14px] font-bold`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cvv"
                    className="mb-[7px] block text-[12.5px] font-bold text-ink-900"
                  >
                    CVV
                  </label>
                  <input
                    id="cvv"
                    type="password"
                    inputMode="numeric"
                    value={cvv}
                    onChange={(e) =>
                      setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    placeholder="•••"
                    className={`${control} text-[14px] font-bold`}
                  />
                </div>
              </div>

              <label className="mb-2 block text-[12.5px] font-bold text-ink-900">
                Teslimat adresi
              </label>
              <div className="mb-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAdres("kayitli")}
                  className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-[11px] text-[12.5px] transition-colors ${
                    adres === "kayitli"
                      ? "border-primary bg-primary-soft font-bold text-primary-hover"
                      : "border-border-input bg-card font-semibold text-ink-500 hover:border-primary hover:text-primary"
                  }`}
                >
                  Ev — Kadıköy, İstanbul{adres === "kayitli" ? " ✓" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setAdres("yeni")}
                  className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-[11px] text-[12.5px] transition-colors ${
                    adres === "yeni"
                      ? "border-primary bg-primary-soft font-bold text-primary-hover"
                      : "border-border-input bg-card font-semibold text-ink-500 hover:border-primary hover:text-primary"
                  }`}
                >
                  Yeni adres{adres === "yeni" ? " ✓" : ""}
                </button>
              </div>
              {adres === "yeni" && (
                <textarea
                  rows={2}
                  value={yeniAdres}
                  onChange={(e) => setYeniAdres(e.target.value.slice(0, 200))}
                  placeholder="Mahalle, sokak, no, ilçe/il..."
                  className={`${control} mb-1.5 resize-y text-[13px] font-medium leading-relaxed`}
                />
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => odemeOk && setAdim("kargo")}
                  disabled={!odemeOk}
                  className={`rounded-[13px] px-[26px] py-4 text-[15px] font-extrabold ${
                    odemeOk
                      ? "cursor-pointer bg-primary text-white hover:bg-primary-hover"
                      : "cursor-not-allowed bg-page text-ink-300"
                  }`}
                >
                  4.500 TL — Öde ve Güvenceye Al
                </button>
                <span className="min-w-[180px] flex-1 text-[11.5px] font-medium leading-relaxed text-ink-300">
                  256-bit şifreli ödeme · kart bilgilerin BulBana&apos;da
                  saklanmaz. (Önizleme — temsili kart bilgisi girebilirsin.)
                </span>
              </div>
            </section>
          )}

          {/* 2 · KARGO */}
          {adim === "kargo" && (
            <section className="rounded-[18px] border border-border bg-card p-[22px]">
              <div className="rounded-control bg-primary-soft px-3.5 py-3 text-[13px] font-bold leading-snug text-primary-hover">
                Ödemen güvencede ✓ — satıcıya, sen ürünü onaylayınca aktarılacak.
              </div>

              <h2 className="mb-1 mt-5 text-[17px] font-extrabold text-ink-900">
                Kargo yolda
              </h2>
              <p className="mb-4 text-[12.5px] font-medium leading-relaxed text-ink-400">
                plakdukkani34 ürünü 3 gün kuralı içinde kargoya verdi.
              </p>

              <div className="mb-[18px] flex flex-wrap items-center gap-2.5 rounded-control bg-page px-3.5 py-3">
                <span className="text-[13px] font-bold text-ink-900">
                  Aras Kargo
                </span>
                <span className="rounded-lg border border-border bg-card px-2.5 py-[7px] text-[12.5px] font-semibold text-ink-500">
                  Takip no: TR728439104
                </span>
                <span className="ml-auto text-[12px] font-semibold text-ink-300">
                  Kargo takibi yakında
                </span>
              </div>

              {/* Dikey takip */}
              <div className="flex flex-col">
                {[
                  {
                    durum: "done" as const,
                    baslik: "Kargoya verildi",
                    alt: "Dün, 16:40 · Kadıköy şubesi",
                  },
                  {
                    durum: "active" as const,
                    baslik: "Transfer merkezinde",
                    alt: "Bugün, 09:15 · İstanbul Anadolu",
                  },
                  { durum: "pending" as const, baslik: "Dağıtımda", alt: "" },
                  {
                    durum: "last" as const,
                    baslik: "Teslim edildi",
                    alt: "",
                  },
                ].map((n, i, arr) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-none flex-col items-center">
                      <span
                        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10.5px] font-extrabold ${
                          n.durum === "done"
                            ? "bg-primary text-white"
                            : n.durum === "active"
                              ? "bg-accent text-ink-900"
                              : "bg-page text-ink-300"
                        }`}
                      >
                        {n.durum === "done"
                          ? "✓"
                          : n.durum === "active"
                            ? "●"
                            : i + 1}
                      </span>
                      {i < arr.length - 1 && (
                        <span
                          className={`h-[26px] w-0.5 ${
                            n.durum === "done" ? "bg-primary" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-2.5">
                      <div
                        className={`text-[13px] font-bold ${
                          n.durum === "pending" || n.durum === "last"
                            ? "text-ink-300"
                            : "text-ink-900"
                        }`}
                      >
                        {n.baslik}
                      </div>
                      {n.alt && (
                        <div className="mt-0.5 text-[11.5px] font-medium text-ink-300">
                          {n.alt}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdim("onay")}
                  className="cursor-pointer rounded-[13px] bg-primary px-[22px] py-[15px] text-[14.5px] font-extrabold text-white hover:bg-primary-hover"
                >
                  Ürünü Teslim Aldım
                </button>
                <span className="text-[11.5px] font-medium leading-relaxed text-ink-300">
                  Ürün eline geçtiğinde bu butonla onay adımına geç.
                </span>
              </div>
            </section>
          )}

          {/* 3 · ONAY */}
          {adim === "onay" && (
            <section className="rounded-[18px] border border-border bg-card p-[22px]">
              <h2 className="mb-1 text-[17px] font-extrabold text-ink-900">
                Ürün elinde — kontrol et ve onayla
              </h2>
              <p className="mb-4 text-[12.5px] font-medium leading-relaxed text-ink-400">
                Onayladığında 4.320 TL (komisyon düşülmüş tutar) satıcıya
                aktarılır. Onaylamadan önce şunları kontrol et:
              </p>
              <div className="mb-[18px] flex flex-col gap-2">
                {[
                  "Ürün, sunumdaki fotoğraflar ve açıklamayla uyumlu mu?",
                  "İmza ve COA sertifikası eksiksiz mi?",
                  "Kutu ve disk, belirtilen durumda mı (yeni / çiziksiz)?",
                ].map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-[10px] bg-page px-3.5 py-3"
                  >
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-ink-900">
                      {i + 1}
                    </span>
                    <span className="text-[12.5px] font-semibold leading-snug text-ink-700">
                      {t}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdim("puan")}
                  className="cursor-pointer rounded-[13px] bg-primary px-[22px] py-[15px] text-[14.5px] font-extrabold text-white hover:bg-primary-hover"
                >
                  Ürünü Onayla — Ödemeyi Aktar
                </button>
                <Link
                  href="/itiraz"
                  className="rounded-[13px] border-[1.5px] border-danger-line bg-card px-[18px] py-3.5 text-[13px] font-bold text-danger hover:bg-danger-soft"
                >
                  Sorun var — itiraz başlat
                </Link>
              </div>
              <p className="mt-3.5 text-[11.5px] font-medium leading-relaxed text-ink-300">
                İtiraz başlatırsan ödeme aktarılmaz; BulBana destek ekibi
                incelemeye alır. Teslimden itibaren 3 gün içinde onay ya da itiraz
                gerekir.
              </p>
            </section>
          )}

          {/* 4 · DEĞERLENDİRME */}
          {adim === "puan" && (
            <section className="rounded-[18px] border border-border bg-card p-[22px]">
              <div className="rounded-control bg-primary-soft px-3.5 py-3 text-[13px] font-bold leading-snug text-primary-hover">
                Onayladın ✓ — 4.320 TL satıcıya aktarıldı (%4 komisyon düşüldü).
              </div>
              <h2 className="mb-1 mt-5 text-[17px] font-extrabold text-ink-900">
                Satıcıyı değerlendir
              </h2>
              <p className="mb-3.5 text-[12.5px] font-medium leading-relaxed text-ink-400">
                Değerlendirmen plakdukkani34&apos;ün profilinde görünür ve satıcı
                puanını etkiler.
              </p>
              {/* Üzerine gelinen yıldıza kadar olan tüm yıldızlar sarı yanar. */}
              <div
                className="mb-3.5 flex items-center gap-1.5"
                onMouseLeave={() => setHoverYildiz(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setYildiz(n)}
                    onMouseEnter={() => setHoverYildiz(n)}
                    onFocus={() => setHoverYildiz(n)}
                    onBlur={() => setHoverYildiz(0)}
                    aria-label={`${n} yıldız`}
                    className={`cursor-pointer bg-transparent p-0.5 text-[30px] leading-none transition-colors ${
                      (hoverYildiz || yildiz) >= n
                        ? "text-star"
                        : "text-border-input"
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-1.5 self-center text-[12.5px] font-semibold text-ink-400">
                  {yildiz === 0 ? "Yıldız seç" : `${yildiz}/5`}
                </span>
              </div>
              <textarea
                rows={3}
                value={yorum}
                onChange={(e) => setYorum(e.target.value.slice(0, 300))}
                placeholder="Deneyimini kısaca anlat: ürün, paketleme, iletişim..."
                className={`${control} resize-y text-[13px] font-medium leading-relaxed`}
              />
              <div className="mt-3.5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => puanOk && setAdim("tamam")}
                  disabled={!puanOk}
                  className={`rounded-[13px] px-[22px] py-[15px] text-[14.5px] font-extrabold ${
                    puanOk
                      ? "cursor-pointer bg-primary text-white hover:bg-primary-hover"
                      : "cursor-not-allowed bg-page text-ink-300"
                  }`}
                >
                  Değerlendirmeyi Gönder
                </button>
                <span className="text-[11.5px] font-medium leading-snug text-ink-300">
                  Yıldız seç + en az 10 karakter yorum yaz.
                </span>
              </div>
            </section>
          )}

          {/* 5 · TAMAM */}
          {adim === "tamam" && (
            <section className="rounded-[18px] border border-border bg-card px-[30px] py-10 text-center">
              <div className="mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white">
                ✓
              </div>
              <h2 className="mt-[18px] text-[22px] font-extrabold text-ink-900">
                İşlem tamamlandı!
              </h2>
              <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink-500">
                İmzalı Dawn FM koleksiyonunda, ödeme satıcıda, değerlendirmen
                yayında. BulBana&apos;yı kullandığın için teşekkürler.
              </p>
              <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/ilan-ac"
                  className="rounded-control bg-primary px-5 py-3.5 text-[13.5px] font-bold text-white hover:bg-primary-hover"
                >
                  Yeni Talep Aç
                </Link>
                <Link
                  href="/profil"
                  className="rounded-control border-[1.5px] border-border-input bg-card px-5 py-3 text-[13.5px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                >
                  Profilim
                </Link>
              </div>
            </section>
          )}
        </div>

        {/* ── Özet ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          <div className="rounded-panel border border-border bg-card p-[18px]">
            <div className="mb-3.5 text-sm font-extrabold text-ink-900">
              Sipariş Özeti
            </div>
            <div className="flex items-center gap-3 border-b border-hairline pb-3.5">
              <div className="ref-image flex h-[54px] w-[54px] flex-none items-center justify-center rounded-[10px] font-mono text-[8px] text-[#968cac]">
                görsel
              </div>
              <div>
                <Link
                  href="/ilan/dawn-fm-imzali-cd"
                  className="text-[13px] font-bold leading-snug text-ink-900"
                >
                  İmzalı The Weeknd &quot;Dawn FM&quot; CD
                </Link>
                <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                  Satıcı: plakdukkani34 <span className="text-star">★ 4.8</span>
                </div>
              </div>
            </div>
            <div className="mt-3.5 flex flex-col gap-2">
              <div className="flex justify-between text-[12.5px] font-medium">
                <span className="text-ink-400">Anlaşılan fiyat</span>
                <span className="font-bold text-ink-900">4.500 TL</span>
              </div>
              <div className="flex justify-between text-[12.5px] font-medium">
                <span className="text-ink-400">Kargo</span>
                <span className="font-bold text-primary-hover">
                  Satıcı karşılıyor
                </span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2 text-[12.5px] font-medium">
                <span className="font-bold text-ink-900">Ödenecek toplam</span>
                <span className="text-[15px] font-extrabold text-ink-900">
                  4.500 TL
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-ink-300">
              Satıcıya aktarılacak: 4.320 TL — %4 BulBana komisyonu (180 TL)
              satış bedelinden düşülür. Alıcı olarak ek ücret ödemezsin.
            </p>
          </div>

          <div className="rounded-panel bg-ink-900 p-[18px] text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-accent text-[13px] font-extrabold text-ink-900">
                ✓
              </div>
              <div className="text-[13.5px] font-extrabold">
                BulBana Güvencesi
              </div>
            </div>
            <p className="mt-2.5 text-[11.5px] font-medium leading-relaxed text-[#cfc5e8]">
              Ödemen, ürünü teslim alıp onaylayana kadar güvende. Ürün
              anlatıldığı gibi çıkmazsa itiraz et — paran iade edilir.
            </p>
          </div>

          <div className="rounded-panel border border-border bg-card p-4">
            <div className="text-[12px] font-bold uppercase tracking-[1px] text-ink-400">
              Yardım
            </div>
            <p className="mt-2 text-[12px] font-medium leading-relaxed text-ink-500">
              Sorun mu var?{" "}
              <Link href="/mesajlar" className="font-bold">
                Satıcıyla konuş
              </Link>{" "}
              ya da{" "}
              <Link href="/yardim" className="font-bold">
                destek ekibine yaz
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
