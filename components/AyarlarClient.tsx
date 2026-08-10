"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ilAdlari, ilceler } from "@/lib/turkiye-il-ilce";
import {
  IBAN_UZUNLUK,
  ibanBicimle,
  ibanGecerliMi,
  ibanMaskele,
  ibanSadelestir,
} from "@/lib/iban";
import { hesapProfilYaz, useHesapProfil } from "@/lib/hesap-profil";
import type { HesapProfil } from "@/lib/hesap-profil";

type Adres = {
  id: number;
  /** Başlık — Ev, İş… */
  ad: string;
  il: string;
  ilce: string;
  /** Mahalle — listeden seçilebilir ya da elle yazılabilir. */
  mahalle: string;
  /** Cadde / sokak — elle yazılır. */
  cadde: string;
  /** Adres tarifi: bina, kapı no, kat, ek tarif. */
  tarif: string;
  varsayilan: boolean;
};

type Kart = {
  id: number;
  marka: string;
  son4: string;
  skt: string;
  isim: string;
  varsayilan: boolean;
};

/** Doğum tarihi sınırları — bugünden 100 yıl öncesine kadar seçilebilir. */
const BUGUN_ISO = new Date().toISOString().slice(0, 10);
const EN_ESKI_DOGUM_ISO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d.toISOString().slice(0, 10);
})();

const AYLAR = [
  "01", "02", "03", "04", "05", "06",
  "07", "08", "09", "10", "11", "12",
];
/** Son kullanma yılı seçenekleri — bu yıldan itibaren 12 yıl. */
const YILLAR = Array.from({ length: 12 }, (_, i) =>
  String(new Date().getFullYear() + i),
);

type Bolum =
  | "profil"
  | "adres"
  | "odeme"
  | "iban"
  | "bildirim"
  | "gizlilik"
  | "guvenlik";

const bolumTanim: { id: Bolum; ad: string }[] = [
  { id: "profil", ad: "Profil bilgileri" },
  { id: "adres", ad: "Adresler" },
  { id: "odeme", ad: "Kart Bilgilerim" },
  { id: "iban", ad: "IBAN" },
  { id: "bildirim", ad: "Bildirim tercihleri" },
  { id: "gizlilik", ad: "Gizlilik" },
  { id: "guvenlik", ad: "Güvenlik" },
];

/**
 * Profil bilgileri formu — alanlar kayıtlı profilden başlatılır, "Kaydet"
 * lib/hesap-profil'e yazar. Kayıtlı profil değiştiğinde üst bileşen bu
 * bileşeni `key` ile yeniden kurar, böylece alanlar tazelenir.
 */
function ProfilBilgileri({
  profil,
  onKaydet,
}: {
  profil: HesapProfil;
  onKaydet: (mesaj: string) => void;
}) {
  const [pAd, setPAd] = useState(profil.ad);
  const [pSoyad, setPSoyad] = useState(profil.soyad);
  const [pEmail, setPEmail] = useState(profil.email);
  const [pDogum, setPDogum] = useState(profil.dogumTarihi);
  const [pTelefon, setPTelefon] = useState(profil.telefon);
  const [pBio, setPBio] = useState(profil.bio);

  return (
    <section className={cardCls}>
      <h2 className={h2Cls}>Profil bilgileri</h2>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="p-ad">
            Ad
          </label>
          <input
            id="p-ad"
            autoComplete="given-name"
            value={pAd}
            onChange={(e) => setPAd(e.target.value.slice(0, 40))}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="p-soyad">
            Soyad
          </label>
          <input
            id="p-soyad"
            autoComplete="family-name"
            value={pSoyad}
            onChange={(e) => setPSoyad(e.target.value.slice(0, 40))}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="p-email">
            E-posta
          </label>
          <input
            id="p-email"
            type="email"
            autoComplete="email"
            value={pEmail}
            onChange={(e) => setPEmail(e.target.value.slice(0, 60))}
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="p-dogum">
            Doğum tarihi
          </label>
          <input
            id="p-dogum"
            type="date"
            autoComplete="bday"
            min={EN_ESKI_DOGUM_ISO}
            max={BUGUN_ISO}
            value={pDogum}
            onChange={(e) => setPDogum(e.target.value)}
            className={`${input} cursor-pointer`}
          />
        </div>
        <div>
          <label className={label} htmlFor="p-tel">
            Telefon numarası
          </label>
          <input
            id="p-tel"
            type="tel"
            autoComplete="tel"
            value={pTelefon}
            onChange={(e) => setPTelefon(e.target.value.slice(0, 25))}
            className={input}
          />
        </div>
      </div>
      <div className="mt-3.5">
        <label className={label} htmlFor="p-bio">
          Hakkında
        </label>
        <textarea
          id="p-bio"
          rows={2}
          value={pBio}
          onChange={(e) => setPBio(e.target.value.slice(0, 240))}
          className={`${input} resize-y font-medium`}
        />
        <p className="mt-1.5 text-[11.5px] font-medium text-ink-300">
          Bu metin profil sayfanda, adının altında birebir görünür.
        </p>
      </div>
      <Button
        className="mt-4"
        onClick={() => {
          hesapProfilYaz({
            ...profil,
            ad: pAd,
            soyad: pSoyad,
            email: pEmail,
            dogumTarihi: pDogum,
            telefon: pTelefon,
            bio: pBio,
          });
          onKaydet("Değişiklikler kaydedildi.");
        }}
      >
        Kaydet
      </Button>
    </section>
  );
}

/**
 * Adres formu — hem "yeni adres" hem de düzenleme için kullanılır.
 * Şehir ve ilçe, İlan Aç formundaki gibi kademeli açılır listelerden seçilir:
 * ilçe listesi seçilen şehre göre dolar, şehir değişince ilçe sıfırlanır.
 */
