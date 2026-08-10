"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { kategoriler, iller } from "@/lib/data";

const roller = [
  {
    id: "alici",
    harf: "A",
    ad: "Alıcıyım",
    sub: "Bulamadığım ürünler var; ilan açıp satıcıların bana gelmesini istiyorum.",
  },
  {
    id: "satici",
    harf: "S",
    ad: "Satıcıyım",
    sub: "Elimde ürünler var; gerçek taleplere sunum gönderip satmak istiyorum.",
  },
  {
    id: "ikisi",
    harf: "+",
    ad: "İkisi de",
    sub: "Hem aradıklarım hem satacaklarım var — tek hesapta ikisini de yapacağım.",
  },
] as const;

const rolAd: Record<string, string> = {
  alici: "alıcı",
  satici: "satıcı",
  ikisi: "hem alıcı hem satıcı",
};

const butceler = [
  "0 – 500 TL",
  "500 – 2.000 TL",
  "2.000 – 10.000 TL",
  "10.000 TL ve üzeri",
  "Değişken / fark etmez",
];

const bildirimler = [
  { ad: "E-posta", sub: "Özet ve önemli gelişmeler" },
  { ad: "Anlık bildirim", sub: "Yeni sunum ve mesajlar" },
  { ad: "SMS", sub: "Yalnızca kritik uyarılar" },
  { ad: "WhatsApp", sub: "Teklif ve sohbet hatırlatmaları" },
];

const TOPLAM = 5;

const adimTanim = [
  { n: 1, ad: "Rol seçimi", desc: "BulBana'yı nasıl kullanacaksın?" },
  { n: 2, ad: "İlgi alanları", desc: "Hangi kategoriler ilgini çeker?" },
  { n: 3, ad: "Bütçe aralığı", desc: "Genelde ne kadarlık alışveriş?" },
  { n: 4, ad: "Konum", desc: "Ağırlıklı olarak nerelisin?" },
  { n: 5, ad: "Bildirimler", desc: "Fırsatları nasıl duyalım?" },
];

