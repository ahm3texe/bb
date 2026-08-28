"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ilAdlari, ilceler } from "@/lib/turkiye-il-ilce";
import { EN_FAZLA_KART, kartNoBicimle } from "@/lib/kart";
import { telefonYazarkenBicimle } from "@/lib/telefon";
import { EN_FAZLA_ADRES } from "@/lib/adres";
import {
  IBAN_UZUNLUK,
  ibanBicimle,
  ibanGecerliMi,
  ibanSadelestir,
} from "@/lib/iban";
import { hesapProfilYaz, useHesapProfil } from "@/lib/hesap-profil";
import type { HesapProfil } from "@/lib/hesap-profil";

type Adres = {
  id: string;
  /** Başlık — Ev, İş… */
  ad: string;
  il: string;
  ilce: string;
  /** Mahalle — listeden seçilebilir ya da elle yazılabilir. */
  mahalle: string;
  /** Cadde / sokak — elle yazılır. */
  cadde: string;
  /** Apartman / site adı — elle yazılır. */
  apartman: string;
  /** Kat — elle yazılır. */
  kat: string;
  /** Daire no — elle yazılır. */
  daire: string;
  /** Adres tarifi: bina, kapı no, kat, ek tarif. */
  tarif: string;
  varsayilan: boolean;
};

