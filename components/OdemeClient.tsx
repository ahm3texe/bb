"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { fiyatText } from "@/lib/data";
import type { Anlasma } from "@/lib/anlasma";
import type { KayitliKart } from "@/lib/kart";
import { kartNoBicimle, sktBicimle } from "@/lib/kart";

/**
 * Ödeme akışı — sohbetteki "Ödemeye Geç" buradan devam eder.
 *
 * Sayaç ödeme ekranına GİRİLDİĞİNDE değil, adımlar tamamlanıp ödeme
 * doğrulandığında başlar: `/api/anlasmalar/<id>/odeme` ancak son adımda
 * çağrılır.
 *
 * Kart adımı iki yoldan yürür: kullanıcının ayarlarda kaydettiği
 * kartlardan biri seçilir (yalnızca CVV sorulur) ya da "başka kart"
 * seçilip alanlar elle doldurulur.
 *
 * PROTOTİP: burada gerçek bir tahsilat yok. Girilen değerler hiçbir yere
 * gönderilmez (sunucuya giden istekte gövde bile yoktur); kayıtlı
 * kartlarda da yalnızca maskeli bilgi durur. Gerçek sistemde bu adım
 * sağlayıcının kendi sayfasına devredilir — bkz. BACKEND.md.
 */
type Adim = "ozet" | "bilgi" | "dogrulama" | "tamam";

export function OdemeClient({
  anlasma,
  urun,
  teslim,
}: {
  anlasma: Anlasma;
  urun: string;
  teslim: string;
}) {
  const router = useRouter();
  const [adim, setAdim] = useState<Adim>("ozet");
  const [hata, setHata] = useState("");

  return (
    <main className="mx-auto max-w-[720px] px-6 pb-20 pt-8">
      <AdimSeridi adim={adim} />

      <div className="mt-5 rounded-panel border border-border bg-card p-6">
        {adim === "ozet" && (
          <Ozet
            anlasma={anlasma}
            urun={urun}
            teslim={teslim}
            onDevam={() => setAdim("bilgi")}
          />
        )}

        {adim === "bilgi" && (
          <OdemeBilgisi
            tutar={anlasma.tutar}
            onGeri={() => setAdim("ozet")}
            onDevam={async () => {
              setAdim("dogrulama");
              setHata("");
              // Ödeme ancak burada kayda geçer; sayaç bu yanıttan sonra başlar.
              const r = await fetch(
                `/api/anlasmalar/${encodeURIComponent(anlasma.sunumId)}/odeme`,
                { method: "POST" },
              ).catch(() => undefined);
              if (!r?.ok) {
                const veri = (await r?.json().catch(() => ({}))) as {
                  hata?: string;
                };
                setHata(veri.hata ?? "Ödeme doğrulanamadı. Tekrar dene.");
                setAdim("bilgi");
                return;
              }
              setAdim("tamam");
            }}
            hata={hata}
          />
        )}

        {adim === "dogrulama" && <Dogrulama />}

        {adim === "tamam" && (
          <Tamamlandi
            kargoSaat={anlasma.kargoSaat}
            satici={anlasma.satici}
            onSohbet={() => router.push("/mesajlar")}
          />
        )}
      </div>

      <p className="mt-4 text-center text-[12.5px] font-medium leading-relaxed text-ink-400">
        Tasarlanan akışta ödeme Bulbana güvencesinde tutulur ve satıcıya ancak
        ürünü teslim alıp onayladıktan sonra aktarılır. Ödeme sağlayıcısı
        henüz bağlı değil — bu prototipte tahsilat yapılmaz.
      </p>
    </main>
  );
}