export default function HosGeldinPage() {
  const [adim, setAdim] = useState(1);
  const [rol, setRol] = useState("");
  const [kats, setKats] = useState<string[]>([]);
  const [butce, setButce] = useState("");
  const [il, setIl] = useState("");
  const [kanallar, setKanallar] = useState<string[]>(["E-posta", "Anlık bildirim"]);

  const r1ok = rol !== "";
  const r2ok = kats.length >= 3;
  const r3ok = butce !== "";
  const r4ok = il !== "";
  const r5ok = kanallar.length >= 1;
  const bitti = adim === TOPLAM + 1;

  function toggleKat(ad: string) {
    setKats((prev) =>
      prev.includes(ad) ? prev.filter((k) => k !== ad) : [...prev, ad],
    );
  }
  function toggleKanal(ad: string) {
    setKanallar((prev) =>
      prev.includes(ad) ? prev.filter((k) => k !== ad) : [...prev, ad],
    );
  }

  const devamAktif =
    "cursor-pointer rounded-control bg-primary px-[26px] py-[15px] text-[14px] font-extrabold text-white hover:bg-primary-hover";
  const devamPasif =
    "cursor-not-allowed rounded-control bg-[#efebf5] px-[26px] py-[15px] text-[14px] font-extrabold text-ink-300";
  const geriBtn =
    "cursor-pointer bg-transparent py-1.5 text-[12.5px] font-semibold text-ink-400 hover:text-ink-900";
  const chip =
    "cursor-pointer rounded-full border-[1.5px] px-4 py-3 text-[13px] transition-colors";

  const secilenKats = kats.slice(0, 3).join(", ");
  const ozet = `Profilin ${rolAd[rol] ?? ""} odaklı kuruldu${
    secilenKats ? `; ${secilenKats} kategorilerini takibe aldık` : ""
  }${il ? ` ve ${il} çevresini merkeze aldık` : ""}. Bildirimleri ${
    kanallar.join(", ") || "seçtiğin kanallardan"
  } üzerinden ulaştıracağız. Bunları istediğin zaman Ayarlar'dan değiştirebilirsin.`;

  // Adım başlığı için üst etiket
  const ustEtiket =
    adim === 1
      ? "Hoş geldin, emre.k"
      : adim === TOPLAM
        ? "Son adım"
        : "Seni tanıyalım";

  return (
    <main className="grid min-h-screen w-full self-stretch md:grid-cols-[1fr_1.1fr]">
      {/* ── Sol: marka + dikey adım göstergesi (giriş ekranıyla aynı stil) ── */}
      <aside className="hidden flex-col bg-ink-900 p-11 text-white md:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-white">
            <Image src="/logo.png" alt="" width={26} height={27} className="block" />
          </span>
          <span>
            <span className="block text-[22px] font-extrabold leading-none tracking-[-0.5px] text-white">
              bul<span className="text-[#a78bfa]">bana</span>
            </span>
            <span className="mt-[3px] block text-[9.5px] font-semibold tracking-[0.8px] text-[#8b7bb0]">
              SEN İSTE, SATICI BULSUN
            </span>
          </span>
        </Link>

        <div className="my-auto py-12">
          <span className="inline-block rounded-lg bg-accent px-3 py-2 text-[11px] font-extrabold uppercase tracking-[1.6px] text-ink-900">
            Kuruluma başla
          </span>
          <h1 className="mt-[18px] text-balance text-[34px] font-extrabold leading-[1.15] tracking-[-1px]">
            Hesabını sana
            <br />
            göre kuralım.
          </h1>
          <p className="mt-3.5 max-w-[380px] text-pretty text-[14px] font-medium leading-[1.6] text-[#cfc5e8]">
            Beş kısa adım — Keşfet&apos;ini, önerilerini ve bildirimlerini buna
            göre ayarlayalım.
          </p>

          {/* Dikey stepper */}
          <ol className="mt-8">
            {adimTanim.map((a) => {
              const done = adim > a.n || bitti;
              const active = adim === a.n && !bitti;
              return (
                <li key={a.n} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12.5px] font-extrabold transition-colors ${
                        done
                          ? "bg-accent text-ink-900"
                          : active
                            ? "bg-white text-ink-900"
                            : "bg-white/10 text-white/45"
                      }`}
                    >
                      {done ? "✓" : a.n}
                    </span>
                    {a.n < TOPLAM && (
                      <span
                        className={`my-1 w-0.5 flex-1 rounded ${
                          done ? "bg-accent" : "bg-white/12"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pb-4">
                    <div
                      className={`text-[13.5px] font-bold ${
                        active || done ? "text-white" : "text-white/45"
                      }`}
                    >
                      {a.ad}
                    </div>
                    <div
                      className={`mt-0.5 text-[11.5px] leading-snug ${
                        active ? "text-white/70" : "text-white/40"
                      }`}
                    >
                      {a.desc}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="text-[12px] font-medium text-[#8b7bb0]">© 2026 BulBana</div>
      </aside>

      {/* ── Sağ: adım içeriği ── */}
      <section className="flex flex-col justify-center bg-page px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-[620px] rounded-[22px] border border-border bg-white p-7 sm:p-9">
          {/* Mobil ilerleme */}
          <div className="mb-7 flex gap-1.5 md:hidden">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full ${
                  adim > n || bitti
                    ? "bg-primary"
                    : adim === n
                      ? "bg-accent"
                      : "bg-border-input"
                }`}
              />
            ))}
          </div>

          <div key={adim} className="animate-step-in">
            {/* Üst etiket (bitişte gizli) */}
            {!bitti && (
              <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-primary">
                {ustEtiket} · Adım {adim}/{TOPLAM}
              </div>
            )}

            {/* ADIM 1: ROL */}
            {adim === 1 && (
              <div>
                <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
                  BulBana&apos;yı nasıl kullanmak istersin?
                </h1>
                <p className="mb-6 mt-2 text-[13.5px] font-medium leading-relaxed text-ink-400">
                  Hesabın her ikisini de yapabilir — bu seçim yalnızca sana
                  göstereceklerimizi kişiselleştirir.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {roller.map((r) => {
                    const active = rol === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRol(r.id)}
                        className={`cursor-pointer rounded-2xl border-2 p-[18px] text-left transition-colors ${
                          active
                            ? "border-primary bg-primary-soft"
                            : "border-border bg-card hover:border-primary"
                        }`}
                      >
                        <span
                          className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-[15px] font-extrabold ${
                            active
                              ? "bg-primary text-white"
                              : "bg-page text-ink-500"
                          }`}
                        >
                          {r.harf}
                        </span>
                        <span
                          className={`mt-3 block text-[14.5px] font-extrabold leading-tight ${
                            active ? "text-primary-hover" : "text-ink-900"
                          }`}
                        >
                          {r.ad}
                          {active ? " ✓" : ""}
                        </span>
                        <span
                          className={`mt-[5px] block text-[11.5px] font-medium leading-[1.5] ${
                            active ? "text-ink-700" : "text-ink-400"
                          }`}
                        >
                          {r.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-hairline pt-5">
                  <Link
                    href="/kesfet"
                    className="text-[12.5px] font-semibold text-ink-300 hover:text-ink-500"
                  >
                    Şimdilik atla
                  </Link>
                  <button
                    type="button"
                    disabled={!r1ok}
                    onClick={() => r1ok && setAdim(2)}
                    className={r1ok ? devamAktif : devamPasif}
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            )}

            {/* ADIM 2: İLGİ ALANLARI */}
            {adim === 2 && (
              <div>
                <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
                  Hangi kategoriler ilgini çeker?
                </h1>
                <p className="mb-6 mt-2 text-[13.5px] font-medium leading-relaxed text-ink-400">
                  En az 3 kategori seç — Keşfet sayfanı ve bildirimlerini buna
                  göre düzenleriz.{" "}
                  <span className="font-bold text-ink-900">
                    {kats.length >= 3 ? `${kats.length} seçildi ✓` : `${kats.length}/3`}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {kategoriler.map((k) => {
                    const active = kats.includes(k.ad);
                    return (
                      <button
                        key={k.ad}
                        type="button"
                        onClick={() => toggleKat(k.ad)}
                        className={`${chip} ${
                          active
                            ? "border-primary bg-primary-soft font-bold text-primary-hover"
                            : "border-border-input bg-card font-semibold text-ink-500 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {k.ad}
                        {active ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-hairline pt-5">
                  <button
                    type="button"
                    onClick={() => setAdim(1)}
                    className={geriBtn}
                  >
                    ‹ Geri
                  </button>
                  <button
                    type="button"
                    disabled={!r2ok}
                    onClick={() => r2ok && setAdim(3)}
                    className={r2ok ? devamAktif : devamPasif}
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            )}

            {/* ADIM 3: BÜTÇE */}
            {adim === 3 && (
              <div>
                <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
                  Genelde ne aralıkta alışveriş yaparsın?
                </h1>
                <p className="mb-6 mt-2 text-[13.5px] font-medium leading-relaxed text-ink-400">
                  Sana uygun talep ve fırsatları öne çıkarmak için — kesin
                  değil, sonradan değişebilir.
                </p>
                <div className="flex flex-col gap-2.5">
                  {butceler.map((b) => {
                    const active = butce === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setButce(b)}
                        className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left text-[14px] transition-colors ${
                          active
                            ? "border-primary bg-primary-soft font-bold text-primary-hover"
                            : "cursor-pointer border-border bg-card font-semibold text-ink-700 hover:border-primary"
                        }`}
                      >
                        {b}
                        <span
                          className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-extrabold ${
                            active
                              ? "bg-primary text-white"
                              : "border-[1.5px] border-border-input"
                          }`}
                        >
                          {active ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-hairline pt-5">
                  <button
                    type="button"
                    onClick={() => setAdim(2)}
                    className={geriBtn}
                  >
                    ‹ Geri
                  </button>
                  <button
                    type="button"
                    disabled={!r3ok}
                    onClick={() => r3ok && setAdim(4)}
                    className={r3ok ? devamAktif : devamPasif}
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            )}

            {/* ADIM 4: KONUM */}
            {adim === 4 && (
              <div>
                <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
                  Ağırlıklı olarak nerelisin?
                </h1>
                <p className="mb-6 mt-2 text-[13.5px] font-medium leading-relaxed text-ink-400">
                  Konumunu seç — yakınındaki talepleri ve bölgene özel fırsatları
                  öne çıkaralım.
                </p>
                <div className="flex flex-wrap gap-2">
                  {iller.map((i) => {
                    const active = il === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIl(i)}
                        className={`${chip} ${
                          active
                            ? "border-primary bg-primary-soft font-bold text-primary-hover"
                            : "border-border-input bg-card font-semibold text-ink-500 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {i}
                        {active ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-hairline pt-5">
                  <button
                    type="button"
                    onClick={() => setAdim(3)}
                    className={geriBtn}
                  >
                    ‹ Geri
                  </button>
                  <button
                    type="button"
                    disabled={!r4ok}
                    onClick={() => r4ok && setAdim(5)}
                    className={r4ok ? devamAktif : devamPasif}
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            )}

            {/* ADIM 5: BİLDİRİMLER */}
            {adim === 5 && (
              <div>
                <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
                  Fırsatları nasıl duymak istersin?
                </h1>
                <p className="mb-6 mt-2 text-[13.5px] font-medium leading-relaxed text-ink-400">
                  Bir talebine sunum düştüğünde veya aradığın ürün çıktığında
                  seni buradan haberdar ederiz.{" "}
                  <span className="font-bold text-ink-900">
                    {kanallar.length} seçili
                  </span>
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {bildirimler.map((b) => {
                    const active = kanallar.includes(b.ad);
                    return (
                      <button
                        key={b.ad}
                        type="button"
                        onClick={() => toggleKanal(b.ad)}
                        className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary-soft"
                            : "cursor-pointer border-border bg-card hover:border-primary"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md text-[11px] font-extrabold ${
                            active
                              ? "bg-primary text-white"
                              : "border-[1.5px] border-border-input"
                          }`}
                        >
                          {active ? "✓" : ""}
                        </span>
                        <span>
                          <span
                            className={`block text-[14px] font-extrabold leading-tight ${
                              active ? "text-primary-hover" : "text-ink-900"
                            }`}
                          >
                            {b.ad}
                          </span>
                          <span
                            className={`mt-0.5 block text-[11.5px] font-medium leading-[1.5] ${
                              active ? "text-ink-700" : "text-ink-400"
                            }`}
                          >
                            {b.sub}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-hairline pt-5">
                  <button
                    type="button"
                    onClick={() => setAdim(4)}
                    className={geriBtn}
                  >
                    ‹ Geri
                  </button>
                  <button
                    type="button"
                    disabled={!r5ok}
                    onClick={() => r5ok && setAdim(TOPLAM + 1)}
                    className={r5ok ? devamAktif : devamPasif}
                  >
                    Bitir
                  </button>
                </div>
              </div>
            )}

            {/* BİTİŞ */}
            {bitti && (
              <div className="flex min-h-[360px] flex-col items-center justify-center py-4 text-center">
                <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white shadow-[0_10px_26px_rgb(124_58_237/0.35)]">
                  ✓
                </div>
                <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
                  Hazırsın, emre.k!
                </h1>
                <p className="mx-auto mt-2.5 max-w-[460px] text-[13.5px] font-medium leading-relaxed text-ink-500">
                  {ozet}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  <Link
                    href="/kesfet"
                    className="rounded-control bg-primary px-[22px] py-[15px] text-[14px] font-extrabold text-white hover:bg-primary-hover"
                  >
                    Talepleri Keşfet
                  </Link>
                  {/* Satıcının ilk adımı sunum göndermek; alıcı/ikisi ise ilan açmak. */}
                  {rol === "satici" ? (
                    <Link
                      href="/kesfet"
                      className="rounded-control bg-accent px-[22px] py-[15px] text-[14px] font-extrabold text-ink-900 hover:brightness-95"
                    >
                      Taleplere Sunum Gönder
                    </Link>
                  ) : (
                    <Link
                      href="/ilan-ac"
                      className="rounded-control bg-accent px-[22px] py-[15px] text-[14px] font-extrabold text-ink-900 hover:brightness-95"
                    >
                      İlk İlanını Aç
                    </Link>
                  )}
                </div>
                <p className="mt-5 text-[11.5px] font-medium leading-relaxed text-ink-400">
                  İpucu: Güven rozetin için{" "}
                  <Link href="/kimlik-dogrulama" className="font-bold text-primary">
                    kimliğini doğrula
                  </Link>{" "}
                  — sunumların daha çok kabul görür.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