/** Ayarlarda görünen kart — sunucudaki maskeli kayıtla aynı şekil. */
type Kart = {
  id: string;
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
  profil: HesapProfil & { yenile?: () => void };
  onKaydet: (mesaj: string) => void;
}) {
  const [pAd, setPAd] = useState(profil.ad);
  const [pSoyad, setPSoyad] = useState(profil.soyad);
  const [pDogum, setPDogum] = useState(profil.dogumTarihi);
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
        {/* E-POSTA BURADA DEĞİL. Bildirim adresi doğrulama gerektiriyor
            (bkz. app/api/eposta); iki ayrı yerde iki ayrı e-posta tutmak
            hangisinin geçerli olduğunu belirsizleştirirdi. */}
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
        {/* TELEFON AYRI BİR ALAN DEĞİL, kendi bölümünde (aşağıda).
            E-postayla aynı gerekçe: doğrulama gerektiren iletişim bilgisi
            profilin diğer alanlarıyla aynı forma karışırsa "hangi numara
            geçerli?" sorusu belirsizleşir — biri "Kaydet" ile yazılır,
            öteki SMS koduyla doğrulanır. Aynı sekmede ama ayrı bölümde
            duruyor: kullanıcı için bir yerde, kayıt olarak ayrı. */}
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
          // Profil artık SUNUCUYA yazılır; başarısızsa gerekçe gösterilir.
          void hesapProfilYaz({
            ...profil,
            ad: pAd,
            soyad: pSoyad,
            dogumTarihi: pDogum,
            bio: pBio,
          }).then((hata) => {
            if (hata) {
              onKaydet(hata);
              return;
            }
            profil.yenile?.();
            onKaydet("Değişiklikler kaydedildi.");
          });
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
  const [apartman, setApartman] = useState(baslangic?.apartman ?? "");
  const [kat, setKat] = useState(baslangic?.kat ?? "");
  const [daire, setDaire] = useState(baslangic?.daire ?? "");
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
      apartman: apartman.trim(),
      kat: kat.trim(),
      daire: daire.trim(),
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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="ad-apartman">
            Apartman
          </label>
          <input
            id="ad-apartman"
            autoComplete="address-line2"
            value={apartman}
            onChange={(e) => setApartman(e.target.value.slice(0, 60))}
            placeholder="Apartman adı veya numarası"
            className={inputSm}
          />
        </div>
        <div>
          <label className={label} htmlFor="ad-kat">
            Kat
          </label>
          <input
            id="ad-kat"
            inputMode="numeric"
            value={kat}
            onChange={(e) => setKat(e.target.value.slice(0, 10))}
            placeholder="Örn. 3"
            className={inputSm}
          />
        </div>
        <div>
          <label className={label} htmlFor="ad-daire">
            Daire
          </label>
          <input
            id="ad-daire"
            inputMode="numeric"
            value={daire}
            onChange={(e) => setDaire(e.target.value.slice(0, 10))}
            placeholder="Örn. 7"
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
          placeholder="Zil adı, giriş, yol tarifi…"
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
 * Bildirim e-postası — adres girilir, doğrulama kodu gelir, kod girilir.
 *
 * Doğrulanmadan bu adrese HİÇBİR posta çıkmaz. Adres bir dönem kullanıcı
 * adından uyduruluyordu ve önündeki doğrulama kapısı hiçbir hesapta
 * açılmadığı için e-posta bildirimi diye bir özellik vardı ama hiç
 * çalışmıyordu.
 */
function EpostaBolumu({
  kayitli,
  onDegisti,
}: {
  kayitli: { adres: string; dogrulandi: boolean } | null;
  onDegisti: (v: { adres: string; dogrulandi: boolean } | null) => void;
}) {
  const [adres, setAdres] = useState(kayitli?.adres ?? "");
  const [kod, setKod] = useState("");
  const [durum, setDurum] = useState("");
  const [kodBekleniyor, setKodBekleniyor] = useState(false);

  async function adresKaydet() {
    setDurum("");
    const r = await fetch("/api/eposta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adres: adres.trim() }),
    }).catch(() => undefined);
    const v = (await r?.json().catch(() => ({}))) as {
      hata?: string;
      eposta?: { adres: string; dogrulandi: boolean };
    };
    if (!r?.ok || !v.eposta) {
      setDurum(v?.hata ?? "Adres kaydedilemedi.");
      return;
    }
    onDegisti(v.eposta);
    setKodBekleniyor(true);
    // "Gelen kutunu kontrol et" DİYORDU ama gerçek gönderim yok: posta
    // `.veri/eposta-kuyrugu.json` dosyasına düşüyor. Kullanıcı gelen
    // kutusuna bakıp hiçbir şey bulamıyor ve adresini doğrulayamıyordu.
    setDurum("Doğrulama kodu oluşturuldu (aşağıdaki prototip notuna bak).");
  }

  async function kodGonder() {
    setDurum("");
    const r = await fetch("/api/eposta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: kod.trim() }),
    }).catch(() => undefined);
    const v = (await r?.json().catch(() => ({}))) as { hata?: string };
    if (!r?.ok) {
      setDurum(v?.hata ?? "Kod doğrulanamadı.");
      return;
    }
    onDegisti({ adres: adres.trim(), dogrulandi: true });
    setKodBekleniyor(false);
    setKod("");
    setDurum("E-posta adresin doğrulandı.");
  }

  return (
    <div className="mb-4 rounded-[14px] border border-border p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] font-bold text-ink-900">
          Bildirim e-postası
        </span>
        {kayitli?.dogrulandi ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-bold text-accent-ink">
            Doğrulandı
          </span>
        ) : kayitli ? (
          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[10.5px] font-bold text-danger">
            Doğrulanmadı
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-[11.5px] font-medium leading-[1.5] text-ink-400">
        Doğrulanmayan adrese posta gönderilmez. E-posta kanallı talep alarmı
        kurabilmek için de doğrulama gerekir.
      </p>
      {/* PROTOTİP UYARISI — ödeme ekranındakiyle aynı gerekçe: ekran,
          olmayan bir şeyin olduğunu söylememeli. Gerçek gönderim
          `lib/eposta.ts` → `epostaGonder` bağlandığında bu kutu kalkar. */}
      <p
        role="note"
        className="mb-3 rounded-xl bg-primary-soft px-3.5 py-2.5 text-[11.5px] font-semibold leading-[1.5] text-primary-hover"
      >
        Prototip: gerçek e-posta gönderimi henüz bağlı değil. Doğrulama kodu
        gelen kutuna DÜŞMEZ; e-posta kuyruğuna yazılır ve oradan destek
        ekibi okur.
      </p>

      <div className="flex flex-wrap items-end gap-2.5">
        <div className="min-w-[220px] flex-1">
          <label className={label} htmlFor="bildirim-eposta">
            E-posta adresi
          </label>
          <input
            id="bildirim-eposta"
            type="email"
            autoComplete="email"
            value={adres}
            onChange={(e) => setAdres(e.target.value.slice(0, 120))}
            placeholder="ornek@eposta.com"
            className={inputSm}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={adresKaydet}>
          {kayitli ? "Güncelle" : "Kaydet"}
        </Button>
      </div>

      {(kodBekleniyor || (kayitli && !kayitli.dogrulandi)) && (
        <div className="mt-3 flex flex-wrap items-end gap-2.5">
          <div className="min-w-[220px] flex-1">
            <label className={label} htmlFor="eposta-kod">
              Doğrulama kodu
            </label>
            <input
              id="eposta-kod"
              value={kod}
              onChange={(e) => setKod(e.target.value.slice(0, 80))}
              placeholder="Kuyruğa düşen kod"
              className={`${inputSm} font-mono`}
            />
          </div>
          <Button size="sm" variant="lime" onClick={kodGonder}>
            Doğrula
          </Button>
        </div>
      )}

      {durum && (
        <p className="mt-2.5 text-[11.5px] font-semibold text-ink-700">
          {durum}
        </p>
      )}
    </div>
  );
}


/**
 * Telefon numarası — numara girilir, SMS ile kod gelir, kod girilir.
 *
 * `EpostaBolumu` ile BİREBİR aynı desen ve aynı gerekçe. Numara bir dönem
 * profil bilgilerinin içindeydi ve hiç doğrulanmıyordu: kullanıcı istediği
 * numarayı yazıp kaydediyor, "Cep telefonu onaylı" rozeti de bu yüzden
 * hiçbir zaman render edilmiyordu. Doğrulanmayan numara onaylı sayılmaz.
 *
 * Adres kayıtlarındaki telefon BAŞKA bir şeydir (teslimat için kargo
 * firmasına verilir) ve doğrulama istemez.
 */
