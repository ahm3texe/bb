"use client";

import { karsilastirmaAnahtari } from "@/lib/metin";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  kategoriler,
  talepDurumlari,
  talepDurumUyar,
  URUN_DURUMLARI,
} from "@/lib/data";
import type { Talep } from "@/lib/data";
import { TalepCard } from "@/components/TalepCard";
import { muadilKabulEder, talepleriSirala } from "@/lib/talep-durum";
import {
  cesitlerFor,
  markalarFor,
  modelEtiketi,
  modellerFor,
  RENKLER,
  turlerFor,
  yilEtiketi,
  yilSecenekleriFor,
  yilSlotuBedenMi,
} from "@/lib/urun-agaci";
import { ilIlce } from "@/lib/turkiye-il-ilce";
import { SecimKutusu } from "@/components/ui/SecimKutusu";
import { CokluSecimKutusu } from "@/components/ui/CokluSecimKutusu";
import type { TalepSirasi } from "@/lib/talep-durum";

type Sort = TalepSirasi;

const PAGE = 6;

const sortOptions: { value: Sort; label: string }[] = [
  { value: "yeni", label: "Tarihe göre en yeni talep" },
  { value: "eski", label: "Tarihe göre en eski talep" },
  { value: "artan", label: "Fiyat (artan)" },
  { value: "azalan", label: "Fiyat (azalan)" },
  { value: "sunum", label: "En çok sunum" },
];

// Arama karşılaştırması ortak anahtar üzerinden: `toLocaleLowerCase("tr")`
// I → ı, İ → i yaptığı için "istanbul" araması "İstanbul" ilanını
// bulamıyordu (bkz. lib/metin.ts).
const tr = karsilastirmaAnahtari;

/**
 * Ürün defosu seçenekleri. Kayıtta boolean tutuluyor (`defoKabul`); filtre
 * onu alıcının ilan formunda gördüğü iki cümleye çeviriyor, böylece iki
 * ekran aynı dili konuşuyor (bkz. components/IlanAcForm.tsx).
 */
const DEFO_SECENEKLERI = [
  { etiket: "Evet, olabilir", deger: true },
  { etiket: "Hayır, defosuz", deger: false },
] as const;