/** Üstteki adım göstergesi — kullanıcı nerede olduğunu görsün. */
function AdimSeridi({ adim }: { adim: Adim }) {
  const adimlar: { k: Adim; ad: string }[] = [
    { k: "ozet", ad: "Sipariş özeti" },
    { k: "bilgi", ad: "Ödeme bilgileri" },
    { k: "dogrulama", ad: "Doğrulama" },
    { k: "tamam", ad: "Tamamlandı" },
  ];
  const sira = adimlar.findIndex((a) => a.k === adim);

  return (
    <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      {adimlar.map((a, i) => {
        const gecti = i < sira;
        const aktif = i === sira;
        return (
          <li key={a.k} className="flex items-center gap-2.5">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
                aktif
                  ? "bg-primary text-white"
                  : gecti
                    ? "bg-primary-soft text-primary-hover"
                    : "bg-subtle text-ink-400"
              }`}
            >
              <span aria-hidden>{gecti ? "✓" : i + 1}</span>
              {a.ad}
            </span>
            {i < adimlar.length - 1 && (
              <span aria-hidden className="text-ink-300">
                ›
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Ozet({
  anlasma,
  urun,
  teslim,
  onDevam,
}: {
  anlasma: Anlasma;
  urun: string;
  teslim: string;
  onDevam: () => void;
}) {
  return (
    <>
      <h1 className="text-[22px] font-extrabold text-ink-900">Sipariş özeti</h1>
      <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-ink-500">
        Ödemeyi tamamladığında satıcının kargo süresi başlar ve sohbette sayaç
        işlemeye başlar.
      </p>

      <dl className="mt-5 divide-y divide-hairline rounded-card border border-border">
        <Satir ad="Ürün" deger={urun} />
        <Satir ad="Satıcı" deger={anlasma.satici} />
        <Satir ad="Kargoya verme sözü" deger={teslim || `${anlasma.kargoSaat} saat`} />
        <Satir
          ad="Anlaşılan tutar"
          deger={fiyatText(anlasma.tutar)}
          vurgulu
        />
      </dl>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onDevam}
          className="cursor-pointer rounded-control bg-primary px-6 py-3.5 text-[15px] font-bold text-white hover:bg-primary-hover"
        >
          Ödeme Adımına Geç ›
        </button>
        <Link
          href="/mesajlar"
          className="rounded-control border border-border-input px-6 py-3.5 text-[15px] font-bold text-ink-900 hover:border-ink-400"
        >
          Sohbete Dön
        </Link>
      </div>
    </>
  );
}

function Satir({
  ad,
  deger,
  vurgulu = false,
}: {
  ad: string;
  deger: string;
  vurgulu?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-[13.5px] font-medium text-ink-500">{ad}</dt>
      <dd
        className={
          vurgulu
            ? "text-[19px] font-extrabold text-primary-hover"
            : "text-right text-[14px] font-bold text-ink-900"
        }
      >
        {deger}
      </dd>
    </div>
  );
}

function OdemeBilgisi({
  tutar,
  onGeri,
  onDevam,
  hata,
}: {
  tutar: number;
  onGeri: () => void;
  onDevam: () => void;
  hata: string;
}) {
  // Kayıtlı kartlar ayarlardaki listeyle aynı kaynaktan gelir.
  const [kartlar, setKartlar] = useState<KayitliKart[]>([]);
  // "" = yeni kart girişi; aksi hâlde seçili kayıtlı kartın kimliği.
  const [secili, setSecili] = useState("");

  const [kart, setKart] = useState("");
  const [adSoyad, setAdSoyad] = useState("");
  const [skt, setSkt] = useState("");
  const [cvv, setCvv] = useState("");
  const [formHata, setFormHata] = useState("");

  useEffect(() => {
    let iptal = false;
    fetch("/api/kartlar")
      .then((r) => (r.ok ? r.json() : { kartlar: [] }))
      .then((v: { kartlar?: KayitliKart[] }) => {
        if (iptal) return;
        const gelen = v.kartlar ?? [];
        setKartlar(gelen);
        // Varsayılan kart baştan seçili gelir; kullanıcı isterse değiştirir.
        const varsayilan = gelen.find((k) => k.varsayilan) ?? gelen[0];
        if (varsayilan) setSecili(varsayilan.id);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  const seciliKart = kartlar.find((k) => k.id === secili);
  const rakam = (s: string) => s.replace(/\D/g, "");
  // Kayıtlı kartta yalnızca CVV sorulur — numara ve tarih zaten kayıtta.
  const eksik = seciliKart
    ? rakam(cvv).length !== 3
    : rakam(kart).length !== 16 ||
      adSoyad.trim().length < 5 ||
      !/^\d{2}\/\d{2}$/.test(skt) ||
      rakam(cvv).length !== 3;

  return (
    <>
      <h1 className="text-[22px] font-extrabold text-ink-900">
        Ödeme bilgileri
      </h1>
      <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-ink-500">
        Ödenecek tutar{" "}
        <strong className="text-ink-900">{fiyatText(tutar)}</strong>.
      </p>

      {/*
        PROTOTİP UYARISI — kullanıcıya GÖRÜNÜR olmak zorunda.

        Bu ekran gerçek kart numarası ve CVV istiyor, hiçbir yere göndermeden
        atıyor, sonra "Ödeme alındı" diyor. Prototip olduğu yalnızca kaynak
        kodun yorumunda yazılıydı; ekranı kullanan kişi bunu göremiyordu ve
        gerçek kartını yazabilirdi. Tahsilat sağlayıcısı bağlandığında
        (bkz. BACKEND.md → Ödeme gerçek değil) bu kutu kaldırılır.
      */}
      <p
        role="note"
        className="mt-4 rounded-xl border border-danger-line bg-danger-soft px-3.5 py-3 text-[12.5px] font-semibold leading-[1.5] text-danger"
      >
        Prototip: burada gerçek bir tahsilat yapılmaz. Girdiğin kart bilgisi
        hiçbir yere gönderilmez ve kaydedilmez —{" "}
        <b>gerçek kart bilgisi girme.</b> Sipariş kaydı yine de oluşur ve
        satıcının kargo süresi başlar.
      </p>

      {kartlar.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-[13px] font-bold text-ink-900">
            Kayıtlı kartı kullan
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {kartlar.map((k) => (
              <KartSecenegi
                key={k.id}
                secili={secili === k.id}
                onSec={() => {
                  setSecili(k.id);
                  setCvv("");
                  setFormHata("");
                }}
                baslik={`${k.marka} •••• ${k.son4}`}
                alt={`${k.isim} · Son kullanma: ${k.skt}`}
                rozet={k.varsayilan ? "Varsayılan" : undefined}
              />
            ))}
            <KartSecenegi
              secili={secili === ""}
              onSec={() => {
                setSecili("");
                setCvv("");
                setFormHata("");
              }}
              baslik="Başka kart kullan"
              alt="Kart bilgilerini elle gir"
            />
          </div>
        </fieldset>
      )}

      <div className="mt-4 rounded-card border border-accent-line bg-accent-soft px-4 py-3 text-[12.5px] font-semibold leading-relaxed text-ink-900">
        Bu ekran prototiptir: girdiğin bilgiler hiçbir yere gönderilmez ve
        saklanmaz. Kayıtlı kartlarda da yalnızca marka, son dört hane ve son
        kullanma tarihi tutulur; kart numarası ve CVV asla saklanmaz.
      </div>

      {seciliKart ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-card border border-border bg-subtle px-4 py-3">
            <div className="text-[15px] font-extrabold text-ink-900">
              {seciliKart.marka} •••• {seciliKart.son4}
            </div>
            <div className="mt-0.5 text-[12.5px] font-medium text-ink-500">
              {seciliKart.isim} · Son kullanma: {seciliKart.skt}
            </div>
          </div>
          <Alan
            id="kart-cvv"
            etiket="CVV"
            deger={cvv}
            onDegis={setCvv}
            yerTutucu="000"
            inputMode="numeric"
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Alan
            id="kart-no"
            etiket="Kart numarası"
            deger={kart}
            // Rakamlar dörderli hizalanır; kullanıcı boşluk yazmaz.
            onDegis={(v) => setKart(kartNoBicimle(v))}
            yerTutucu="0000 0000 0000 0000"
            genis
            inputMode="numeric"
          />
          <Alan
            id="kart-ad"
            etiket="Kart üzerindeki isim"
            deger={adSoyad}
            onDegis={setAdSoyad}
            yerTutucu="Ad Soyad"
            genis
          />
          <Alan
            id="kart-skt"
            etiket="Son kullanma (AA/YY)"
            deger={skt}
            // "/" elle yazılmaz; ay tamamlanınca kendiliğinden düşer.
            onDegis={(v) => setSkt(sktBicimle(v, skt))}
            yerTutucu="12/28"
            inputMode="numeric"
          />
          <Alan
            id="kart-cvv"
            etiket="CVV"
            deger={cvv}
            onDegis={setCvv}
            yerTutucu="000"
            inputMode="numeric"
          />
        </div>
      )}

      {(formHata || hata) && (
        <p className="mt-3 text-[13px] font-bold text-danger">
          ⚠ {formHata || hata}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => {
            if (eksik) {
              setFormHata(
                seciliKart
                  ? "Kartının CVV kodunu gir."
                  : "Ödeme alanlarını eksiksiz doldur.",
              );
              return;
            }
            setFormHata("");
            onDevam();
          }}
          className="cursor-pointer rounded-control bg-primary px-6 py-3.5 text-[15px] font-bold text-white hover:bg-primary-hover"
        >
          {fiyatText(tutar)} Öde
        </button>
        <button
          type="button"
          onClick={onGeri}
          className="cursor-pointer rounded-control border border-border-input px-6 py-3.5 text-[15px] font-bold text-ink-900 hover:border-ink-400"
        >
          Geri
        </button>
      </div>
    </>
  );
}

/** Tek bir kart seçeneği — kayıtlı kart ya da "başka kart" satırı. */
function KartSecenegi({
  secili,
  onSec,
  baslik,
  alt,
  rozet,
}: {
  secili: boolean;
  onSec: () => void;
  baslik: string;
  alt: string;
  rozet?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-card border-[1.5px] px-4 py-3 transition-colors ${
        secili
          ? "border-primary bg-primary-soft"
          : "border-border hover:border-ink-400"
      }`}
    >
      <input
        type="radio"
        name="odeme-karti"
        checked={secili}
        onChange={onSec}
        className="h-4 w-4 flex-none accent-[var(--color-primary)]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-ink-900">{baslik}</span>
          {rozet && (
            <span className="rounded-full bg-card px-2 py-[3px] text-[10.5px] font-bold text-primary-hover">
              {rozet}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12px] font-medium text-ink-500">
          {alt}
        </span>
      </span>
    </label>
  );
}

function Alan({
  id,
  etiket,
  deger,
  onDegis,
  yerTutucu,
  genis = false,
  inputMode,
}: {
  id: string;
  etiket: string;
  deger: string;
  onDegis: (v: string) => void;
  yerTutucu: string;
  genis?: boolean;
  inputMode?: "numeric";
}) {
  return (
    <div className={genis ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-[13px] font-bold text-ink-900">
        {etiket}
      </label>
      <input
        id={id}
        value={deger}
        inputMode={inputMode}
        autoComplete="off"
        onChange={(e) => onDegis(e.target.value)}
        placeholder={yerTutucu}
        className="mt-1.5 w-full rounded-control border-[1.5px] border-border-input bg-card px-3.5 py-3 text-[15px] font-medium text-ink-900 outline-none focus:border-primary"
      />
    </div>
  );
}

/** Sistemin ödemeyi doğruladığı ara adım. */
function Dogrulama() {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto h-11 w-11 animate-spin rounded-full border-[3px] border-primary-soft border-t-primary" />
      <h1 className="mt-5 text-[19px] font-extrabold text-ink-900">
        Ödeme doğrulanıyor…
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] font-medium leading-relaxed text-ink-500">
        Bu adım tamamlanmadan satıcının kargo süresi başlamaz. Sayfayı kapatma.
      </p>
    </div>
  );
}

function Tamamlandi({
  kargoSaat,
  satici,
  onSohbet,
}: {
  kargoSaat: number;
  satici: string;
  onSohbet: () => void;
}) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[26px] text-ink-900">
        ✓
      </div>
      <h1 className="mt-5 text-[22px] font-extrabold text-ink-900">
        Sipariş kaydedildi
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] font-medium leading-relaxed text-ink-500">
        {satici} bilgilendirildi ve {kargoSaat} saatlik kargo süresi başladı.
        Sayacı ve kargo takip bilgisini sohbette göreceksin.
      </p>
      {/* Başlık bir dönem "Ödeme alındı" diyordu; tahsilat yapan bir
          sağlayıcı olmadığı için bu doğru değildi. */}
      <p className="mx-auto mt-2.5 max-w-md text-[12px] font-semibold leading-[1.5] text-ink-400">
        Prototip: para tahsil edilmedi. Sipariş akışı gerçek kayıt üzerinden
        işler.
      </p>
      <button
        type="button"
        onClick={onSohbet}
        className="mt-6 cursor-pointer rounded-control bg-primary px-6 py-3.5 text-[15px] font-bold text-white hover:bg-primary-hover"
      >
        Sohbete Dön ›
      </button>
    </div>
  );
}