function TelefonBolumu({
  kayitli,
  onDegisti,
}: {
  kayitli: { numara: string; maske: string; dogrulandi: boolean } | null;
  onDegisti: (
    v: { numara: string; maske: string; dogrulandi: boolean } | null,
  ) => void;
}) {
  const [numara, setNumara] = useState(kayitli?.numara ?? "");
  const [kod, setKod] = useState("");
  const [durum, setDurum] = useState("");
  const [kodBekleniyor, setKodBekleniyor] = useState(false);

  async function numaraKaydet() {
    setDurum("");
    const r = await fetch("/api/telefon", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numara: numara.trim() }),
    }).catch(() => undefined);
    const v = (await r?.json().catch(() => ({}))) as {
      hata?: string;
      telefon?: { numara: string; maske: string; dogrulandi: boolean };
    };
    if (!r?.ok || !v.telefon) {
      setDurum(v?.hata ?? "Numara kaydedilemedi.");
      return;
    }
    onDegisti(v.telefon);
    setNumara(v.telefon.numara);
    setKodBekleniyor(true);
    setDurum("Doğrulama kodu oluşturuldu (aşağıdaki prototip notuna bak).");
  }

  async function kodGonder() {
    setDurum("");
    const r = await fetch("/api/telefon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: kod.trim() }),
    }).catch(() => undefined);
    const v = (await r?.json().catch(() => ({}))) as { hata?: string };
    if (!r?.ok) {
      setDurum(v?.hata ?? "Kod doğrulanamadı.");
      return;
    }
    onDegisti({
      numara: numara.trim(),
      maske: kayitli?.maske ?? "",
      dogrulandi: true,
    });
    setKodBekleniyor(false);
    setKod("");
    setDurum("Telefon numaran doğrulandı.");
  }

  return (
    <div className="mb-4 rounded-[14px] border border-border p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] font-bold text-ink-900">
          Telefon numarası
        </span>
        {kayitli?.dogrulandi ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-bold text-accent-ink">
            Doğrulandı
          </span>
        ) : kayitli ? (
          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[10.5px] font-bold text-danger">
            Doğrulanmadı
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-[11.5px] font-medium leading-[1.5] text-ink-400">
        Doğrulanan numara profilinde “Telefon onaylı” rozeti olarak görünür.
        Numarayı değiştirirsen doğrulama sıfırlanır.
      </p>
      {/* PROTOTİP UYARISI — e-postadakiyle aynı gerekçe: ekran, olmayan bir
          şeyin olduğunu söylememeli. Gerçek gönderim `lib/sms.ts` →
          `smsGonder` bağlandığında bu kutu kalkar. */}
      <p
        role="note"
        className="mb-3 rounded-xl bg-primary-soft px-3.5 py-2.5 text-[11.5px] font-semibold leading-[1.5] text-primary-hover"
      >
        Prototip: gerçek SMS gönderimi henüz bağlı değil. Doğrulama kodu
        telefonuna GELMEZ; SMS kuyruğuna yazılır ve oradan destek ekibi
        okur.
      </p>

      <div className="flex flex-wrap items-end gap-2.5">
        <div className="min-w-[220px] flex-1">
          <label className={label} htmlFor="hesap-telefon">
            Cep telefonu
          </label>
          <input
            id="hesap-telefon"
            type="tel"
            autoComplete="tel"
            value={numara}
            // Rakamlar 4-3-2-2 gruplanır; kullanıcı ayraç yazmaz.
            // `telefonSadelestir` boşlukları zaten atıyor, yani biçimli
            // değer kayda olduğu gibi gidebilir.
            onChange={(e) => setNumara(telefonYazarkenBicimle(e.target.value))}
            placeholder="05•• ••• •• ••"
            className={inputSm}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={numaraKaydet}>
          {kayitli ? "Güncelle" : "Kaydet"}
        </Button>
      </div>

      {(kodBekleniyor || (kayitli && !kayitli.dogrulandi)) && (
        <div className="mt-3 flex flex-wrap items-end gap-2.5">
          <div className="min-w-[220px] flex-1">
            <label className={label} htmlFor="telefon-kod">
              Doğrulama kodu
            </label>
            <input
              id="telefon-kod"
              inputMode="numeric"
              value={kod}
              onChange={(e) => setKod(e.target.value.slice(0, 12))}
              placeholder="6 haneli kod"
              className={`${inputSm} font-mono`}
            />
          </div>
          <Button size="sm" variant="lime" onClick={kodGonder}>
            Doğrula
          </Button>
        </div>
      )}

      {durum && (
        <p className="mt-2.5 text-[11.5px] font-semibold text-ink-700">
          {durum}
        </p>
      )}
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
}: {
  /** Sunucudan gelen MASKELİ kayıt; tam numara istemciye hiç inmez. */
  kayitli: { maske: string; sahip: string } | null;
  hesapSahibi: string;
  onKaydet: (veri: { iban: string; sahip: string }) => Promise<void>;
}) {
  const [duzenle, setDuzenle] = useState(false);
  // Tam IBAN yalnızca kullanıcı yeniden girdiğinde bellekte olur; maskeli
  // kayıttan geri üretilemez, bu yüzden "Değiştir" boş formla açılır.
  const [iban, setIban] = useState("");
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
    void onKaydet({ iban: sade, sahip: sahip.trim() }).then(() => {
      setDuzenle(false);
      setIban("");
    });
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
                {kayitli.maske}
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
                  setIban("");
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
                  setIban("");
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

// NOT: burada `kodUret` ve `telefonMaskele` vardı. İkisi de sahte SMS
// doğrulama akışına aitti — kod tarayıcıda üretilip tarayıcıda
// karşılaştırılıyordu. Akış kaldırıldığında ikisi de ölü kaldı.
// Gerçek SMS doğrulaması eklenirse kod SUNUCUDA üretilmeli, istemci
// onu hiç görmemeli.

/** Kart numarasını 4'erli gruplar hâlinde gösterir. */
/**
 * Kart ekleme formu. Kart numarası yalnızca son 4 hanesi saklanacak şekilde
 * işlenir; CVV hiçbir yerde tutulmaz (ödeme kuruluşuna iletilir).
 */
function KartFormu({
  onKaydet,
  onVazgec,
  onUyari,
}: {
  onKaydet: (girdi: {
    numara: string;
    isim: string;
    skt: string;
    varsayilan: boolean;
  }) => void;
  onVazgec: () => void;
  onUyari: (mesaj: string) => void;
}) {
  const [numara, setNumara] = useState("");
  const [isim, setIsim] = useState("");
  const [ay, setAy] = useState("");
  const [yil, setYil] = useState("");
  const [cvv, setCvv] = useState("");
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
    // Tam numara yalnızca doğrulama için üste geçer; kayda maskeli
    // hâli girer (bkz. lib/kart.ts).
    onKaydet({
      numara,
      isim: isim.trim(),
      skt: `${ay}/${yil}`,
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
      {/* TELEFON ALANI KALDIRILDI.
          Kart formu telefonu ZORUNLU tutuyor ("geçerli bir telefon
          numarası gir" demeden kaydı geçirmiyordu) ama numarayı hiçbir
          yere YAZMIYORDU: `onKaydet` yalnızca numara, isim, son kullanma
          ve varsayılan alanlarını taşıyor. Kullanıcı numarasını giriyor,
          doğrulanıyor, sonra atılıyordu.

          Üstelik uyarı metni kaldırılmış bir vaadi tekrarlıyordu ("SMS
          şifresi için"): sahte SMS doğrulama akışı bu dosyadan zaten
          çıkarılmıştı, geriye yalnızca hata mesajı kalmıştı.

          Numaranın gerçek yeri Profil bilgileri: orada doğrulanıyor ve
          kaydediliyor (bkz. TelefonBolumu). */}

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

  // ── Güvenlik — parola ──
  //
  // BU AKIŞ TAMAMEN SAHTEYDİ: sözde bir "SMS onay kodu" tarayıcıda
  // üretiliyor, tarayıcıda karşılaştırılıyor ve doğru girilince yalnızca
  // "Şifren güncellendi" bildirimi gösteriliyordu. Parola hiç değişmiyordu.
  //
  // Gerçek parola doğrulaması kurulduktan sonra bu, hayal kırıklığı olmaktan
  // çıkıp güvenlik yanılgısına dönüştü. Artık `POST /api/parola` çağrılıyor;
  // mevcut parola sunucuda doğrulanıyor.
  //
  // SMS adımı kaldırıldı: ortada SMS gönderen bir servis yok ve olmayan bir
  // doğrulamayı taklit etmek, korumadığı şeyi koruyormuş gibi göstermekti.
  const [pwMevcut, setPwMevcut] = useState("");
  const [pwYeni, setPwYeni] = useState("");
  const [pwYeni2, setPwYeni2] = useState("");
  const [pwWarn, setPwWarn] = useState("");
  const [pwIsliyor, setPwIsliyor] = useState(false);

  async function parolaDegistir() {
    if (pwIsliyor) return;
    if (!pwMevcut || !pwYeni || !pwYeni2) {
      setPwWarn("Lütfen tüm parola alanlarını doldur.");
      return;
    }
    if (pwYeni.length < 8) {
      setPwWarn("Yeni parola en az 8 karakter olmalı.");
      return;
    }
    if (pwYeni !== pwYeni2) {
      setPwWarn("Yeni parolalar eşleşmiyor.");
      return;
    }

    setPwIsliyor(true);
    setPwWarn("");
    try {
      const r = await fetch("/api/parola", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mevcut: pwMevcut, yeni: pwYeni }),
      });
      const v = (await r.json().catch(() => ({}))) as { hata?: string };
      if (!r.ok) {
        setPwWarn(v.hata ?? "Parola güncellenemedi.");
        return;
      }
      setPwMevcut("");
      setPwYeni("");
      setPwYeni2("");
      showToast("Parolan güncellendi.");
    } catch {
      setPwWarn("Sunucuya ulaşılamadı.");
    } finally {
      setPwIsliyor(false);
    }
  }

  // ── Adresler ──
  // Kartlarda olduğu gibi sunucuda tutulur; İlan Aç formu da aynı
  // listeyi okuyor, böylece kullanıcı konumunu bir kez giriyor.
  const [adresler, setAdresler] = useState<Adres[]>([]);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [silId, setSilId] = useState<string | null>(null);
  const [yeniAdresOn, setYeniAdresOn] = useState(false);

  const adresleriYukle = useCallback(async () => {
    const r = await fetch("/api/adresler").catch(() => undefined);
    if (!r?.ok) return;
    const { adresler: gelen } = (await r.json()) as { adresler: Adres[] };
    setAdresler(gelen);
  }, []);

  useEffect(() => {
    let iptal = false;
    fetch("/api/adresler")
      .then((r) => (r.ok ? r.json() : { adresler: [] }))
      .then((v: { adresler?: Adres[] }) => {
        if (!iptal) setAdresler(v.adresler ?? []);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  function duzenleBasla(a: Adres) {
    setDuzenleId(a.id);
    setSilId(null);
    setYeniAdresOn(false);
  }
  async function adresGuncelle(
    id: string,
    veri: Omit<Adres, "id" | "kullanici" | "varsayilan">,
  ) {
    const r = await fetch(`/api/adresler/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(veri),
    }).catch(() => undefined);
    if (!r?.ok) {
      showToast("Adres güncellenemedi.");
      return;
    }
    await adresleriYukle();
    setDuzenleId(null);
    showToast("Adres güncellendi.");
  }

  async function varsayilanYap(id: string) {
    // YANIT KONTROL EDİLİR. Eskiden hata yutuluyordu: istek reddedilse bile
    // kullanıcı hiçbir uyarı görmüyor, "varsayılanı değiştirdim" sanıyordu.
    const r = await fetch(`/api/adresler/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ varsayilan: true }),
    }).catch(() => undefined);
    if (!r?.ok) {
      showToast("Varsayılan adres değiştirilemedi.");
      return;
    }
    await adresleriYukle();
  }

  async function silOnayla(a: Adres) {
    // "Adres silindi." yazısı ancak GERÇEKTEN silindiyse çıkmalı. Eskiden
    // yanıt hiç okunmuyordu: istek reddedilse bile toast "silindi" diyor,
    // hemen ardından liste sunucudan tazelendiği için adres geri geliyordu
    // — kullanıcı silindi yazısını görüp adresi listede buluyordu.
    const r = await fetch(`/api/adresler/${encodeURIComponent(a.id)}`, {
      method: "DELETE",
    }).catch(() => undefined);
    if (!r?.ok) {
      showToast("Adres silinemedi.");
      return;
    }
    await adresleriYukle();
    setSilId(null);
    showToast("Adres silindi.");
  }
  function yeniAdresAc() {
    setYeniAdresOn(true);
    setSilId(null);
    setDuzenleId(null);
  }
  async function yeniAdresEkle(
    veri: Omit<Adres, "id" | "kullanici" | "varsayilan">,
  ) {
    const r = await fetch("/api/adresler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(veri),
    }).catch(() => undefined);
    const cevap = (await r?.json().catch(() => ({}))) as { hata?: string };
    if (!r?.ok) {
      showToast(cevap.hata ?? "Adres kaydedilemedi.");
      return;
    }
    await adresleriYukle();
    setYeniAdresOn(false);
    showToast("Adres eklendi.");
  }

  // ── Kartlar ──
  // Kartlar sunucuda tutulur: ödeme ekranı da aynı listeyi okur.
  const [kartlar, setKartlar] = useState<Kart[]>([]);
  const [kartSilId, setKartSilId] = useState<string | null>(null);
  const [yeniKartOn, setYeniKartOn] = useState(false);

  /** Kart listesini sunucudan tazeler — her değişiklikten sonra çağrılır. */
  const kartlariYukle = useCallback(async () => {
    const r = await fetch("/api/kartlar").catch(() => undefined);
    if (!r?.ok) return;
    const { kartlar: gelen } = (await r.json()) as { kartlar: Kart[] };
    setKartlar(gelen);
  }, []);

  useEffect(() => {
    // Liste ilk açılışta çekilir; sonraki tazelemeler kart işlemlerinden
    // sonra doğrudan çağrılır.
    let iptal = false;
    fetch("/api/kartlar")
      .then((r) => (r.ok ? r.json() : { kartlar: [] }))
      .then((v: { kartlar?: Kart[] }) => {
        if (!iptal) setKartlar(v.kartlar ?? []);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  async function yeniKartEkle(girdi: {
    numara: string;
    isim: string;
    skt: string;
    varsayilan: boolean;
  }) {
    const r = await fetch("/api/kartlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(girdi),
    }).catch(() => undefined);
    const veri = (await r?.json().catch(() => ({}))) as { hata?: string };
    if (!r?.ok) {
      showToast(veri.hata ?? "Kart kaydedilemedi.");
      return;
    }
    await kartlariYukle();
    setYeniKartOn(false);
    showToast("Kartın kaydedildi.");
  }

  async function kartVarsayilanYap(id: string) {
    const r = await fetch(`/api/kartlar/${encodeURIComponent(id)}`, {
      method: "PATCH",
    }).catch(() => undefined);
    if (!r?.ok) {
      showToast("Varsayılan kart değiştirilemedi.");
      return;
    }
    await kartlariYukle();
  }

  async function kartKaldir(id: string) {
    // Adres silmedeki gerekçenin aynısı: başarı yazısı yanıttan sonra.
    const r = await fetch(`/api/kartlar/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => undefined);
    if (!r?.ok) {
      showToast("Kart kaldırılamadı.");
      return;
    }
    await kartlariYukle();
    setKartSilId(null);
    showToast("Kart kaldırıldı.");
  }

  // ── IBAN ──
  // Ödeme aktarımı için kayıtlı hesap; başlangıçta boş (kullanıcı girer).
  // Sunucuda saklanır; buraya yalnızca MASKELİ hâli gelir (bkz. /api/iban).
  const [ibanBilgi, setIbanBilgi] = useState<{
    maske: string;
    sahip: string;
  } | null>(null);

  useEffect(() => {
    let iptal = false;
    fetch("/api/iban")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: { iban?: { maske: string; sahip: string } | null } | null) => {
        if (!iptal && v) setIbanBilgi(v.iban ?? null);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  async function ibanKaydet(veri: { iban: string; sahip: string }) {
    const r = await fetch("/api/iban", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(veri),
    }).catch(() => undefined);
    const v = (await r?.json().catch(() => ({}))) as {
      hata?: string;
      iban?: { maske: string; sahip: string };
    };
    if (!r?.ok || !v.iban) {
      showToast(v?.hata ?? "IBAN kaydedilemedi.");
      return;
    }
    setIbanBilgi(v.iban);
    showToast("IBAN bilgin kaydedildi.");
  }

  // ── Bildirim tercihleri ──
  // Sunucuda saklanır (bkz. /api/tercihler); `bildirimEkle` her bildirimde
  // bunlara bakar. Kilitli olanlar (teklif, kargo) ekranda hep açık görünür.
  const [tercih, setTercih] = useState<Record<string, boolean>>({
    sunum: true,
    teklif: true,
    mesaj: true,
    kargo: true,
    kampanya: false,
    eposta: true,
  });

  useEffect(() => {
    let iptal = false;
    fetch("/api/tercihler")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: { tercihler?: Record<string, boolean> } | null) => {
        if (!iptal && v?.tercihler)
          setTercih((prev) => ({ ...prev, ...v.tercihler }));
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  async function tercihDegistir(alan: string, yeni: boolean) {
    // Önce ekranda çevir (hızlı geri bildirim), sunucu reddederse geri al.
    setTercih((prev) => ({ ...prev, [alan]: yeni }));
    const r = await fetch("/api/tercihler", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [alan]: yeni }),
    }).catch(() => undefined);
    if (!r?.ok) {
      setTercih((prev) => ({ ...prev, [alan]: !yeni }));
      showToast("Tercih kaydedilemedi.");
    }
  }

  // ── Bildirim e-postası ──
  const [eposta, setEposta] = useState<{
    adres: string;
    dogrulandi: boolean;
  } | null>(null);
  const [telefon, setTelefon] = useState<{
    numara: string;
    maske: string;
    dogrulandi: boolean;
  } | null>(null);

  useEffect(() => {
    let iptal = false;
    fetch("/api/telefon")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          v: {
            telefon?: {
              numara: string;
              maske: string;
              dogrulandi: boolean;
            } | null;
          } | null,
        ) => {
          if (!iptal && v) setTelefon(v.telefon ?? null);
        },
      )
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  useEffect(() => {
    let iptal = false;
    fetch("/api/eposta")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: { eposta?: { adres: string; dogrulandi: boolean } | null } | null) => {
        if (!iptal && v) setEposta(v.eposta ?? null);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);
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
  // ── Güvenlik: iki adım + hesap kapatma ──
  const [kapatmaAdim, setKapatmaAdim] = useState<0 | 1>(0);
  /** Açılan destek kaydının numarası — talep gerçekten oluşunca dolar. */
  const [kapatmaNo, setKapatmaNo] = useState("");
  const [kapatmaIsliyor, setKapatmaIsliyor] = useState(false);
  const [kapatmaHatasi, setKapatmaHatasi] = useState("");

  /**
   * Hesap kapatma talebi — GERÇEK destek kaydı açar.
   *
   * Eskiden yalnızca "Talebin oluşturuldu, 24 saat içinde dönüş yapılacak"
   * yazıp yerel state ilerletiyordu; ortada ne kayıt ne de dönüş vardı.
   * Kapatma akışının kendisi (verilerin silinmesi) hâlâ elle yapılıyor —
   * ama artık destek ekibi talebi görüyor.
   */
  async function hesapKapatmaTalebi() {
    if (kapatmaIsliyor) return;
    setKapatmaIsliyor(true);
    setKapatmaHatasi("");
    try {
      const r = await fetch("/api/destek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          konu: "Hesap kapatma",
          refNo: "hesap-kapatma",
          baslik: "Hesap kapatma talebi",
          aciklama:
            "Kullanıcı Ayarlar > Güvenlik ekranından hesabının kapatılmasını talep etti. Açık talep, bekleyen teklif ve tamamlanmamış sipariş kontrolü yapılmalı.",
        }),
      });
      const v = (await r.json().catch(() => ({}))) as {
        hata?: string;
        kayit?: { no: string };
      };
      if (!r.ok || !v.kayit) {
        setKapatmaHatasi(v.hata ?? "Talep oluşturulamadı.");
        return;
      }
      setKapatmaNo(v.kayit.no);
    } catch {
      setKapatmaHatasi("Sunucuya ulaşılamadı.");
    } finally {
      setKapatmaIsliyor(false);
    }
  }

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
            <>
              <ProfilBilgileri
                // Kayıtlı profil yüklendiğinde/değiştiğinde form yeniden kurulur.
                key={kayitliProfil.kullanici + kayitliProfil.bio}
                profil={kayitliProfil}
                onKaydet={showToast}
              />
              {/* Telefon burada: bir iletişim bilgisi, profilin parçası.
                  Bildirim tercihleri sekmesindeydi — orası "hangi olayda
                  haber ver" ayarı, numaranın kendisi değil. Kendi bölümü
                  olarak duruyor çünkü kaydı ayrı ve SMS koduyla
                  doğrulanıyor (bkz. lib/telefon.ts). */}
              <section className={`${cardCls} mt-4`}>
                <TelefonBolumu kayitli={telefon} onDegisti={setTelefon} />
              </section>
            </>
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
                        onKaydet={(veri) => void adresGuncelle(a.id, veri)}
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
                            onClick={() => void silOnayla(a)}
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
                          {[
                            a.mahalle,
                            a.cadde,
                            [
                              a.apartman,
                              a.kat && `Kat ${a.kat}`,
                              a.daire && `Daire ${a.daire}`,
                            ]
                              .filter(Boolean)
                              .join(" "),
                            a.tarif,
                          ]
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
                              onClick={() => void varsayilanYap(a.id)}
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
                    onKaydet={(v) => void yeniAdresEkle(v)}
                    onVazgec={() => setYeniAdresOn(false)}
                    onUyari={showToast}
                  />
                </div>
              ) : adresler.length >= EN_FAZLA_ADRES ? (
                <div className="mt-3 w-full rounded-[14px] border-[1.5px] border-dashed border-[#cdc2e0] bg-subtle p-4 text-center text-[13px] font-semibold text-ink-400">
                  En fazla {EN_FAZLA_ADRES} adres kaydedebilirsin. Yeni adres
                  için önce birini kaldır.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={yeniAdresAc}
                  className="mt-3 w-full cursor-pointer rounded-[14px] border-[1.5px] border-dashed border-[#cdc2e0] bg-subtle p-4 text-[13px] font-bold text-ink-400 transition-colors hover:border-primary hover:text-primary"
                >
                  + Yeni adres ekle ({adresler.length}/{EN_FAZLA_ADRES})
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
                            onClick={() => void kartVarsayilanYap(k.id)}
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
                          onClick={() => void kartKaldir(k.id)}
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
                    onKaydet={(g) => void yeniKartEkle(g)}
                    onVazgec={() => setYeniKartOn(false)}
                    onUyari={showToast}
                  />
                </div>
              ) : kartlar.length >= EN_FAZLA_KART ? (
                <div className="mt-3 w-full rounded-[14px] border-[1.5px] border-dashed border-[#cdc2e0] bg-subtle p-4 text-center text-[13px] font-semibold text-ink-400">
                  En fazla {EN_FAZLA_KART} kart kaydedebilirsin. Yeni kart
                  eklemek için önce birini kaldır.
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
                  + Yeni kart ekle ({kartlar.length}/{EN_FAZLA_KART})
                </button>
              )}
              <p className="mt-3 text-[11.5px] font-medium leading-[1.5] text-ink-300">
                Kart bilgilerin 256-bit şifreyle ödeme kuruluşunda saklanır;
                Bulbana sistemlerinde tutulmaz. Satış gelirlerin, alıcı onayı
                sonrası kayıtlı IBAN&apos;ına aktarılır.
              </p>
            </section>
          )}

          {/* ── IBAN ── */}
          {bolum === "iban" && (
            <IbanBolumu
              kayitli={ibanBilgi}
              hesapSahibi={`${kayitliProfil.ad} ${kayitliProfil.soyad}`.trim()}
              onKaydet={ibanKaydet}
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

              <EpostaBolumu kayitli={eposta} onDegisti={setEposta} />
              {/* TELEFON BURADA DEĞİL, PROFİL BİLGİLERİNDE. Numara bir
                  iletişim bilgisi; bildirim tercihleri ise "hangi olayda
                  haber ver" ayarı. E-posta burada kalıyor çünkü kayıtlı
                  adres doğrudan bildirim kanalı — telefonun böyle bir
                  karşılığı yok (SMS sağlayıcısı bağlı değil). */}
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
                      onClick={() => void tercihDegistir(t.k, !tercih[t.k])}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Gizlilik ── */}
          {/* GİZLİLİK BÖLÜMÜ KALDIRILDI.
              Üç anahtar da yalnızca yerel state çeviriyordu ve hiçbirinin
              altında mekanizma yoktu: öneri motoru yok, analitik yok,
              görünürlük kontrolü yok. "Tercihleri kaydet" düğmesi de
              sadece bildirim gösteriyordu.

              Analitik çerez onayı KVKK açısından ancak gerçekten analitik
              varsa anlamlıdır; profil görünürlüğü ise ayrıca planlanması
              gereken bir üründür. İkisi de karşılığı yazıldığında geri
              gelmeli. */}

          {/* ── Güvenlik ── */}
          {bolum === "guvenlik" && (
            <section className={cardCls}>
              <h2 className={h2Cls}>Güvenlik</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="password"
                  value={pwMevcut}
                  onChange={(e) => setPwMevcut(e.target.value.slice(0, 40))}
                  placeholder="Mevcut parola"
                  className={input}
                />
                <input
                  type="password"
                  value={pwYeni}
                  onChange={(e) => setPwYeni(e.target.value.slice(0, 40))}
                  placeholder="Yeni parola"
                  className={input}
                />
                <input
                  type="password"
                  value={pwYeni2}
                  onChange={(e) => setPwYeni2(e.target.value.slice(0, 40))}
                  placeholder="Yeni parola (tekrar)"
                  className={input}
                />
              </div>
              {pwWarn && (
                <p role="alert" className="mt-2.5 text-xs font-semibold text-danger">
                  {pwWarn}
                </p>
              )}

              <Button
                size="sm"
                className="mt-3.5"
                disabled={pwIsliyor}
                onClick={parolaDegistir}
              >
                {pwIsliyor ? "Güncelleniyor…" : "Parolayı Güncelle"}
              </Button>
              <p className="mt-2 text-[11.5px] font-medium text-ink-300">
                Güvenlik için mevcut parolan sorulur. Parolan en az 8 karakter
                olmalı.
              </p>

              {/* İKİ ADIMLI DOĞRULAMA KALDIRILDI.
                  Anahtar yalnızca yerel state çeviriyordu; ortada ne SMS
                  servisi ne de girişte ikinci adım vardı. Kapalı olduğu
                  hâlde "açık" görünen bir güvenlik özelliği, olmayan bir
                  korumayı varmış gibi gösteriyordu. */}

              {/* Hesabı kapat — GERÇEK destek kaydı açar. */}
              <div className="mt-[22px] flex flex-wrap items-center gap-3 rounded-[14px] border border-danger-line bg-danger-soft p-4">
                <div className="min-w-[220px] flex-1">
                  <div className="text-[13.5px] font-bold text-danger">
                    Hesabı kapat
                  </div>
                  {kapatmaNo ? (
                    <div className="mt-0.5 text-[11.5px] font-medium leading-[1.5] text-[#9a6763]">
                      Kapatma talebin <b className="text-danger">{kapatmaNo}</b>{" "}
                      numarasıyla destek ekibine iletildi.
                    </div>
                  ) : kapatmaAdim === 1 ? (
                    <div className="mt-0.5 text-[11.5px] font-semibold leading-[1.5] text-danger">
                      Destek ekibine kapatma talebi açılacak; onaylanırsa hesabın
                      kalıcı olarak kapanır. Devam etmek istediğine emin misin?
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[11.5px] font-medium leading-[1.5] text-[#9a6763]">
                      Açık talebin, bekleyen teklifin ya da tamamlanmamış siparişin
                      varken hesap kapatılamaz.
                    </div>
                  )}
                  {kapatmaHatasi && (
                    <div role="alert" className="mt-1 text-[11.5px] font-bold text-danger">
                      {kapatmaHatasi}
                    </div>
                  )}
                </div>
                {!kapatmaNo && kapatmaAdim === 0 && (
                  <button
                    type="button"
                    onClick={() => setKapatmaAdim(1)}
                    className="flex-none cursor-pointer rounded-[11px] border-[1.5px] border-danger-line bg-card px-4 py-3 text-[12.5px] font-bold text-danger transition-colors hover:bg-danger-soft"
                  >
                    Kapatma talebi oluştur
                  </button>
                )}
                {!kapatmaNo && kapatmaAdim === 1 && (
                  <div className="flex flex-none gap-2">
                    <button
                      type="button"
                      disabled={kapatmaIsliyor}
                      onClick={hesapKapatmaTalebi}
                      className="cursor-pointer rounded-[11px] bg-danger px-4 py-3 text-[12.5px] font-extrabold text-white transition-colors hover:bg-[#8f3733] disabled:opacity-60"
                    >
                      {kapatmaIsliyor ? "Gönderiliyor…" : "Evet, oluştur"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKapatmaAdim(0);
                        setKapatmaHatasi("");
                      }}
                      className="cursor-pointer rounded-[11px] border-[1.5px] border-border-input bg-card px-4 py-3 text-[12.5px] font-bold text-ink-500 transition-colors hover:border-primary hover:text-primary"
                    >
                      Vazgeç
                    </button>
                  </div>
                )}
                {kapatmaNo && (
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