/** Filtre panelindeki tek bir başlık bloğu; istenirse katlanır. */
function Bolum({
  baslik,
  ayrac = false,
  katlanir = false,
  children,
}: {
  baslik: string;
  /** Üstüne ince ayraç çizgisi koyar. */
  ayrac?: boolean;
  /** Başlığa tıklanınca açılıp kapanır; kapalı başlar. */
  katlanir?: boolean;
  children: React.ReactNode;
}) {
  const [acik, setAcik] = useState(!katlanir);
  const baslikCls =
    "mb-2.5 text-[13px] font-bold uppercase tracking-[1.2px] text-ink-400";
  return (
    <div className={ayrac ? "mt-[18px] border-t border-hairline pt-4" : "mt-4"}>
      {katlanir ? (
        <button
          type="button"
          onClick={() => setAcik((v) => !v)}
          aria-expanded={acik}
          className={`${baslikCls} flex w-full cursor-pointer items-center justify-between gap-2 text-left`}
        >
          {baslik}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={`h-4 w-4 transition-transform ${acik ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : (
        <div className={baslikCls}>{baslik}</div>
      )}
      {acik && children}
    </div>
  );
}

/** Onay kutulu liste satırı — kategori ve durum gibi dikey listeler için. */
function SecimSatiri({
  etiket,
  secili,
  kapali = false,
  onSec,
}: {
  etiket: string;
  secili: boolean;
  /** Başka bir seçim bunu geçersiz kılıyorsa (ör. durumda "Hepsi"). */
  kapali?: boolean;
  onSec: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSec}
      disabled={kapali}
      aria-pressed={secili}
      className={`flex items-center gap-[9px] rounded-control px-[9px] py-2 text-left transition-colors ${
        kapali ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${secili ? "bg-primary-soft" : kapali ? "" : "hover:bg-page"}`}
    >
      <span
        className={`flex h-4 w-4 flex-none items-center justify-center rounded-[5px] text-[10px] font-extrabold ${
          secili
            ? "bg-primary text-white"
            : "border-[1.5px] border-border-input"
        }`}
      >
        {secili ? "✓" : ""}
      </span>
      <span
        className={`flex-1 text-[13px] ${
          secili ? "font-bold text-primary-hover" : "font-semibold text-ink-700"
        }`}
      >
        {etiket}
      </span>
    </button>
  );
}

export function KesfetClient({
  talepler,
  katSayilari,
  initialQ = "",
  initialKats = [],
  initialMuadil = false,
  ilgiliTalepler = [],
}: {
  /** Sunucudan gelen talepler — client bileşen veri katmanına dokunmaz. */
  talepler: Talep[];
  katSayilari: Record<string, number>;
  initialQ?: string;
  initialKats?: string[];
  /**
   * Yalnızca "muadil kabul" talepleri — `?muadil=1` ile gelir.
   *
   * Muadil kabul artık ilan kartında etiket olarak gösterilmiyor; alıcının
   * bu tercihi ARAMADA işe yarar: muadil ürün getirebilen satıcı filtreyi
   * işaretler ve yalnızca muadile açık talepleri görür.
   */
  initialMuadil?: boolean;
  /** Kullanıcının kendi açtığı ya da sunum yaptığı talepler. */
  ilgiliTalepler?: string[];
}) {
  /*
   * Ürün durumu seçenekleri SABİT LİSTEDEN gelir, listedeki taleplerden
   * değil. Türetilen liste, o an yayında olan taleplere göre büzülüp
   * genişliyordu: aynı filtre bir gün dört seçenek, ertesi gün iki seçenek
   * gösteriyordu. "Hepsi" ayrı bir seçenek — her durumu kabul eden talep.
   */
  const durumSecenekleri = useMemo(() => ["Hepsi", ...URUN_DURUMLARI], []);
  const [q, setQ] = useState(initialQ);
  /*
   * KATEGORİ TEK SEÇİM.
   *
   * Çoklu seçim vardı ve künye filtrelerini imkânsız kılıyordu: "Saat +
   * Elektronik" seçiliyken hangi tür, hangi çeşit listelenecekti? Ürün
   * ağacı kategoriden aşağı dallanıyor (bkz. lib/urun-agaci.ts), o yüzden
   * filtre de tek kategoriden aşağı iniyor.
   */
  const [kat, setKat] = useState<string>(initialKats[0] ?? "");
  // Künye filtreleri — ilan açarken doldurulan alanların aynısı.
  const [tur, setTur] = useState("");
  const [cesit, setCesit] = useState("");
  const [markalar, setMarkalar] = useState<string[]>([]);
  const [modeller, setModeller] = useState<string[]>([]);
  /*
   * YIL ARALIK OLARAK sorulur (2018 — 2023), tek tek yıl listesi olarak
   * değil: 1950'ye kadar inen listede "2019 ve sonrası" demek için onlarca
   * kutu işaretlemek gerekiyordu. Giyimde bu slot BEDEN tutuyor
   * (bkz. lib/urun-agaci.ts → yilSlotuBedenMi); beden bir aralık değil,
   * orada çoklu seçim kalır.
   */
  const [yillar, setYillar] = useState<string[]>([]);
  const [minYil, setMinYil] = useState("");
  const [maxYil, setMaxYil] = useState("");
  const [renkler, setRenkler] = useState<string[]>([]);
  // Konum çoklu: birden fazla il ve ilçe birlikte seçilebilir.
  const [secIller, setSecIller] = useState<string[]>([]);
  const [secIlceler, setSecIlceler] = useState<string[]>([]);
  const [minF, setMinF] = useState("");
  const [maxF, setMaxF] = useState("");
  const [durumlar, setDurumlar] = useState<string[]>([]);
  // Ürün defosu — etiketleriyle tutulur, filtrede boolean'a çevrilir.
  const [defolar, setDefolar] = useState<string[]>([]);
  const [sadeceAcil, setSadeceAcil] = useState(false);
  // Mobilde filtre paneli katlı başlar; masaüstünde bu bayrak okunmaz.
  const [filtreAcik, setFiltreAcik] = useState(false);
  const [sadeceMuadil, setSadeceMuadil] = useState(initialMuadil);
  const [sort, setSort] = useState<Sort>("yeni");
  const [visible, setVisible] = useState(PAGE);

  /*
   * Seçenekler MEVCUT TALEPLERDEN türetilir, ürün ağacının tamamından
   * değil. Ağaçta binlerce marka var ama listede üç talep varsa, seçilince
   * hiçbir şey getirmeyen yüzlerce seçenek göstermek filtreyi çöp yığınına
   * çevirir. Her kademe bir üstündeki seçimle daraltılmış kümeden beslenir:
   * kategori → tür → çeşit → (marka, model, yıl, renk).
   */
  /*
   * SEÇENEKLER ÜRÜN AĞACINDAN — TALEP AÇMA EKRANIYLA AYNI VERİ.
   *
   * Bir süre listedeki taleplerden türetiliyordu; o zaman "hiç Acer ilanı
   * yoksa Acer'i arayamıyorsun" oluyordu. Oysa filtre, olmayanı aramak
   * için de kullanılır: satıcı elindeki ürünün karşılığı var mı diye bakar
   * ve sonuç boşsa bunu görmesi gerekir. Kademeler İlan Aç formundaki
   * sırayla açılır: kategori → tür → çeşit → marka → model
   * (bkz. lib/urun-agaci.ts).
   */
  const turSecenekleri = useMemo(() => (kat ? turlerFor(kat) : []), [kat]);
  const cesitSecenekleri = useMemo(
    () => (kat && tur ? cesitlerFor(kat, tur) : []),
    [kat, tur],
  );
  const markaSecenekleri = useMemo(
    () => (kat && tur && cesit ? markalarFor(kat, tur, cesit) : []),
    [kat, tur, cesit],
  );
  /*
   * Model listesi markaya bağlı; filtrede birden çok marka seçilebildiği
   * için seçilenlerin modelleri BİRLEŞTİRİLİR. Hiç marka seçilmemişse o
   * çeşitteki bütün markaların modelleri listelenir — satıcı markayı
   * bilmeden modelden arayabilsin.
   */
  const modelKaynagi = useMemo(
    () =>
      kat && tur && cesit
        ? markalar.length
          ? markalar
          : markalarFor(kat, tur, cesit)
        : [],
    [kat, tur, cesit, markalar],
  );
  const modelSecenekleri = useMemo(
    () => [
      ...new Set(modelKaynagi.flatMap((m) => modellerFor(kat, tur, cesit, m))),
    ],
    [modelKaynagi, kat, tur, cesit],
  );
  /*
   * Birden çok marka seçiliyse modeller MARKA BAŞLIKLARI ALTINDA listelenir.
   * Düz listede "Air" hangi markanın modeli belli olmuyordu; iki markada
   * aynı adlı model varsa hangisine bastığını da bilemiyordun.
   */
  const modelGruplari = useMemo(
    () =>
      markalar.length > 1
        ? markalar.map((m) => ({
            baslik: m,
            secenekler: modellerFor(kat, tur, cesit, m),
          }))
        : undefined,
    [markalar, kat, tur, cesit],
  );
  // Yıl (giyimde beden) ve renk kategoriden bağımsız sabit listeler.
  const yilSecenekleri = useMemo(() => yilSecenekleriFor(kat), [kat]);
  const renkSecenekleri = useMemo(() => [...RENKLER], []);
  // Konum: 81 il ve tüm ilçeleri — İlan Aç formuyla aynı kaynak.
  const ilSecenekleri = useMemo(() => Object.keys(ilIlce), []);
  /*
   * İLÇE, İL SEÇİLMEDEN AÇILMAZ.
   *
   * Türkiye'de 970'ten fazla ilçe var; il seçmeden açılan liste hem
   * okunamıyor hem de "Merkez" gibi onlarca ilde tekrar eden adlar
   * hangisinin hangisi olduğunu söylemiyordu. Seçilen iller başlık olur,
   * ilçeleri altına dizilir (bkz. CokluSecimKutusu → gruplar).
   */
  const ilceSecenekleri = useMemo(
    () => [...new Set(secIller.flatMap((i) => ilIlce[i] ?? []))],
    [secIller],
  );
  const ilceGruplari = useMemo(
    () =>
      secIller.length
        ? secIller.map((i) => ({ baslik: i, secenekler: ilIlce[i] ?? [] }))
        : undefined,
    [secIller],
  );

  // Kategoriye göre değişen etiketler: giyimde "Model" cinsiyet, "Yıl"
  // bedendir (bkz. lib/urun-agaci.ts).
  const modelBasligi = modelEtiketi(kat);
  const yilBasligi = yilEtiketi(kat);
  const bedenSlotu = yilSlotuBedenMi(kat);

  const sonuclar = useMemo(() => {
    const qq = tr(q.trim());
    const minN = minF ? Number(minF) : null;
    const maxN = maxF ? Number(maxF) : null;
    const minYilN = minYil ? Number(minYil) : null;
    const maxYilN = maxYil ? Number(maxYil) : null;

    const filtered = talepler.filter((t) => {
      if (
        qq &&
        // Arama başlıkla sınırlı kalmasın: ürün ağacı ve açıklama da taransın.
        ![
          t.baslik,
          t.marka,
          t.kategori,
          t.aciklama,
          t.tur,
          t.cesit,
          t.model,
          t.renk,
          t.il,
          t.ilce,
        ].some((alan) => alan && tr(alan).includes(qq))
      )
        return false;
      if (kat && t.kategori !== kat) return false;
      if (tur && t.tur !== tur) return false;
      if (cesit && t.cesit !== cesit) return false;
      // Çoklu alanlarda seçilenlerden HERHANGİ BİRİ tutuyorsa geçer.
      if (markalar.length && !(t.marka && markalar.includes(t.marka)))
        return false;
      if (modeller.length && !(t.model && modeller.includes(t.model)))
        return false;
      if (bedenSlotu) {
        if (yillar.length && !(t.yil && yillar.includes(t.yil))) return false;
      } else {
        // Yıl aralığı: yılı yazılmamış talep, aralık verildiyse elenir.
        const yil = Number(t.yil);
        if ((minYilN != null || maxYilN != null) && !Number.isFinite(yil))
          return false;
        if (minYilN != null && yil < minYilN) return false;
        if (maxYilN != null && yil > maxYilN) return false;
      }
      if (renkler.length && !(t.renk && renkler.includes(t.renk))) return false;
      if (secIller.length && !secIller.includes(t.il)) return false;
      if (secIlceler.length && !secIlceler.includes(t.ilce)) return false;
      if (minN != null && t.fiyatNum < minN) return false;
      if (maxN != null && t.fiyatNum > maxN) return false;
      /*
       * Talep hangi durumları kabul ediyorsa onlardan biri seçiliyse geçer.
       *
       * "Hepsi" seçeneği yalnızca HİÇBİR durumu dışlamayan talepleri süzer
       * (`talepDurumlari` boş döner). Ama tersi geçerli DEĞİL: "Yenilenmiş"
       * seçen kişiye, her durumu kabul eden talepler de gösterilmeli —
       * hepsini kabul eden alıcı yenilenmişi de kabul ediyor demektir.
       * Burada `&& !hepsiTalebi` koşulu vardı ve tam bu talepleri eliyordu;
       * depodaki üç talebin ikisi "Hepsi" olduğu için filtre neredeyse her
       * seçimde boş dönüyordu.
       */
      if (durumlar.length) {
        const hepsiTalebi = talepDurumlari(t).length === 0;
        const uyan = durumlar.some((d) =>
          d === "Hepsi" ? hepsiTalebi : talepDurumUyar(t, d),
        );
        if (!uyan) return false;
      }
      /*
       * Defo: alan İSTEĞE BAĞLI (İlan Aç formunda zorunlu değil), yani
       * `undefined` "alıcı yanıt vermedi" demek. `Boolean(t.defoKabul)`
       * yazılıydı ve yanıtsız talebi "Hayır, defosuz" sayıyordu — alıcının
       * söylemediği bir şeyi ona söyletmek. Yanıtsız talep, defo filtresi
       * açıkken hiçbir kovaya girmez.
       */
      if (defolar.length) {
        if (typeof t.defoKabul !== "boolean") return false;
        const secilenler = DEFO_SECENEKLERI.filter((o) =>
          defolar.includes(o.etiket),
        ).map((o) => o.deger);
        if (!secilenler.includes(t.defoKabul)) return false;
      }
      if (sadeceAcil && !t.acil) return false;
      if (sadeceMuadil && !muadilKabulEder(t)) return false;
      return true;
    });

    // Karşılaştırma buraya gömülüydü ve test edilemiyordu; tarih
    // sıralaması da tam bu yüzden uzun süre sessizce bozuk kaldı.
    return talepleriSirala(filtered, sort);
  }, [
    talepler,
    q,
    kat,
    tur,
    cesit,
    markalar,
    modeller,
    yillar,
    minYil,
    maxYil,
    bedenSlotu,
    renkler,
    secIller,
    secIlceler,
    minF,
    maxF,
    durumlar,
    defolar,
    sadeceAcil,
    sadeceMuadil,
    sort,
  ]);

  const goster = sonuclar.slice(0, visible);
  const dahaVar = visible < sonuclar.length;

  /** Çoklu alanlarda seçim ekler/çıkarır. */
  const cokluDegistir =
    (koy: React.Dispatch<React.SetStateAction<string[]>>) => (d: string) => {
      setVisible(PAGE);
      koy((prev) =>
        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
      );
    };

  const toggleMarka = cokluDegistir(setMarkalar);
  const toggleModel = cokluDegistir(setModeller);
  const toggleYil = cokluDegistir(setYillar);
  const toggleRenk = cokluDegistir(setRenkler);
  const toggleIlce = cokluDegistir(setSecIlceler);
  /*
   * ÜRÜN DURUMU'NDA "HEPSİ" ÖZEL.
   *
   * İki kural: (1) somut durumların TAMAMI seçilirse liste tek bir
   * "Hepsi"ye iner — dört kutuyu tek tek işaretlemek de aynı şeyi söyler,
   * ekranda iki farklı biçimde durması kafa karıştırıyordu; (2) "Hepsi"
   * seçiliyken diğerleri işaretlenemez — "hepsi ama sadece ikisi" diye bir
   * durum yok. Önce "Hepsi" kaldırılır, sonra tek tek seçilir.
   */
  function durumDegistir(d: string) {
    setVisible(PAGE);
    setDurumlar((prev) => {
      if (d === "Hepsi") return prev.includes("Hepsi") ? [] : ["Hepsi"];
      if (prev.includes("Hepsi")) return prev;
      const yeni = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d];
      return URUN_DURUMLARI.every((u) => yeni.includes(u)) ? ["Hepsi"] : yeni;
    });
  }
  const toggleDefo = cokluDegistir(setDefolar);

  /*
   * Açılır kutu metin taşır, nesne değil; kategori adının yanındaki açık
   * talep sayısını göstermek için etiket "Elektronik (2)" biçiminde
   * kuruluyor ve seçimde ada geri çevriliyor. Listede "tümü" diye bir
   * seçenek YOK: kategori filtresini kaldırmanın yolu üstteki rozetin
   * ✕'i — sahte bir "hepsi" satırı, seçili bir kategori gibi görünüp
   * aslında hiçbir şey seçmiyordu.
   */
  const katEtiketi = (ad: string) => `${ad} (${katSayilari[ad] ?? 0})`;
  const katSecenekleri = kategoriler.map((k) => katEtiketi(k.ad));

  function katDegis(etiket: string) {
    const ad = kategoriler.find((k) => katEtiketi(k.ad) === etiket)?.ad ?? "";
    // Aynı kategori yeniden seçilirse hiçbir şey sıfırlanmasın.
    if (!ad || ad === kat) return;
    katSec(ad);
  }

  /**
   * Kategori tek seçim: aynı kategoriye ikinci tıklama seçimi kaldırır.
   * Kategori değişince ALT SEÇİMLER SIFIRLANIR — "Saat"in türü "Elektronik"
   * altında yok, kalsaydı hiçbir sonuç dönmeyen bir filtre kurulurdu.
   */
  function katSec(ad: string) {
    setVisible(PAGE);
    setKat((prev) => (prev === ad ? "" : ad));
    setTur("");
    setCesit("");
    setMarkalar([]);
    setModeller([]);
    setYillar([]);
    setMinYil("");
    setMaxYil("");
    setRenkler([]);
  }

  /** Tür tek seçim; çeşit türe bağlı olduğu için o da sıfırlanır. */
  function turSec(ad: string) {
    setVisible(PAGE);
    setTur((prev) => (prev === ad ? "" : ad));
    setCesit("");
  }

  function cesitSec(ad: string) {
    setVisible(PAGE);
    setCesit((prev) => (prev === ad ? "" : ad));
  }

  /** İl tek tek eklenir; kaldırılan ilin ilçeleri de seçimden düşer. */
  function ilDegistir(ad: string) {
    setVisible(PAGE);
    // Yeni liste ÖNCE hesaplanır: durum güncelleyicisinin içinden başka bir
    // durumu değiştirmek (setState içinde setState) React'in saf güncelleyici
    // sözleşmesini bozar ve StrictMode'da iki kez çalışır.
    const yeni = secIller.includes(ad)
      ? secIller.filter((x) => x !== ad)
      : [...secIller, ad];
    setSecIller(yeni);
    // Kaldırılan ilin ilçeleri seçili kalmasın; yoksa hiçbir sonuç
    // dönmeyen bir filtre kurulur.
    setSecIlceler((ilceler) =>
      ilceler.filter(
        (ilce) =>
          !yeni.length ||
          talepler.some((t) => yeni.includes(t.il) && t.ilce === ilce),
      ),
    );
  }

  function temizle() {
    setQ("");
    setKat("");
    setTur("");
    setCesit("");
    setMarkalar([]);
    setModeller([]);
    setYillar([]);
    setMinYil("");
    setMaxYil("");
    setRenkler([]);
    setSecIller([]);
    setSecIlceler([]);
    setMinF("");
    setMaxF("");
    setDurumlar([]);
    setDefolar([]);
    setSadeceAcil(false);
    setSadeceMuadil(false);
    setVisible(PAGE);
  }

  /** Sonuç başlığında gösterilen "seçili özellikler" rozetleri. */
  const secililer: { etiket: string; kaldir: () => void }[] = [
    ...(q.trim()
      ? [{ etiket: `Arama: “${q.trim()}”`, kaldir: () => setQ("") }]
      : []),
    ...(sadeceAcil
      ? [{ etiket: "! Acil", kaldir: () => setSadeceAcil(false) }]
      : []),
    ...(sadeceMuadil
      ? [{ etiket: "Muadil kabul", kaldir: () => setSadeceMuadil(false) }]
      : []),
    /*
     * Rozet KENDİ FİLTRESİNİ kaldırır — KATEGORİ HARİÇ.
     *
     * Kategorinin altındaki her şey (tür, çeşit, marka, model, yıl/beden,
     * renk) ona bağlı: kategori kalkınca "Dizüstü + MacBook Air M2" gibi
     * bağlamsız, hiçbir sonuç dönmeyen bir filtre kalıyordu. Kategori
     * rozeti bu yüzden künye zincirinin tamamını sıfırlar; konum, fiyat ve
     * ürün durumu kategoriden bağımsız olduğu için yerinde kalır.
     */
    ...(kat ? [{ etiket: kat, kaldir: () => katSec(kat) }] : []),
    ...(tur ? [{ etiket: tur, kaldir: () => setTur("") }] : []),
    ...(cesit ? [{ etiket: cesit, kaldir: () => setCesit("") }] : []),
    ...markalar.map((m) => ({ etiket: m, kaldir: () => toggleMarka(m) })),
    ...modeller.map((m) => ({ etiket: m, kaldir: () => toggleModel(m) })),
    ...yillar.map((y) => ({ etiket: y, kaldir: () => toggleYil(y) })),
    ...(minYil || maxYil
      ? [
          {
            etiket: `${yilBasligi}: ${minYil || "…"} — ${maxYil || "…"}`,
            kaldir: () => {
              setMinYil("");
              setMaxYil("");
            },
          },
        ]
      : []),
    ...renkler.map((r) => ({ etiket: r, kaldir: () => toggleRenk(r) })),
    ...secIller.map((i) => ({
      etiket: i,
      kaldir: () => setSecIller((prev) => prev.filter((x) => x !== i)),
    })),
    ...secIlceler.map((i) => ({ etiket: i, kaldir: () => toggleIlce(i) })),
    ...durumlar.map((d) => ({ etiket: d, kaldir: () => durumDegistir(d) })),
    ...defolar.map((d) => ({
      etiket: `Defo: ${d}`,
      kaldir: () => toggleDefo(d),
    })),
    ...(minF || maxF
      ? [
          {
            etiket: `${minF ? `${Number(minF).toLocaleString("tr-TR")} TL` : "0"} — ${
              maxF ? `${Number(maxF).toLocaleString("tr-TR")} TL` : "üstü"
            }`,
            kaldir: () => {
              setMinF("");
              setMaxF("");
            },
          },
        ]
      : []),
  ];

  const hasFilters = secililer.length > 0;

  const inputCls =
    "w-full min-w-0 box-border rounded-control border-[1.5px] border-border-input px-2.5 py-2 text-[13px] font-semibold text-ink-900 outline-none focus:border-primary";

  return (
    <main className="mx-auto max-w-[1440px] px-6 pb-14 pt-[22px]">
      <div className="mb-[18px]">
        <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
          Talepleri Keşfet
        </h1>
        <p className="mt-[7px] text-[13.5px] font-medium text-ink-500">
          Gerçek alıcı talepleri burada: Talebi alıcıya ait, ürünü sunmak sana.
          Üstelik sunum göndermek ücretsiz.
        </p>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[256px_minmax(0,1fr)]">
        {/* ── Filtreler (ana ekrandan bağımsız kaydırılabilir) ── */}
        {/* Panel kendi içinde kayar; SONUNA GELİNCE sayfa kaymaya devam eder.
            `overscroll-contain` zinciri kesiyordu: filtrenin sonuna gelen
            kullanıcı aynı hareketle sayfayı kaydıramıyor, fareyi panelin
            dışına taşımak zorunda kalıyordu. Varsayılan `auto` davranışı
            zincirlemeyi geri getirir. */}
        <aside className="rounded-card border border-border bg-card md:sticky md:top-[150px] md:max-h-[calc(100vh-170px)] md:overflow-y-auto">
          <div className="p-[18px]">
            {/* Filtre paneli MOBİLDE KATLI açılır.
              375px'te panel ilk ekranın tamamını kaplıyordu: ilk ilan kartı
              1077px aşağıda başlıyordu (ekran 812px), yani telefondan
              Keşfet'i açan kişi bir tam ekran kaydırmadan hiç ilan
              görmüyordu. Masaüstünde panel her zaman açık. */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setFiltreAcik((v) => !v)}
                aria-expanded={filtreAcik}
                className="flex flex-1 cursor-pointer items-center gap-2 text-left md:pointer-events-none md:cursor-default"
              >
                <span className="text-[13px] font-extrabold text-ink-900">
                  FİLTRE
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={`h-4 w-4 text-ink-400 transition-transform md:hidden ${
                    filtreAcik ? "rotate-180" : ""
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={temizle}
                  className="cursor-pointer text-[13px] font-semibold text-danger"
                >
                  Temizle
                </button>
              )}
            </div>

            <div className={filtreAcik ? "" : "hidden md:block"}>
              {/* Öne çıkanlar — Acil ve Muadil BİRBİRİNDEN BAĞIMSIZ.
                  İkisi de seçilirse her iki özelliği birden taşıyan
                  talepler kalır (filtreler VE ile birleşir). */}
              <Bolum baslik="Öne çıkanlar">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSadeceAcil((v) => !v);
                      setVisible(PAGE);
                    }}
                    aria-pressed={sadeceAcil}
                    className={`cursor-pointer rounded-full border-[1.5px] px-3 py-[7px] text-[13px] font-bold transition-colors ${
                      sadeceAcil
                        ? "border-acil bg-acil text-white"
                        : "border-border-input bg-card text-ink-500 hover:border-acil hover:text-acil"
                    }`}
                  >
                    ! Acil
                  </button>
                  {/* Muadil kabul — alıcı, aradığı ürünün eşdeğerini de
                      değerlendiriyorsa talebi burada görünür. */}
                  <button
                    type="button"
                    onClick={() => {
                      setSadeceMuadil((v) => !v);
                      setVisible(PAGE);
                    }}
                    aria-pressed={sadeceMuadil}
                    className={`cursor-pointer rounded-full border-[1.5px] px-3 py-[7px] text-[13px] font-bold transition-colors ${
                      sadeceMuadil
                        ? "border-primary bg-primary text-white"
                        : "border-border-input bg-card text-ink-500 hover:border-primary hover:text-primary"
                    }`}
                  >
                    Muadil kabul
                  </button>
                </div>
              </Bolum>

              {/* Kategori — TEK seçim. Seçili olana tekrar tıklamak kaldırır. */}
              {/* Kategori de açılır kutuda — panelin geri kalanıyla aynı
                  biçim. Dikey liste dört kategoriyle sığıyordu ama alan
                  büyüdükçe (yeni kategoriler) paneli şişiriyor ve altındaki
                  tür/çeşit kutularıyla farklı görünüyordu. Açık talep
                  sayıları seçeneğin yanında yazılı kalır. */}
              <Bolum baslik="Kategori" ayrac>
                <SecimKutusu
                  id="filtre-kategori"
                  deger={kat ? katEtiketi(kat) : ""}
                  onDegis={katDegis}
                  secenekler={katSecenekleri}
                  placeholder="Kategori seç"
                  kompakt
                  inputCls={inputCls}
                />
              </Bolum>

              {/* Künye filtreleri — İLAN AÇ FORMUNUN AYNISI.
                  Kademeler aynı sırayla açılır ve seçenekler aynı ürün
                  ağacından gelir; satıcı, alıcının doldurduğu alanların
                  birebir karşılığını görür. Listeler uzun olduğu için
                  (81 il, yüzlerce marka) açılır kutuda ve aramalı. */}
              <Bolum baslik="Tür" ayrac>
                <SecimKutusu
                  id="filtre-tur"
                  deger={tur}
                  onDegis={turSec}
                  secenekler={turSecenekleri}
                  placeholder="Tür seç"
                  kapali={!kat}
                  kapaliMetin="Önce kategori seç"
                  kompakt
                  inputCls={inputCls}
                />
              </Bolum>

              <Bolum baslik="Çeşit" ayrac>
                <SecimKutusu
                  id="filtre-cesit"
                  deger={cesit}
                  onDegis={cesitSec}
                  secenekler={cesitSecenekleri}
                  placeholder="Çeşit seç"
                  kapali={!tur}
                  kapaliMetin="Önce tür seç"
                  kompakt
                  inputCls={inputCls}
                />
              </Bolum>

              <Bolum baslik="Marka" ayrac>
                <CokluSecimKutusu
                  id="filtre-marka"
                  secenekler={markaSecenekleri}
                  secili={markalar}
                  onDegis={toggleMarka}
                  placeholder="Marka seç"
                  kapali={!cesit}
                  kapaliMetin="Önce çeşit seç"
                />
              </Bolum>

              <Bolum baslik={modelBasligi} ayrac>
                <CokluSecimKutusu
                  id="filtre-model"
                  secenekler={modelSecenekleri}
                  gruplar={modelGruplari}
                  secili={modeller}
                  onDegis={toggleModel}
                  placeholder={`${modelBasligi} seç`}
                  kapali={!cesit}
                  kapaliMetin="Önce çeşit seç"
                />
              </Bolum>

              <Bolum baslik="Fiyat aralığı (TL)" ayrac>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    aria-label="En az fiyat (TL)"
                    value={minF}
                    onChange={(e) => {
                      setMinF(
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 7),
                      );
                      setVisible(PAGE);
                    }}
                    placeholder="En az"
                    className={inputCls}
                  />
                  <span className="flex-none text-[13px] font-semibold text-ink-300">
                    —
                  </span>
                  <input
                    inputMode="numeric"
                    aria-label="En çok fiyat (TL)"
                    value={maxF}
                    onChange={(e) => {
                      setMaxF(
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 7),
                      );
                      setVisible(PAGE);
                    }}
                    placeholder="En çok"
                    className={inputCls}
                  />
                </div>
              </Bolum>

              <Bolum baslik={bedenSlotu ? yilBasligi : "Yıl aralığı"} ayrac>
                {bedenSlotu ? (
                  <CokluSecimKutusu
                    id="filtre-beden"
                    secenekler={yilSecenekleri}
                    secili={yillar}
                    onDegis={toggleYil}
                    placeholder={`${yilBasligi} seç`}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      aria-label="En eski yıl"
                      value={minYil}
                      onChange={(e) => {
                        setMinYil(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                        );
                        setVisible(PAGE);
                      }}
                      placeholder="En eski"
                      className={inputCls}
                    />
                    <span className="flex-none text-[13px] font-semibold text-ink-300">
                      —
                    </span>
                    <input
                      inputMode="numeric"
                      aria-label="En yeni yıl"
                      value={maxYil}
                      onChange={(e) => {
                        setMaxYil(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                        );
                        setVisible(PAGE);
                      }}
                      placeholder="En yeni"
                      className={inputCls}
                    />
                  </div>
                )}
              </Bolum>

              <Bolum baslik="Renk" ayrac>
                <CokluSecimKutusu
                  id="filtre-renk"
                  secenekler={renkSecenekleri}
                  secili={renkler}
                  onDegis={toggleRenk}
                  placeholder="Renk seç"
                />
              </Bolum>

              {/* Konum — il ve ilçe ÇOKLU ve açılır. Tek il seçilebilen bir
                  liste vardı; "İstanbul ve Ankara" diye bakan satıcı iki
                  ayrı arama yapmak zorunda kalıyordu. */}
              <Bolum baslik="İl" ayrac>
                <CokluSecimKutusu
                  id="filtre-il"
                  secenekler={ilSecenekleri}
                  secili={secIller}
                  onDegis={ilDegistir}
                  placeholder="İl seç"
                />
              </Bolum>

              <Bolum baslik="İlçe" ayrac>
                <CokluSecimKutusu
                  id="filtre-ilce"
                  secenekler={ilceSecenekleri}
                  gruplar={ilceGruplari}
                  secili={secIlceler}
                  onDegis={toggleIlce}
                  placeholder="İlçe seç"
                  kapali={!secIller.length}
                  kapaliMetin="Önce il seç"
                />
              </Bolum>

              {/* Ürün durumu — açılır ve ÇOKLU. Seçenekler sabit listeden
                  gelir (bkz. lib/data.ts → URUN_DURUMLARI); "Hepsi", her
                  durumu kabul eden talep demektir. */}
              <Bolum baslik="Ürün durumu" ayrac katlanir>
                <div className="flex flex-col gap-1">
                  {durumSecenekleri.map((d) => (
                    <SecimSatiri
                      key={d}
                      etiket={d}
                      secili={durumlar.includes(d)}
                      // "Hepsi" seçiliyken diğerleri kapalı.
                      kapali={d !== "Hepsi" && durumlar.includes("Hepsi")}
                      onSec={() => durumDegistir(d)}
                    />
                  ))}
                </div>
              </Bolum>

              {/* Ürün defosu — alıcının "defo kabul eder misin?" yanıtı.
                  Kayıtta boolean (bkz. lib/data.ts → defoKabul); ikisi
                  birden seçilirse ikisini de kabul eden liste kalır. */}
              <Bolum baslik="Ürün defosu" ayrac katlanir>
                <div className="flex flex-col gap-1">
                  {DEFO_SECENEKLERI.map((o) => (
                    <SecimSatiri
                      key={o.etiket}
                      etiket={o.etiket}
                      secili={defolar.includes(o.etiket)}
                      onSec={() => toggleDefo(o.etiket)}
                    />
                  ))}
                </div>
              </Bolum>
            </div>
          </div>
        </aside>

        {/* ── Sonuçlar ── */}
        <section className="min-w-0">
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <Link
              href="/talep-alarmlari"
              className="rounded-control border-[1.5px] border-accent bg-accent-soft px-3.5 py-[9px] text-[14px] font-extrabold text-accent-ink hover:brightness-95"
            >
              Talep Alarmı Kur
            </Link>
            <span className="text-sm font-bold text-ink-900">
              {sonuclar.length} açık talep
            </span>
            {/* SEÇİLİ ÖZELLİKLER — hepsi burada, tek tıkla kaldırılabilir.
                Yalnızca arama ve kategori rozeti gösteriliyordu; panel
                kaydırılmadan hangi filtrelerin açık olduğu görünmüyordu. */}
            <div className="flex flex-wrap gap-1.5">
              {secililer.map((f) => (
                <button
                  key={f.etiket}
                  type="button"
                  onClick={() => {
                    f.kaldir();
                    setVisible(PAGE);
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-[7px] text-[11.5px] font-semibold text-white"
                >
                  {f.etiket} <span className="text-primary-soft">✕</span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[13.5px] font-bold text-ink-700">
                Sırala:
              </span>
              <select
                value={sort}
                aria-label="Sıralama"
                onChange={(e) => setSort(e.target.value as Sort)}
                className="cursor-pointer rounded-control border-[1.5px] border-primary bg-primary-soft px-3.5 py-[9px] text-[14px] font-extrabold text-primary-hover outline-none hover:bg-primary-soft-hover focus:border-primary"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sonuclar.length === 0 ? (
            <div className="rounded-card border border-dashed border-border-input bg-card px-6 py-16 text-center">
              <div className="text-[15px] font-bold text-ink-900">
                Bu filtrelere uygun talep yok
              </div>
              <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium text-ink-400">
                Filtreleri gevşetmeyi dene ya da bu kriterler için bir talep
                alarmı kur — eşleşen ilk talep düştüğünde haber verelim.
              </p>
              <button
                type="button"
                onClick={temizle}
                className="mt-4 cursor-pointer text-[13px] font-bold text-primary"
              >
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {goster.map((t: Talep) => (
                  <TalepCard
                    key={t.id}
                    talep={t}
                    ilgili={ilgiliTalepler.includes(t.id)}
                  />
                ))}
              </div>
              {dahaVar && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE)}
                    className="cursor-pointer rounded-xl border border-border-input bg-card px-6 py-3 text-sm font-bold text-ink-900 hover:border-primary hover:text-primary"
                  >
                    Daha fazla talep göster
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