function AdresFormu({
  baslangic,
  baslik,
  kaydetEtiketi,
  onKaydet,
  onVazgec,
  onUyari,
}: {
  baslangic?: Omit<Adres, "id" | "varsayilan">;
  baslik: string;
  kaydetEtiketi: string;
  onKaydet: (veri: Omit<Adres, "id" | "varsayilan">) => void;
  onVazgec: () => void;
  onUyari: (mesaj: string) => void;
}) {
  const [ad, setAd] = useState(baslangic?.ad ?? "");
  const [il, setIl] = useState(baslangic?.il ?? "");
  const [ilce, setIlce] = useState(baslangic?.ilce ?? "");
  const [mahalle, setMahalle] = useState(baslangic?.mahalle ?? "");
  const [cadde, setCadde] = useState(baslangic?.cadde ?? "");
  const [tarif, setTarif] = useState(baslangic?.tarif ?? "");
  const ilceList = il ? ilceler(il) : [];

  // Mahalle listesi sunucudan çekilir (veri seti ~5 MB, istemciye gömülmez).
  // Sonuç hangi il/ilçe için geldiğiyle birlikte tutulur; seçim değişince
  // eski liste kendiliğinden düşer — effect içinde senkron setState gerekmez.
  const anahtar = il && ilce ? `${il}|${ilce}` : "";
  const [mahalleVeri, setMahalleVeri] = useState<{
    anahtar: string;
    liste: string[];
  } | null>(null);

  useEffect(() => {
    if (!anahtar) return;
    const [aIl, aIlce] = anahtar.split("|");
    const ac = new AbortController();
    fetch(
      `/api/mahalleler?il=${encodeURIComponent(aIl)}&ilce=${encodeURIComponent(aIlce)}`,
      { signal: ac.signal },
    )
      .then((r) => r.json())
      .then((d: { mahalleler?: string[] }) =>
        setMahalleVeri({ anahtar, liste: d.mahalleler ?? [] }),
      )
      .catch(() => {
        if (!ac.signal.aborted) setMahalleVeri({ anahtar, liste: [] });
      });
    return () => ac.abort();
  }, [anahtar]);

  const mahalleList =
    mahalleVeri && mahalleVeri.anahtar === anahtar ? mahalleVeri.liste : [];

  function kaydet() {
    if (!ad.trim() || !il || !ilce || !mahalle.trim() || !tarif.trim()) {
      onUyari("Başlık, şehir, ilçe, mahalle ve adres tarifi gerekli.");
      return;
    }
    onKaydet({
      ad: ad.trim(),
      il,
      ilce,
      mahalle: mahalle.trim(),
      cadde: cadde.trim(),
      tarif: tarif.trim(),
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="mb-0.5 text-[13px] font-bold text-ink-900">{baslik}</div>
      <div>
        <label className={label} htmlFor="ad-baslik">
          Başlık
        </label>
        <input
          id="ad-baslik"
          value={ad}
          onChange={(e) => setAd(e.target.value.slice(0, 24))}
          placeholder="Ev, İş…"
          className={`${inputSm} font-bold`}
        />
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="ad-il">
            Şehir
          </label>
          <select
            id="ad-il"
            value={il}
            onChange={(e) => {
              setIl(e.target.value);
              setIlce("");
            }}
            className={`${inputSm} cursor-pointer bg-card`}
          >
            <option value="" disabled>
              Şehir seç
            </option>
            {ilAdlari.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="ad-ilce">
            İlçe
          </label>
          <select
            id="ad-ilce"
            value={ilce}
            onChange={(e) => setIlce(e.target.value)}
            disabled={!il}
            className={`${inputSm} cursor-pointer bg-card disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-300`}
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
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="ad-mahalle">
            Mahalle
          </label>
          <input
            id="ad-mahalle"
            list="ad-mahalle-liste"
            autoComplete="address-level3"
            value={mahalle}
            onChange={(e) => setMahalle(e.target.value.slice(0, 60))}
            disabled={!ilce}
            placeholder={
              !ilce
                ? "Önce ilçe seç"
                : mahalleList.length
                  ? "Listeden seç veya yaz"
                  : "Mahalle yaz"
            }
            className={`${inputSm} disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-300`}
          />
          {/* Listeden seçilebilir ama serbest yazmayı da engellemez. */}
          <datalist id="ad-mahalle-liste">
            {mahalleList.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={label} htmlFor="ad-cadde">
            Cadde / Sokak
          </label>
          <input
            id="ad-cadde"
            autoComplete="address-line1"
            value={cadde}
            onChange={(e) => setCadde(e.target.value.slice(0, 60))}
            placeholder="Örn. Moda Caddesi"
            className={inputSm}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="ad-tarif">
          Adres tarifi
        </label>
        <textarea
          id="ad-tarif"
          rows={2}
          value={tarif}
          onChange={(e) => setTarif(e.target.value.slice(0, 160))}
          placeholder="Bina ve kapı no, kat, ek tarif"
          className={`${inputSm} resize-y font-medium`}
        />
      </div>
      <div className="mt-0.5 flex gap-2">
        <Button size="sm" onClick={kaydet}>
          {kaydetEtiketi}
        </Button>
        <Button size="sm" variant="secondary" onClick={onVazgec}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}

/**
 * IBAN bölümü — satış gelirlerinin aktarılacağı hesap. Kayıtlı IBAN maskeli
 * gösterilir; düzenlemede TR IBAN'ı mod-97 sağlamasıyla doğrulanır.
 */
function IbanBolumu({
  kayitli,
  hesapSahibi,
  onKaydet,
  onUyari,
}: {
  kayitli: { iban: string; sahip: string } | null;
  hesapSahibi: string;
  onKaydet: (veri: { iban: string; sahip: string }) => void;
  onUyari: (mesaj: string) => void;
}) {
  const [duzenle, setDuzenle] = useState(!kayitli);
  const [iban, setIban] = useState(kayitli?.iban ?? "");
  const [sahip, setSahip] = useState(kayitli?.sahip ?? hesapSahibi);
  const [hata, setHata] = useState("");

  const sade = ibanSadelestir(iban);
  const gecerli = ibanGecerliMi(iban);

  function kaydet() {
    if (!sahip.trim()) {
      setHata("Hesap sahibinin adı soyadı gerekli.");
      return;
    }
    if (sade.length !== IBAN_UZUNLUK || !sade.startsWith("TR")) {
      setHata("TR ile başlayan 26 karakterlik bir IBAN gir.");
      return;
    }
    if (!gecerli) {
      setHata("IBAN doğrulanamadı. Haneleri kontrol et.");
      return;
    }
    setHata("");
    setDuzenle(false);
    onKaydet({ iban: sade, sahip: sahip.trim() });
    onUyari("IBAN bilgin kaydedildi.");
  }

  return (
    <section className={cardCls}>
      <h2 className={h2Cls}>IBAN</h2>
      <p className="mb-4 text-[12.5px] font-medium leading-[1.6] text-ink-500">
        Satışlarından kazandığın tutarlar, alıcı teslimatı onayladıktan sonra
        buraya gireceğin banka hesabına aktarılır. Hesabın{" "}
        <b className="text-ink-900">kendi adına</b> açılmış olmalıdır;{" "}
        <b className="text-primary">
          ad soyad ile IBAN sahibi eşleşmezse transfer bankaca iade edilir.
        </b>
      </p>

      {!duzenle && kayitli ? (
        <div className="rounded-[14px] border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[14px] font-bold tracking-[0.5px] text-ink-900">
                {ibanMaskele(kayitli.iban)}
              </div>
              <div className="mt-1 text-[11.5px] font-medium text-ink-400">
                Hesap sahibi: {kayitli.sahip}
              </div>
            </div>
            <div className="flex flex-none items-center gap-2.5">
              <span className="whitespace-nowrap rounded-full bg-accent px-2.5 py-1.5 text-[10.5px] font-bold text-accent-ink">
                Ödeme hesabı
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIban(kayitli.iban);
                  setSahip(kayitli.sahip);
                  setHata("");
                  setDuzenle(true);
                }}
              >
                Değiştir
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-border p-4">
          <div>
            <label className={label} htmlFor="iban-sahip">
              Hesap sahibi (Ad Soyad)
            </label>
            <input
              id="iban-sahip"
              autoComplete="name"
              value={sahip}
              onChange={(e) => setSahip(e.target.value.slice(0, 60))}
              placeholder="Hesabın açık olduğu ad soyad"
              className={inputSm}
            />
          </div>
          <div>
            <label className={label} htmlFor="iban-no">
              IBAN
            </label>
            <input
              id="iban-no"
              inputMode="text"
              spellCheck={false}
              value={ibanBicimle(iban)}
              onChange={(e) => {
                setIban(ibanSadelestir(e.target.value).slice(0, IBAN_UZUNLUK));
                setHata("");
              }}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              className={`${inputSm} font-mono tracking-[1px]`}
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11.5px] font-medium text-ink-300">
                {sade.length}/{IBAN_UZUNLUK} karakter
              </span>
              {sade.length === IBAN_UZUNLUK && (
                <span
                  className={`text-[11.5px] font-bold ${
                    gecerli ? "text-accent-ink" : "text-danger"
                  }`}
                >
                  {gecerli ? "✓ IBAN doğrulandı" : "IBAN doğrulanamadı"}
                </span>
              )}
            </div>
          </div>

          {hata && (
            <p className="text-xs font-semibold text-danger">{hata}</p>
          )}

          <div className="mt-1.5 flex flex-wrap gap-2.5">
            <Button variant="lime" onClick={kaydet}>
              IBAN&apos;ı Kaydet
            </Button>
            {kayitli && (
              <Button
                variant="eggplant"
                onClick={() => {
                  setIban(kayitli.iban);
                  setSahip(kayitli.sahip);
                  setHata("");
                  setDuzenle(false);
                }}
              >
                Vazgeç
              </Button>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11.5px] font-medium leading-[1.5] text-ink-300">
        IBAN&apos;ın yalnızca ödeme aktarımı için kullanılır, diğer
        kullanıcılara gösterilmez. Değişiklik yaptığında bekleyen ödemeler bir
        sonraki aktarım gününde yeni hesaba yatırılır.
      </p>
    </section>
  );
}

/** 6 haneli SMS onay kodu üretir (üretimde bunu sunucu üretir). */
function kodUret(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** "+90 555 111 42 18" → "+90 5•• ••• •• 18" — son 2 hane açık kalır. */
function telefonMaskele(telefon: string): string {
  const rakam = telefon.replace(/\D/g, "");
  if (rakam.length < 4) return telefon;
  return `+90 5•• ••• •• ${rakam.slice(-2)}`;
}

/** Kart numarasını 4'erli gruplar hâlinde gösterir. */
function kartNoBicimle(rakamlar: string): string {
  return rakamlar.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Kart ekleme formu. Kart numarası yalnızca son 4 hanesi saklanacak şekilde
 * işlenir; CVV hiçbir yerde tutulmaz (ödeme kuruluşuna iletilir).
 */
function KartFormu({
  onKaydet,
  onVazgec,
  onUyari,
}: {
  onKaydet: (kart: Omit<Kart, "id">) => void;
  onVazgec: () => void;
  onUyari: (mesaj: string) => void;
}) {
  const [numara, setNumara] = useState("");
  const [isim, setIsim] = useState("");
  const [ay, setAy] = useState("");
  const [yil, setYil] = useState("");
  const [cvv, setCvv] = useState("");
  const [telefon, setTelefon] = useState("");
  const [varsayilan, setVarsayilan] = useState(false);

  function kaydet() {
    if (numara.length < 16) {
      onUyari("Kart numarası 16 haneli olmalı.");
      return;
    }
    if (!isim.trim()) {
      onUyari("Kart üzerindeki ismi gir.");
      return;
    }
    if (!ay || !yil) {
      onUyari("Son kullanma ay ve yılını seç.");
      return;
    }
    if (cvv.length < 3) {
      onUyari("CVV 3 haneli olmalı.");
      return;
    }
    if (telefon.replace(/\D/g, "").length < 10) {
      onUyari("SMS şifresi için geçerli bir telefon numarası gir.");
      return;
    }
    const marka = numara.startsWith("4")
      ? "VISA"
      : numara.startsWith("5")
        ? "MC"
        : "KART";
    onKaydet({
      marka,
      son4: numara.slice(-4),
      skt: `${ay}/${yil}`,
      isim: isim.trim(),
      varsayilan,
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="mb-0.5 text-[13px] font-bold text-ink-900">Yeni kart</div>
      <div>
        <label className={label} htmlFor="k-no">
          Kart No
        </label>
        <input
          id="k-no"
          inputMode="numeric"
          autoComplete="cc-number"
          value={kartNoBicimle(numara)}
          onChange={(e) =>
            setNumara(e.target.value.replace(/\D/g, "").slice(0, 16))
          }
          placeholder="0000 0000 0000 0000"
          className={`${inputSm} tracking-[1px]`}
        />
      </div>
      <div>
        <label className={label} htmlFor="k-isim">
          Kart İsmi
        </label>
        <input
          id="k-isim"
          autoComplete="cc-name"
          value={isim}
          onChange={(e) => setIsim(e.target.value.slice(0, 40))}
          placeholder="Kart üzerindeki isim"
          className={inputSm}
        />
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <span className={label}>Son kullanma tarihi</span>
          <div className="flex gap-2">
            <select
              aria-label="Son kullanma ayı"
              value={ay}
              onChange={(e) => setAy(e.target.value)}
              className={`${inputSm} cursor-pointer bg-card`}
            >
              <option value="" disabled>
                Ay
              </option>
              {AYLAR.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              aria-label="Son kullanma yılı"
              value={yil}
              onChange={(e) => setYil(e.target.value)}
              className={`${inputSm} cursor-pointer bg-card`}
            >
              <option value="" disabled>
                Yıl
              </option>
              {YILLAR.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="k-cvv">
            CVV
          </label>
          <input
            id="k-cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="000"
            className={inputSm}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="k-tel">
          Telefon numarası
        </label>
        <input
          id="k-tel"
          type="tel"
          autoComplete="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value.slice(0, 20))}
          placeholder="05•• ••• •• ••"
          className={inputSm}
        />
        <p className="mt-1.5 text-[11.5px] font-medium leading-[1.5] text-ink-300">
          BulBana bu numaraya ödeme onayı için SMS şifresi gönderir.
        </p>
      </div>

      <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[12.5px] font-semibold text-ink-700">
        <input
          type="checkbox"
          checked={varsayilan}
          onChange={(e) => setVarsayilan(e.target.checked)}
          className="h-4 w-4 flex-none cursor-pointer accent-[#7c3aed]"
        />
        Varsayılan kart olarak belirle
      </label>

      <div className="mt-1.5 flex flex-wrap gap-2.5">
        <Button variant="lime" onClick={kaydet}>
          Kartımı Kaydet
        </Button>
        <Button variant="eggplant" onClick={onVazgec}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}

const label = "mb-[7px] block text-[12.5px] font-bold text-ink-900";
const input =
  "box-border w-full rounded-control border-[1.5px] border-border-input bg-card px-3.5 py-[13px] text-[13.5px] font-semibold text-ink-900 outline-none focus:border-primary";
const inputSm =
  "box-border w-full rounded-[10px] border-[1.5px] border-border-input bg-card px-3 py-2.5 text-[13px] font-semibold text-ink-900 outline-none focus:border-primary";
const cardCls =
  "rounded-panel border border-border bg-card p-6 [animation:bbFadeUp_0.15s_ease]";
const h2Cls = "mb-[18px] text-[17px] font-extrabold text-ink-900";

function Toggle({
  acik,
  onClick,
  label,
  disabled = false,
}: {
  acik: boolean;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-[26px] w-11 flex-none rounded-full transition-colors ${
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      } ${acik ? "bg-primary" : "bg-border-input"}`}
    >
      <span
        className={`absolute top-[3px] block h-5 w-5 rounded-full bg-white transition-all ${
          acik ? "right-[3px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export function AyarlarClient() {
  const [bolum, setBolum] = useState<Bolum>("profil");

  // ── Toast ──
  const [toast, setToast] = useState<{ on: boolean; msg: string }>({
    on: false,
    msg: "",
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast({ on: true, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 3200);
  }

  // ── Profil bilgileri ──
  // Kaynak lib/hesap-profil — kaydedilen değerler Profilim'deki kimlik
  // kartında birebir görünür.
  const kayitliProfil = useHesapProfil();

  // ── Güvenlik — şifre ──
  const [pwMevcut, setPwMevcut] = useState("");
  const [pwYeni, setPwYeni] = useState("");
  const [pwYeni2, setPwYeni2] = useState("");
  const [pwWarn, setPwWarn] = useState("");
  const [pwAsama, setPwAsama] = useState<"form" | "kod">("form");
  const [pwKod, setPwKod] = useState("");
  const beklenenKod = useRef<string | null>(null);

  /**
   * Şifre güncelleme iki adımlı: alanlar doğrulanır → kayıtlı telefona SMS
   * kodu gider → kod doğrulanınca şifre değişir. Prototipte kod istemcide
   * üretilir; üretimde kodu sunucu üretip doğrular, istemci hiç görmez.
   */
  function kodGonder() {
    if (!pwMevcut || !pwYeni || !pwYeni2) {
      setPwWarn("Lütfen tüm şifre alanlarını doldur.");
      return;
    }
    if (pwYeni.length < 8) {
      setPwWarn("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (pwYeni !== pwYeni2) {
      setPwWarn("Yeni şifreler eşleşmiyor.");
      return;
    }
    setPwWarn("");
    setPwKod("");
    beklenenKod.current = kodUret();
    setPwAsama("kod");
    showToast(
      `Onay kodu ${telefonMaskele(kayitliProfil.telefon)} numarasına gönderildi.`,
    );
  }
  function kodTekrarGonder() {
    beklenenKod.current = kodUret();
    setPwKod("");
    setPwWarn("");
    showToast("Yeni onay kodu gönderildi.");
  }
  function kodDogrula() {
    if (pwKod.length !== 6) {
      setPwWarn("6 haneli onay kodunu gir.");
      return;
    }
    if (pwKod !== beklenenKod.current) {
      setPwWarn("Onay kodu hatalı. Kodu kontrol et veya yeniden gönder.");
      return;
    }
    sifreAkisiIptal();
    showToast("Şifren güncellendi.");
  }
  function sifreAkisiIptal() {
    setPwMevcut("");
    setPwYeni("");
    setPwYeni2("");
    setPwKod("");
    setPwWarn("");
    setPwAsama("form");
    beklenenKod.current = null;
  }

  // ── Adresler ──
  const [adresler, setAdresler] = useState<Adres[]>([
    {
      id: 1,
      ad: "Ev",
      il: "İstanbul",
      ilce: "Kadıköy",
      mahalle: "Caferağa Mahallesi",
      cadde: "Moda Caddesi",
      tarif: "No: 18, Daire 4",
      varsayilan: true,
    },
    {
      id: 2,
      ad: "İş",
      il: "İstanbul",
      ilce: "Şişli",
      mahalle: "Esentepe Mahallesi",
      cadde: "Büyükdere Caddesi",
      tarif: "No: 112, Kat 6",
      varsayilan: false,
    },
  ]);
  const nextAdresId = useRef(3);
  const [duzenleId, setDuzenleId] = useState<number | null>(null);
  const [silId, setSilId] = useState<number | null>(null);
  const [yeniAdresOn, setYeniAdresOn] = useState(false);

  function duzenleBasla(a: Adres) {
    setDuzenleId(a.id);
    setSilId(null);
    setYeniAdresOn(false);
  }
  function adresGuncelle(id: number, veri: Omit<Adres, "id" | "varsayilan">) {
    setAdresler((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...veri } : x)),
    );
    setDuzenleId(null);
    showToast("Adres güncellendi.");
  }
  function varsayilanYap(id: number) {
    setAdresler((prev) => prev.map((x) => ({ ...x, varsayilan: x.id === id })));
  }
  function silOnayla(a: Adres) {
    setAdresler((prev) => {
      const kalan = prev.filter((x) => x.id !== a.id);
      if (a.varsayilan && kalan.length && !kalan.some((x) => x.varsayilan)) {
        kalan[0] = { ...kalan[0], varsayilan: true };
      }
      return kalan;
    });
    setSilId(null);
    showToast("Adres silindi.");
  }
  function yeniAdresAc() {
    setYeniAdresOn(true);
    setSilId(null);
    setDuzenleId(null);
  }
  function yeniAdresEkle(veri: Omit<Adres, "id" | "varsayilan">) {
    setAdresler((prev) => [
      ...prev,
      { ...veri, id: nextAdresId.current++, varsayilan: prev.length === 0 },
    ]);
    setYeniAdresOn(false);
    showToast("Adres eklendi.");
  }

  // ── Kartlar ──
  const [kartlar, setKartlar] = useState<Kart[]>([
    {
      id: 1,
      marka: "VISA",
      son4: "4821",
      skt: "12/2027",
      isim: "Emre Kaya",
      varsayilan: true,
    },
  ]);
  const nextKartId = useRef(2);
  const [kartSilId, setKartSilId] = useState<number | null>(null);
  const [yeniKartOn, setYeniKartOn] = useState(false);

  function yeniKartEkle(k: Omit<Kart, "id">) {
    setKartlar((prev) => [
      ...prev.map((x) => (k.varsayilan ? { ...x, varsayilan: false } : x)),
      { ...k, id: nextKartId.current++, varsayilan: k.varsayilan || !prev.length },
    ]);
    setYeniKartOn(false);
    showToast("Kartın kaydedildi.");
  }
  function kartVarsayilanYap(id: number) {
    setKartlar((prev) => prev.map((x) => ({ ...x, varsayilan: x.id === id })));
  }
  function kartKaldir(id: number) {
    setKartlar((prev) => {
      const kalan = prev.filter((x) => x.id !== id);
      if (kalan.length && !kalan.some((x) => x.varsayilan)) {
        kalan[0] = { ...kalan[0], varsayilan: true };
      }
      return kalan;
    });
    setKartSilId(null);
    showToast("Kart kaldırıldı.");
  }

  // ── IBAN ──
  // Ödeme aktarımı için kayıtlı hesap; başlangıçta boş (kullanıcı girer).
  const [ibanBilgi, setIbanBilgi] = useState<{
    iban: string;
    sahip: string;
  } | null>(null);

  // ── Bildirim tercihleri ──
  const [tercih, setTercih] = useState<Record<string, boolean>>({
    sunum: true,
    teklif: true,
    mesaj: true,
    kargo: true,
    kampanya: false,
  });
  const tercihTanim = [
    { k: "sunum", ad: "Yeni sunum", sub: "Taleplerine sunum geldiğinde haber ver" },
    {
      k: "teklif",
      ad: "Teklif isteği ve yanıtları",
      sub: "Teklif istendiğinde ve fiyat verildiğinde",
      kilitli: true,
    },
    { k: "mesaj", ad: "Mesajlar", sub: "Sohbetlere gelen yeni mesajlar" },
    {
      k: "kargo",
      ad: "Kargo güncellemeleri",
      sub: "Kargoya verildi, dağıtımda, teslim edildi",
      kilitli: true,
    },
    {
      k: "kampanya",
      ad: "Kampanya e-postaları",
      sub: "Yeni özellikler ve duyurular",
    },
  ];

  // ── Gizlilik ──
  const [gizlilik, setGizlilik] = useState<Record<string, boolean>>({
    kisisel: true,
    analitik: true,
    gorunur: true,
  });
  const gizlilikTanim = [
    {
      k: "kisisel",
      ad: "Kişiselleştirilmiş öneriler",
      sub: "Göz atma geçmişini kullanarak sana talep ve sunum öner",
    },
    {
      k: "analitik",
      ad: "Analitik çerezleri",
      sub: "Kullanım verisiyle deneyimi iyileştirmemize izin ver",
    },
    {
      k: "gorunur",
      ad: "Profil görünürlüğü",
      sub: "Değerlendirmelerin ve rozetlerin diğer kullanıcılara görünsün",
    },
  ];

  // ── Güvenlik: iki adım + hesap kapatma ──
  const [ikiAdim, setIkiAdim] = useState(true);
  const [kapatmaAdim, setKapatmaAdim] = useState<0 | 1 | 2>(0);

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-14 pt-8">
      <style>{`@keyframes bbFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <h1 className="mb-[22px] text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
        Hesap Ayarları
      </h1>

      <div className="grid items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* ── Sol menü ── */}
        <aside className="flex flex-col gap-1 rounded-card border border-border bg-card p-2.5 md:sticky md:top-[150px]">
          {bolumTanim.map((b) => {
            const active = bolum === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBolum(b.id)}
                className={`cursor-pointer rounded-[10px] px-3.5 py-3 text-left text-[13px] transition-colors ${
                  active
                    ? "bg-primary-soft font-bold text-primary-hover"
                    : "font-semibold text-ink-500 hover:bg-page"
                }`}
              >
                {b.ad}
              </button>
            );
          })}
        </aside>

        <div className="min-w-0">
          {/* ── Profil bilgileri ── */}
          {bolum === "profil" && (
            <ProfilBilgileri
              // Kayıtlı profil yüklendiğinde/değiştiğinde form yeniden kurulur.
              key={kayitliProfil.kullanici + kayitliProfil.bio}
              profil={kayitliProfil}
              onKaydet={showToast}
            />
          )}

          {/* ── Adresler ── */}
          {bolum === "adres" && (
            <section className={cardCls}>
              <h2 className={h2Cls}>Adresler</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {adresler.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-[14px] p-4 ${
                      a.varsayilan
                        ? "border-[1.5px] border-primary bg-[#f8f6fc]"
                        : "border border-border bg-card"
                    }`}
                  >
                    {duzenleId === a.id ? (
                      <AdresFormu
                        baslik="Adresi düzenle"
                        kaydetEtiketi="Kaydet"
                        baslangic={a}
                        onKaydet={(veri) => adresGuncelle(a.id, veri)}
                        onVazgec={() => setDuzenleId(null)}
                        onUyari={showToast}
                      />
                    ) : silId === a.id ? (
                      <div>
                        <div className="text-[13px] font-bold text-ink-900">
                          {a.ad}
                        </div>
                        <p className="mb-2.5 mt-1.5 text-[12.5px] font-semibold text-danger">
                          Bu adresi silmek istediğine emin misin?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => silOnayla(a)}
                          >
                            Evet, sil
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSilId(null)}
                          >
                            Vazgeç
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-h-[22px] items-center justify-between">
                          <span className="text-sm font-bold text-ink-900">
                            {a.ad}
                          </span>
                          {a.varsayilan && (
                            <span className="rounded-full bg-primary-soft px-2 py-[5px] text-[10.5px] font-bold text-primary-hover">
                              Varsayılan
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-[12.5px] font-medium leading-[1.55] text-ink-500">
                          {[a.mahalle, a.cadde, a.tarif]
                            .filter(Boolean)
                            .join(", ")}
                          <br />
                          {a.ilce}, {a.il}
                        </p>
                        <div className="mt-2.5 flex gap-3.5">
                          <button
                            type="button"
                            onClick={() => duzenleBasla(a)}
                            className="cursor-pointer text-xs font-semibold text-primary hover:text-primary-hover"
                          >
                            Düzenle
                          </button>
                          {!a.varsayilan && (
                            <button
                              type="button"
                              onClick={() => varsayilanYap(a.id)}
                              className="cursor-pointer text-xs font-semibold text-primary hover:text-primary-hover"
                            >
                              Varsayılan yap
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSilId(a.id);
                              setDuzenleId(null);
                            }}
                            className="cursor-pointer text-xs font-semibold text-danger"
                          >
                            Sil
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {yeniAdresOn ? (
                <div className="mt-3 rounded-[14px] border-[1.5px] border-border p-4">
                  <AdresFormu
                    baslik="Yeni adres"
                    kaydetEtiketi="Adresi ekle"
                    onKaydet={yeniAdresEkle}
                    onVazgec={() => setYeniAdresOn(false)}
                    onUyari={showToast}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={yeniAdresAc}
                  className="mt-3 w-full cursor-pointer rounded-[14px] border-[1.5px] border-dashed border-[#cdc2e0] bg-subtle p-4 text-[13px] font-bold text-ink-400 transition-colors hover:border-primary hover:text-primary"
                >
                  + Yeni adres ekle
                </button>
              )}
            </section>
          )}

          {/* ── Ödeme yöntemleri ── */}
          {bolum === "odeme" && (
            <section className={cardCls}>
              <h2 className={h2Cls}>Kart Bilgilerim</h2>
              <div className="flex flex-col gap-2.5">
                {kartlar.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-3.5 rounded-[14px] border border-border p-4"
                  >
                    <div className="flex h-8 w-[46px] flex-none items-center justify-center rounded-md bg-ink-900 text-[10px] font-extrabold text-white">
                      {k.marka}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-bold text-ink-900">
                          •••• •••• •••• {k.son4}
                        </span>
                        {k.varsayilan ? (
                          <span className="rounded-full bg-primary-soft px-2 py-[5px] text-[10.5px] font-bold text-primary-hover">
                            Varsayılan
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => kartVarsayilanYap(k.id)}
                            className="cursor-pointer text-[11px] font-semibold text-primary hover:text-primary-hover"
                          >
                            Varsayılan yap
                          </button>
                        )}
                      </div>
                      <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                        Son kullanma: {k.skt} · {k.isim}
                      </div>
                    </div>
                    {kartSilId === k.id ? (
                      <div className="flex flex-none flex-wrap items-center justify-end gap-2">
                        <span className="text-[11.5px] font-semibold text-danger">
                          Emin misin?
                        </span>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => kartKaldir(k.id)}
                        >
                          Evet
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setKartSilId(null)}
                        >
                          Vazgeç
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setKartSilId(k.id)}
                        className="flex-none cursor-pointer text-xs font-semibold text-danger"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {yeniKartOn ? (
                <div className="mt-3 rounded-[14px] border-[1.5px] border-border p-4">
                  <KartFormu
                    onKaydet={yeniKartEkle}
                    onVazgec={() => setYeniKartOn(false)}
                    onUyari={showToast}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setYeniKartOn(true);
                    setKartSilId(null);
                  }}
                  className="mt-3 w-full cursor-pointer rounded-[14px] border-[1.5px] border-dashed border-[#cdc2e0] bg-subtle p-4 text-[13px] font-bold text-ink-400 transition-colors hover:border-primary hover:text-primary"
                >
                  + Yeni kart ekle
                </button>
              )}
              <p className="mt-3 text-[11.5px] font-medium leading-[1.5] text-ink-300">
                Kart bilgilerin 256-bit şifreyle ödeme kuruluşunda saklanır;
                BulBana sistemlerinde tutulmaz. Satış gelirlerin, alıcı onayı
                sonrası kayıtlı IBAN&apos;ına aktarılır.
              </p>
            </section>
          )}

          {/* ── IBAN ── */}
          {bolum === "iban" && (
            <IbanBolumu
              kayitli={ibanBilgi}
              hesapSahibi={`${kayitliProfil.ad} ${kayitliProfil.soyad}`.trim()}
              onKaydet={setIbanBilgi}
              onUyari={showToast}
            />
          )}

          {/* ── Bildirim tercihleri ── */}
          {bolum === "bildirim" && (
            <section className={cardCls}>
              <h2 className="mb-1.5 text-[17px] font-extrabold text-ink-900">
                Bildirim tercihleri
              </h2>
              <p className="mb-3.5 text-[12.5px] font-medium leading-[1.5] text-ink-400">
                Kritik işlem bildirimleri (teklif, kargo) güvenlik gereği açık
                kalır ve kapatılamaz.
              </p>
              <div className="flex flex-col">
                {tercihTanim.map((t) => (
                  <div
                    key={t.k}
                    className="flex items-center gap-3 border-t border-hairline py-3"
                  >
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink-900">
                        {t.ad}
                        {t.kilitli && (
                          <span className="ml-1.5 text-[10.5px] font-semibold text-ink-300">
                            🔒 zorunlu
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11.5px] font-medium text-ink-300">
                        {t.sub}
                      </div>
                    </div>
                    <Toggle
                      acik={t.kilitli ? true : tercih[t.k]}
                      label={t.ad}
                      disabled={t.kilitli}
                      onClick={() =>
                        setTercih((prev) => ({ ...prev, [t.k]: !prev[t.k] }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Gizlilik ── */}
          {bolum === "gizlilik" && (
            <section className={cardCls}>
              <h2 className="mb-1.5 text-[17px] font-extrabold text-ink-900">
                Gizlilik
              </h2>
              <p className="mb-3.5 text-[12.5px] font-medium leading-[1.5] text-ink-400">
                Zorunlu çerezler oturumun için gereklidir ve kapatılamaz. Diğer
                tercihleri dilediğin gibi ayarlayabilirsin.
              </p>
              <div className="flex flex-col">
                {gizlilikTanim.map((g) => (
                  <div
                    key={g.k}
                    className="flex items-center gap-3 border-t border-hairline py-3"
                  >
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink-900">
                        {g.ad}
                      </div>
                      <div className="mt-0.5 text-[11.5px] font-medium text-ink-300">
                        {g.sub}
                      </div>
                    </div>
                    <Toggle
                      acik={gizlilik[g.k]}
                      onClick={() =>
                        setGizlilik((prev) => ({ ...prev, [g.k]: !prev[g.k] }))
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => showToast("Gizlilik tercihleri kaydedildi.")}
              >
                Tercihleri kaydet
              </Button>
            </section>
          )}

          {/* ── Güvenlik ── */}
          {bolum === "guvenlik" && (
            <section className={cardCls}>
              <h2 className={h2Cls}>Güvenlik</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="password"
                  value={pwMevcut}
                  onChange={(e) => setPwMevcut(e.target.value.slice(0, 40))}
                  placeholder="Mevcut şifre"
                  className={input}
                />
                <input
                  type="password"
                  value={pwYeni}
                  onChange={(e) => setPwYeni(e.target.value.slice(0, 40))}
                  placeholder="Yeni şifre"
                  className={input}
                />
                <input
                  type="password"
                  value={pwYeni2}
                  onChange={(e) => setPwYeni2(e.target.value.slice(0, 40))}
                  placeholder="Yeni şifre (tekrar)"
                  className={input}
                />
              </div>
              {pwAsama === "kod" && (
                <div className="mt-3.5 rounded-[14px] border-[1.5px] border-border bg-subtle p-4">
                  <div className="text-[13px] font-bold text-ink-900">
                    Telefonuna gelen kodu gir
                  </div>
                  <p className="mt-1 text-[12px] font-medium leading-[1.5] text-ink-500">
                    Kayıtlı numaran{" "}
                    <b className="text-ink-900">{telefonMaskele(kayitliProfil.telefon)}</b>{" "}
                    adresine 6 haneli onay kodu gönderdik. Şifren yalnızca bu kod
                    doğrulanınca değişir.
                  </p>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={pwKod}
                    onChange={(e) =>
                      setPwKod(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="6 haneli kod"
                    className={`${inputSm} mt-3 max-w-[180px] tracking-[3px]`}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={kodDogrula}>
                      Kodu Doğrula
                    </Button>
                    <Button size="sm" variant="secondary" onClick={kodTekrarGonder}>
                      Kodu tekrar gönder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={sifreAkisiIptal}>
                      Vazgeç
                    </Button>
                  </div>
                </div>
              )}
              {pwWarn && (
                <p className="mt-2.5 text-xs font-semibold text-danger">{pwWarn}</p>
              )}
              {pwAsama === "form" && (
                <>
                  <Button size="sm" className="mt-3.5" onClick={kodGonder}>
                    Onay Kodu Gönder
                  </Button>
                  <p className="mt-2 text-[11.5px] font-medium text-ink-300">
                    Şifreyi değiştirmek için kayıtlı telefon numarana SMS ile
                    gönderilen kodu girmen gerekir.
                  </p>
                </>
              )}

              {/* İki adımlı doğrulama */}
              <div className="mt-[22px] flex items-center gap-3 border-t border-hairline pt-[18px]">
                <div className="flex-1">
                  <div className="text-[13.5px] font-bold text-ink-900">
                    İki adımlı doğrulama
                  </div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-ink-300">
                    Girişlerde SMS koduyla ek doğrulama iste.
                  </div>
                </div>
                <Toggle acik={ikiAdim} onClick={() => setIkiAdim((v) => !v)} />
              </div>

              {/* Hesabı kapat */}
              <div className="mt-[22px] flex flex-wrap items-center gap-3 rounded-[14px] border border-danger-line bg-danger-soft p-4">
                <div className="min-w-[220px] flex-1">
                  <div className="text-[13.5px] font-bold text-danger">
                    Hesabı kapat
                  </div>
                  {kapatmaAdim === 2 ? (
                    <div className="mt-0.5 text-[11.5px] font-medium leading-[1.5] text-[#9a6763]">
                      Talebin oluşturuldu, 24 saat içinde dönüş yapılacak.
                    </div>
                  ) : kapatmaAdim === 1 ? (
                    <div className="mt-0.5 text-[11.5px] font-semibold leading-[1.5] text-danger">
                      Kapatma talebi oluşturulacak; onaylanırsa hesabın kalıcı
                      olarak kapanır. Devam etmek istediğine emin misin?
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[11.5px] font-medium leading-[1.5] text-[#9a6763]">
                      Açık talebin, bekleyen teklifin ya da tamamlanmamış siparişin
                      varken hesap kapatılamaz.
                    </div>
                  )}
                </div>
                {kapatmaAdim === 0 && (
                  <button
                    type="button"
                    onClick={() => setKapatmaAdim(1)}
                    className="flex-none cursor-pointer rounded-[11px] border-[1.5px] border-danger-line bg-card px-4 py-3 text-[12.5px] font-bold text-danger transition-colors hover:bg-danger-soft"
                  >
                    Kapatma talebi oluştur
                  </button>
                )}
                {kapatmaAdim === 1 && (
                  <div className="flex flex-none gap-2">
                    <button
                      type="button"
                      onClick={() => setKapatmaAdim(2)}
                      className="cursor-pointer rounded-[11px] bg-danger px-4 py-3 text-[12.5px] font-extrabold text-white transition-colors hover:bg-[#8f3733]"
                    >
                      Evet, oluştur
                    </button>
                    <button
                      type="button"
                      onClick={() => setKapatmaAdim(0)}
                      className="cursor-pointer rounded-[11px] border-[1.5px] border-border-input bg-card px-4 py-3 text-[12.5px] font-bold text-ink-500 transition-colors hover:border-primary hover:text-primary"
                    >
                      Vazgeç
                    </button>
                  </div>
                )}
                {kapatmaAdim === 2 && (
                  <span className="flex-none rounded-full bg-primary-soft px-3 py-2 text-[11px] font-bold text-primary-hover">
                    Talep alındı ✓
                  </span>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast.on && (
        <div className="fixed bottom-7 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink-900 px-5 py-3.5 text-[13.5px] font-semibold text-white shadow-[0_8px_24px_rgba(46,26,71,0.28)] [animation:bbFadeUp_0.25s_ease]">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-ink-900">
            ✓
          </span>
          {toast.msg}
        </div>
      )}
    </main>
  );
}
