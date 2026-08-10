"use client";

import { useState } from "react";
import Link from "next/link";

function tr(s: string) {
  return s.toLocaleLowerCase("tr");
}

/* ── İkonlar ── */
function KisiIkon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DukkanIkon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 10.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 6.5 4.8 4.3A1 1 0 0 1 5.7 4h12.6a1 1 0 0 1 .9.5l1.3 2.2v1.1a2.4 2.4 0 0 1-4.8 0 2.4 2.4 0 0 1-4.8 0 2.4 2.4 0 0 1-4.8 0 2.4 2.4 0 0 1-4.8 0V6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SohbetIkon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9.5L6 20.5V17.5H5A1.5 1.5 0 0 1 3.5 16V7A1.5 1.5 0 0 1 5 5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Kategori kartındaki bağımsız açılır madde */
function KategoriAccordion({
  soru,
  cevap,
  renk = "mor",
}: {
  soru: string;
  cevap: string;
  renk?: "mor" | "yesil";
}) {
  const [acik, setAcik] = useState(false);
  const yesil = renk === "yesil";
  return (
    <div>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 text-left text-[13.5px] font-medium leading-snug ${
          yesil ? "text-accent-ink" : "text-primary"
        }`}
      >
        <span>{soru}</span>
        <span
          className={`flex h-4 w-4 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
            yesil
              ? "bg-accent-soft text-accent-ink"
              : "bg-primary-soft text-primary-hover"
          }`}
        >
          {acik ? "−" : "+"}
        </span>
      </button>
      {acik && (
        <div
          className={`mt-2 rounded-lg border-l-2 bg-subtle px-3 py-2.5 text-[13px] font-medium leading-relaxed text-ink-500 ${
            yesil ? "border-accent" : "border-primary"
          }`}
        >
          {cevap}
        </div>
      )}
    </div>
  );
}

type Makale = {
  baslik: string;
  kategori: string;
  href?: string;
  cevap?: string;
};

const makaleler: Makale[] = [
  {
    baslik: "Komisyon kimden, ne zaman alınır?",
    kategori: "Ödeme",
    href: "/nasil-calisir#komisyon",
  },
  {
    baslik: "Ödemem satıcıya ne zaman aktarılır?",
    kategori: "Ödeme",
    cevap:
      "Ödeme, alıcı teslimatı onaylayana kadar BulBana güvencesinde bekletilir; erken serbest bırakılmaz. Alıcı onay verdiği anda anlaşılan tutardan %4 komisyon düşülür ve kalan tutar satıcı cüzdanına aktarılır.",
  },
  {
    baslik: "Ürün anlatıldığı gibi çıkmazsa ne yapmalıyım?",
    kategori: "İtiraz",
    href: "/itiraz",
  },
  {
    baslik: "3 gün kargo kuralına uyulmazsa ne olur?",
    kategori: "Kargo",
    cevap:
      "Satıcı, teklif kabulünden sonraki 72 saat (3 gün) içinde kargolayıp takip numarasını girmezse satış otomatik olarak iptal edilir. Bu durumda alıcının ödemesi eksiksiz iade edilir ve gecikme satıcının performans puanına yansır.",
  },
  {
    baslik: "Sunumumu kimler görebilir?",
    kategori: "Satıcı",
    href: "/nasil-calisir",
  },
  {
    baslik: "Talebimin süresini nasıl uzatırım?",
    kategori: "Alıcı",
    cevap:
      "Taleplerim / İlan Yönetimi sayfasından ilanını açıp süreyi +7 veya +14 gün uzatabilirsin (toplamda en fazla 30 gün). İstersen aynı ekrandan talebini erkenden de kapatabilirsin; süre uzatmak ücretsizdir.",
  },
  {
    baslik: "Pazarlıkta ek ücret öder miyim?",
    kategori: "Teklif",
    href: "/nasil-calisir",
  },
  {
    baslik: "Hesabımı nasıl doğrularım?",
    kategori: "Hesap",
    cevap:
      "Kimlik Doğrulama sayfasından kimliğinin ön ve arka yüzü ile bir selfie yüklemen yeterli. Belgeler SSL ile şifrelenir, ekip ortalama 24 saat içinde inceler ve onaylandığında profiline “✓ Kimlik doğrulandı” rozeti eklenir.",
  },
];

export function YardimClient() {
  const [q, setQ] = useState("");
  const [acikBaslik, setAcikBaslik] = useState<string | null>(null);

  const qq = tr(q.trim());
  const sonuc = makaleler.filter(
    (m) => !qq || tr(m.baslik).includes(qq) || tr(m.kategori).includes(qq),
  );

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-12">
      {/* ── Hero + arama ── */}
      <div className="mx-auto max-w-[560px] text-center">
        <h1 className="text-[34px] font-extrabold leading-[1.15] tracking-[-1px] text-ink-900">
          Nasıl yardımcı olabiliriz?
        </h1>
        <div className="mt-[18px] flex items-center gap-2 rounded-[14px] border-[1.5px] border-border-input bg-card px-4 py-3.5 focus-within:border-primary">
          <span className="block h-[15px] w-[15px] flex-none rounded-full border-2 border-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 50))}
            placeholder="Konu ara: komisyon, kargo, itiraz..."
            className="w-full border-none bg-transparent text-[15px] font-medium text-ink-900 outline-none"
          />
        </div>
      </div>

      {/* ── Kategoriler ── */}
      <div className="mt-9 grid gap-4 md:grid-cols-3">
        {/* Alıcılar (mor) */}
        <div className="rounded-card border border-border bg-card p-5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-primary-soft text-primary-hover">
            <KisiIkon className="h-[18px] w-[18px]" />
          </div>
          <div className="mt-3 text-[16px] font-extrabold text-ink-900">
            Alıcılar
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            <Link
              href="/nasil-calisir"
              className="text-[13.5px] font-medium leading-snug text-primary"
            >
              Talep nasıl açılır?
            </Link>
            <Link
              href="/nasil-calisir"
              className="text-[13.5px] font-medium leading-snug text-primary"
            >
              Sunumları kim görür?
            </Link>
            <KategoriAccordion
              renk="mor"
              soru="Alıcı kalitesi nasıl hesaplanır?"
              cevap="Alıcı kalitesi; tamamladığın alımlar, mesajlara yanıt hızın ve iptal oranın birlikte değerlendirilerek hesaplanır. Skorun yükseldikçe profilinde “güvenilir alıcı” rozeti belirir; satıcılar bu rozeti gördüğünde talebine daha çok ve daha iyi sunum gönderir."
            />
          </div>
        </div>

        {/* Satıcılar (yeşil) */}
        <div className="rounded-card border border-border bg-card p-5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-accent text-ink-900">
            <DukkanIkon className="h-[18px] w-[18px]" />
          </div>
          <div className="mt-3 text-[16px] font-extrabold text-ink-900">
            Satıcılar
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            <KategoriAccordion
              renk="yesil"
              soru="İyi sunum nasıl hazırlanır?"
              cevap="İyi bir sunum; ürünü net gösteren gerçek fotoğraflar, dürüst bir durum açıklaması ve alıcının bütçesine uygun bir fiyat beklentisi içerir. İmzalı ya da koleksiyon ürünlerinde sertifika veya kanıt fotoğrafı eklemek sunumunu diğerlerinin önüne taşır."
            />
            <Link
              href="/nasil-calisir"
              className="text-[13.5px] font-medium leading-snug text-accent-ink"
            >
              Teklif ve pazarlık kuralları
            </Link>
            <KategoriAccordion
              renk="yesil"
              soru="3 gün kargo kuralı nedir?"
              cevap="Teklifin kabul edilip ödeme güvenceye alındıktan sonra satıcının 72 saat (3 gün) içinde ürünü kargoya verip takip numarasını girmesi gerekir. Süre aşılırsa satış otomatik iptal olur ve alıcının ödemesi eksiksiz iade edilir."
            />
          </div>
        </div>

        {/* Ödeme & Komisyon (mor) */}
        <div className="rounded-card border border-border bg-card p-5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-primary-soft text-[16px] font-extrabold text-primary-hover">
            ₺
          </div>
          <div className="mt-3 text-[16px] font-extrabold text-ink-900">
            Ödeme &amp; Komisyon
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            <Link
              href="/nasil-calisir#komisyon"
              className="text-[13.5px] font-medium leading-snug text-primary"
            >
              %4 komisyon modeli
            </Link>
            <KategoriAccordion
              renk="mor"
              soru="Ödemem ne zaman aktarılır?"
              cevap="Ödeme, alıcı ürünü teslim alıp onaylayana kadar BulBana güvencesinde tutulur. Alıcı teslimatı onayladığı anda anlaşılan tutardan %4 komisyon düşülür ve kalan tutar satıcı cüzdanına aktarılır."
            />
            <Link
              href="/itiraz"
              className="text-[13.5px] font-medium leading-snug text-primary"
            >
              İtiraz ve iade süreci
            </Link>
          </div>
        </div>
      </div>

      {/* ── Popüler konular ── */}
      <div className="mx-auto mt-10 max-w-[760px]">
        <h2 className="mb-3.5 text-xl font-extrabold text-ink-900">
          Popüler konular
        </h2>
        {sonuc.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sonuc.map((m) => {
              const kategoriRozet = (
                <span className="flex-none text-[12.5px] font-semibold text-ink-500">
                  {m.kategori}
                </span>
              );

              if (!m.cevap) {
                return (
                  <Link
                    key={m.baslik}
                    href={m.href ?? "/yardim"}
                    className="flex items-center gap-3 rounded-control border border-border bg-card px-4 py-3.5 hover:border-primary"
                  >
                    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-primary-soft text-primary-hover">
                      <SohbetIkon className="h-[14px] w-[14px]" />
                    </span>
                    <span className="flex-1 text-[14.5px] font-semibold leading-snug text-ink-900">
                      {m.baslik}
                    </span>
                    {kategoriRozet}
                  </Link>
                );
              }

              const acik = acikBaslik === m.baslik;
              return (
                <div
                  key={m.baslik}
                  className={`rounded-control bg-card ${
                    acik
                      ? "border-[1.5px] border-primary"
                      : "border border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setAcikBaslik(acik ? null : m.baslik)
                    }
                    aria-expanded={acik}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left hover:opacity-80"
                  >
                    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-primary-soft text-primary-hover">
                      <SohbetIkon className="h-[14px] w-[14px]" />
                    </span>
                    <span
                      className={`flex-1 text-[14.5px] font-semibold leading-snug ${
                        acik ? "text-primary-hover" : "text-ink-900"
                      }`}
                    >
                      {m.baslik}
                    </span>
                    {kategoriRozet}
                  </button>
                  {acik && (
                    <p className="px-4 pb-3.5 pl-[54px] text-[14px] font-medium leading-relaxed text-ink-700">
                      {m.cevap}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-control border border-border bg-card p-6 text-center text-[14px] font-medium text-ink-500">
            Aramana uyan konu bulunamadı — aşağıdan destek talebi
            oluşturabilirsin.
          </div>
        )}
      </div>

      {/* ── İletişim ── */}
      <div className="mx-auto mt-7 flex max-w-[760px] flex-wrap items-center gap-[18px] rounded-panel bg-ink-900 p-[26px] text-white">
        <div className="min-w-[260px] flex-1">
          <div className="text-[17px] font-extrabold leading-snug">
            Aradığını bulamadın mı?
          </div>
          <div className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-[#ddd5f0]">
            Destek ekibi hafta içi 09.00–18.00 arasında ortalama 2 saatte
            yanıtlar. destek@bulbana.com
          </div>
        </div>
        <Link
          href="/destek"
          className="flex-none rounded-control bg-accent px-[22px] py-[15px] text-sm font-extrabold text-ink-900 hover:brightness-95"
        >
          Destek Talebi Oluştur
        </Link>
      </div>
    </main>
  );
}
