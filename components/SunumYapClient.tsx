"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Talep } from "@/lib/data";
import {
  URUN_DURUMLARI,
  fiyatText,
  ilanTarihi,
  talepNo,
  binlikAyir,
  talepDurumlari,
} from "@/lib/data";
import { ilAdlari, ilceler } from "@/lib/turkiye-il-ilce";
import { kalanGun } from "@/lib/talep-durum";
import { KARGO_FIRMALARI } from "@/lib/anlasma";
import { BASLIK_SINIR, BASLIK_EN_AZ } from "@/lib/metin";
import {
  markalarFor,
  modelEtiketi,
  modelSlotuCinsiyetMi,
  yilEtiketi,
  yilSecenekleriFor,
  yilSlotuBedenMi,
} from "@/lib/urun-agaci";
import { Chip } from "@/components/ui/Chip";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { Sunum } from "@/components/SunumOnizleme";
import {
  SunumGaleri,
  SunumKunye,
  SunumNotu,
  kunyeSatirlari,
} from "@/components/SunumOnizleme";

// Yükleme sınırları — İlan Aç formundakiyle aynı; sunucu (/api/yukle) da
// aynı sınırları bağımsız olarak uygular.
const MAX_FOTO = 5;
const MAX_VIDEO = 1;
const MAX_FOTO_BYTE = 10 * 1024 * 1024; // 10 MB
// Sunucudaki tavanla AYNI olmalı (bkz. app/api/yukle/route.ts).
// Mimari sınırı: proxy gövdeyi bellekte tamponluyor, bu yüzden yüz
// megabaytlık video bu yoldan geçirilmiyor.
const MAX_VIDEO_BYTE = 20 * 1024 * 1024; // 20 MB

/**
 * Tek istekte gönderilebilecek TOPLAM boyut — sunucudaki
 * `MAX_TOPLAM_BYTE` ile aynı (bkz. app/api/yukle/route.ts).
 *
 * Dosya BAŞINA sınır tek başına yetmiyordu: form 4×10 MB fotoğraf +
 * 2×20 MB video seçtirebiliyor, kullanıcı beş adımlık formu doldurup
 * yüklemeyi bekliyor ve en sonda sunucudan reddediliyordu.
 */
const MAX_TOPLAM_BYTE = 24 * 1024 * 1024;

/** Seçilen dosya + önizleme için üretilen object URL. */
type Yuklenen = { id: string; dosya: File; url: string };

function boyutText(byte: number): string {
  const mb = byte / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(byte / 1024)} KB`;
}

// Satıcının ürün durumu — alıcının "kabul ettiği durum" ile eşleşecek şekilde
// aynı sözlükten türer ("Hepsi" alıcıya özel bir seçenektir).
const durumSecenekleri = [...URUN_DURUMLARI];
const teslimSecenekleri = [
  "Bugün Kargoda (18 saat içinde)",
  "3 gün içinde kargoda",
];
/*
 * KARGO TAMAMEN SATICININ İŞİ.
 *
 * Burada iki pil vardı — "Kargo satıcıya ait" / "Kargo alıcıya ait" —
 * yani sunumda sorulan şey ücretin kimde olduğuydu; hangi firmayla
 * gönderileceği ise sipariş açıldıktan sonra, kargo adımında
 * soruluyordu.
 *
 * İkisi de kaldırıldı ve yerine tek bir soru geldi: hangi firma?
 *
 *  • Ücret sorusu düştü çünkü gönderiyi satıcı yapıyor. Alıcının kargo
 *    üzerinde söz hakkı olması, teslimatı satıcının yürüttüğü bir akışta
 *    karşılığı olmayan bir seçimdi.
 *  • Firma sorusu öne alındı çünkü adres kapatıldıktan sonra gönderi
 *    firmada oluşturuluyor; alıcı sunumu değerlendirirken ürünün hangi
 *    firmayla geleceğini bilmeliydi — şubesi uzak bir firma alıcı için
 *    gerçek bir maliyet.
 *
 * Seçim BAĞLAYICIDIR: `kargoSaat` ile aynı mantık, satıcının kendi vaadi
 * ve sipariş açıldıktan sonra değiştirilemez (bkz. gonderiHazirla).
 */

const MIN_ACIKLAMA = 30;
/** Uçtaki `cokSatir(govde.aciklama, 600)` ile AYNI olmalı. */
const MAX_ACIKLAMA = 600;

// Renk için hazır seçenekler — liste açılır ama serbest yazmaya da açık.
// Yıl/beden seçenekleri kategoriye göre `yilSecenekleriFor`'dan gelir.
const RENK_SECENEKLERI = [
  "Siyah",
  "Beyaz",
  "Gri",
  "Gümüş",
  "Mavi",
  "Lacivert",
  "Kırmızı",
  "Bordo",
  "Yeşil",
  "Sarı",
  "Turuncu",
  "Mor",
  "Pembe",
  "Kahverengi",
  "Bej",
  "Altın",
  "Şeffaf",
  "Çok renkli",
];

const inputCls =
  "w-full box-border rounded-control border-[1.5px] border-border-input bg-card px-4 py-[15px] text-[16.5px] font-medium leading-snug text-ink-900 outline-none focus:border-primary";
const labelCls = "mb-2 block text-[15.5px] font-bold text-ink-900";
const pillActive =
  "cursor-pointer rounded-full border-[1.5px] border-primary bg-primary-soft px-4 py-[12px] text-[15px] font-bold text-primary-hover";
const pillPassive =
  "cursor-pointer rounded-full border-[1.5px] border-border-input bg-card px-4 py-[12px] text-[15px] font-semibold text-ink-500 hover:border-primary hover:text-primary";
const stepBadge =
  "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white";
const sectionCls = "rounded-panel border border-border bg-card p-7";

/**
 * Alıcının o alanda ne istediğini alan başlığının altında gösteren küçük not.
 * Sabit yükseklikte: notu olmayan alan da aynı boşluğu ayırır, böylece yan yana
 * duran kutular (ör. Yıl / Renk) her koşulda aynı hizada başlar.
 */
function Beklenti({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mb-2 -mt-1 h-[20px] text-[13.5px] font-semibold leading-[20px] text-primary-hover">
      {children ? <>Alıcı: {children}</> : null}
    </p>
  );
}

/**
 * Türkçe bulunma hâli eki: "İstanbul'da", "İzmir'de", "Uşak'ta", "Kilis'te".
 * Son ünlü kalın/ince ayrımını, son ünsüz ise sert/yumuşak ayrımını belirler.
 */
function bulunmaEki(yer: string): string {
  const temiz = yer.trim();
  if (!temiz) return "";
  const harfler = temiz.toLocaleLowerCase("tr");
  const kalinUnlu = "aıou";
  let sonUnlu = "";
  for (const h of harfler) if ("aeıioöuü".includes(h)) sonUnlu = h;
  const kalin = kalinUnlu.includes(sonUnlu);
  const sertUnsuz = "fstkçşhp".includes(harfler[harfler.length - 1]);
  const ek = sertUnsuz ? (kalin ? "ta" : "te") : kalin ? "da" : "de";
  return `${temiz}'${ek}`;
}

const DIGER_MARKA = "Diğer marka";

/**
 * Seç-ya-da-yaz kutusu: tıklayınca seçenekler kutunun altında açılır, ama
 * listede olmayan bir değer de serbestçe yazılabilir.
 */
function SecYaAdaYaz({
  id,
  value,
  onChange,
  secenekler,
  placeholder,
  inputMode,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  secenekler: string[];
  placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  const [acik, setAcik] = useState(false);
  const yazilan = value.trim().toLowerCase();
  const suzulmus = secenekler.filter((s) =>
    s.toLowerCase().startsWith(yazilan),
  );
  const liste = yazilan && suzulmus.length ? suzulmus : secenekler;

  return (
    <div
      className="relative mt-auto"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setAcik(false);
      }}
    >
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        autoComplete="off"
        onFocus={() => setAcik(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setAcik(true);
        }}
        placeholder={placeholder}
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Seçenekleri aç"
        onMouseDown={(e) => {
          e.preventDefault();
          setAcik((v) => !v);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-ink-400 hover:text-primary"
      >
        ▾
      </button>
      {acik && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[220px] overflow-y-auto rounded-control border border-border bg-card py-1 shadow-[var(--shadow-pop)]">
          {liste.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s);
                  setAcik(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-[14px] font-medium transition-colors hover:bg-primary-soft hover:text-primary-hover ${
                  s === value
                    ? "bg-primary-soft font-bold text-primary-hover"
                    : "text-ink-900"
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SunumYapClient({ talep }: { talep: Talep }) {
  const router = useRouter();
  // Giyimde yıl slotu beden tutuyor; etiket ve giriş kuralları buna bakar.
  const beden = yilSlotuBedenMi(talep.kategori);
  // Fotoğraf/video gerçekten seçilir: dosyalar tarayıcı belleğinde tutulur,
  // sunum gönderilirken /api/yukle ile sunucuya yüklenir.
  const [fotoDosyalar, setFotoDosyalar] = useState<Yuklenen[]>([]);
  const [videoDosyalar, setVideoDosyalar] = useState<Yuklenen[]>([]);
  const [dosyaHatasi, setDosyaHatasi] = useState("");
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fotolar = fotoDosyalar.length;
  const video = videoDosyalar.length > 0;

  function dosyaEkle(tip: "foto" | "video", secilen: FileList | null) {
    if (!secilen || secilen.length === 0) return;
    const foto = tip === "foto";
    const mevcut = foto ? fotoDosyalar : videoDosyalar;
    const limit = foto ? MAX_FOTO : MAX_VIDEO;
    const maxByte = foto ? MAX_FOTO_BYTE : MAX_VIDEO_BYTE;
    const onEk = foto ? "image/" : "video/";

    const kabul: Yuklenen[] = [];
    const hatalar: string[] = [];

    for (const dosya of Array.from(secilen)) {
      if (mevcut.length + kabul.length >= limit) {
        hatalar.push(
          `En fazla ${limit} ${foto ? "fotoğraf" : "video"} ekleyebilirsin.`,
        );
        break;
      }
      if (!dosya.type.startsWith(onEk)) {
        hatalar.push(`"${dosya.name}" bir ${foto ? "görsel" : "video"} değil.`);
        continue;
      }
      if (dosya.size > maxByte) {
        hatalar.push(
          `"${dosya.name}" çok büyük (${boyutText(dosya.size)}). Sınır ${boyutText(maxByte)}.`,
        );
        continue;
      }
      // Toplam boyut tavanı: sunucu bunu zaten uyguluyor ama kullanıcıyı
      // formun sonunda değil, dosyayı seçerken uyarmak gerekiyor.
      const suankiToplam =
        [...fotoDosyalar, ...videoDosyalar].reduce(
          (t, y) => t + y.dosya.size,
          0,
        ) + kabul.reduce((t, y) => t + y.dosya.size, 0);
      if (suankiToplam + dosya.size > MAX_TOPLAM_BYTE) {
        hatalar.push(
          `Tek seferde en fazla ${boyutText(MAX_TOPLAM_BYTE)} yükleyebilirsin. "${dosya.name}" bu sınırı aşıyor.`,
        );
        continue;
      }
      kabul.push({
        id: `${Date.now()}-${dosya.name}-${kabul.length}`,
        dosya,
        url: URL.createObjectURL(dosya),
      });
    }

    if (kabul.length) {
      if (foto) setFotoDosyalar((p) => [...p, ...kabul]);
      else setVideoDosyalar((p) => [...p, ...kabul]);
    }
    setDosyaHatasi(hatalar[0] ?? "");
  }

  function dosyaKaldir(tip: "foto" | "video", id: string) {
    const guncelle = (p: Yuklenen[]) => {
      const hedef = p.find((y) => y.id === id);
      if (hedef) URL.revokeObjectURL(hedef.url);
      return p.filter((y) => y.id !== id);
    };
    if (tip === "foto") setFotoDosyalar(guncelle);
    else setVideoDosyalar(guncelle);
    setDosyaHatasi("");
  }

  const [baslik, setBaslik] = useState("");
  // Marka/model yalnızca muadil sunumda sorulur; birebir üründe alıcının
  // ilandaki değerleri geçerlidir.
  const [markaSecim, setMarkaSecim] = useState("");
  const [markaDiger, setMarkaDiger] = useState("");
  const [model, setModel] = useState("");
  const [yil, setYil] = useState("");
  const [renk, setRenk] = useState("");

  const [durum, setDurum] = useState("");
  // Alıcı defosuz istiyorsa bile satıcı dürüst yanıt verir; uyuşmazlık uyarıyla gösterilir.
  const [defoVar, setDefoVar] = useState<null | boolean>(null);
  const [muadil, setMuadil] = useState<null | boolean>(null);

  /**
   * Muadil sunumda seçilebilecek markalar — ürün ağacından, ALICININ
   * ilanındaki tür/çeşit dalından.
   *
   * Eskiden `kategoriMarkalari(talep.kategori)` çağrılıyordu ve o fonksiyon
   * `lib/data.ts` içindeki BOŞ `talepler` tohum dizisinden okuyordu: liste
   * her zaman boş dönüyor, satıcı muadil sunum yaparken açılır kutuda
   * yalnızca "Diğer" görüyordu. İlan Aç formu aynı işi zaten doğru
   * kaynaktan yapıyordu (`markalarFor`).
   */
  const markaListesi = useMemo(
    () => markalarFor(talep.kategori, talep.tur ?? "", talep.cesit ?? ""),
    [talep.kategori, talep.tur, talep.cesit],
  );
  // Birebir üründe marka/model alıcının ilanından gelir.
  const marka =
    muadil === true
      ? markaSecim === DIGER_MARKA
        ? markaDiger
        : markaSecim
      : talep.marka;
  const modelDegeri = muadil === true ? model : (talep.model ?? "");

  const [fiyat, setFiyat] = useState("");
  const [teslim, setTeslim] = useState("");
  const [kargo, setKargo] = useState<string>("");
  const [il, setIl] = useState("");
  const [ilce, setIlce] = useState("");

  const [aciklama, setAciklama] = useState("");
  const [fatura, setFatura] = useState(false);
  const [kutu, setKutu] = useState(false);
  const [aksesuar, setAksesuar] = useState(false);
  const [onay, setOnay] = useState(false);

  const [gonderildi, setGonderildi] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderimHatasi, setGonderimHatasi] = useState("");
  // Adımlar başlamadan önce ilanın özetini gösterip onay alırız.
  const [basladi, setBasladi] = useState(false);

  const fiyatNum = Number(fiyat);

  // Alıcının ilandaki beklentileri — hem giriş ekranında hem sağ panelde.
  const talepSatirlari = [
    { k: "Kategori", v: talep.kategori },
    { k: "Tür", v: talep.tur },
    { k: "Çeşit", v: talep.cesit },
    { k: "Marka", v: talep.marka },
    { k: modelEtiketi(talep.kategori), v: talep.model },
    { k: yilEtiketi(talep.kategori), v: talep.yil },
    { k: "Renk", v: talep.renk },
    { k: "Kabul edilen durum", v: talep.durum },
    {
      k: "Defo",
      v:
        talep.defoKabul === undefined
          ? undefined
          : talep.defoKabul
            ? "Defolu olabilir"
            : "Defosuz olmalı",
    },
    {
      k: "Muadil",
      v:
        talep.muadilKabul === undefined
          ? undefined
          : talep.muadilKabul
            ? "Kabul ediyor"
            : "Birebir aynısı",
    },
    { k: "Konum", v: `${talep.ilce}, ${talep.il}` },
  ].filter((r): r is { k: string; v: string } => Boolean(r.v));

  // ── Adım adım ilerleme — her adım tamamlanmadan sonraki açılmaz. ─────────
  const adimlar = [
    { n: 1, ad: "Ürün kimliği" },
    { n: 2, ad: "Fotoğraflar" },
    { n: 3, ad: "Kondisyon" },
    { n: 4, ad: "Fiyat & teslimat" },
    { n: 5, ad: "Notun" },
    { n: 6, ad: "Önizle & gönder" },
  ];
  const sonAdim = adimlar.length;
  const [adim, setAdim] = useState(1);

  const adimTamam: Record<number, boolean> = {
    1:
      baslik.trim().length > 0 &&
      muadil !== null &&
      // Muadil sunumda marka seçimi zorunlu; birebir üründe ilandan gelir.
      (muadil === false || marka.trim().length > 0),
    2: fotolar >= 1,
    3: durum !== "" && defoVar !== null,
    4: fiyatNum > 0 && teslim !== "" && kargo !== "",
    5: aciklama.trim().length >= MIN_ACIKLAMA,
    6: onay,
  };
  const eksikAdim = adimlar.find((a) => !adimTamam[a.n]);
  const gecerli = !eksikAdim;

  /**
   * Sunumu sunucuya gönderir. Kayıt `/api/sunumlar` üzerinden depoya yazılır;
   * talep sahibi kendi "Gelen Sunumlar" listesinde görür. Kendi talebine
   * sunum yapma yasağı da sunucuda uygulanır.
   */
  async function sunumuGonder() {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    setGonderimHatasi("");
    try {
      // 1) Fotoğraf ve video sunucuya yüklenir; dönen yollar sunuma yazılır.
      let gorseller: string[] = [];
      const dosyalar = [...fotoDosyalar, ...videoDosyalar];
      if (dosyalar.length) {
        const form = new FormData();
        dosyalar.forEach((y) => form.append("dosyalar", y.dosya));
        const y = await fetch("/api/yukle", { method: "POST", body: form });
        // Gövde ok kontrolünden ÖNCE çözülürse, sunucu JSON yerine HTML
        // döndüğünde (ör. ara katmanın 413'ü) kullanıcı anlamlı mesaj yerine
        // JSON ayrıştırma hatası görüyordu.
        const yv = (await y.json().catch(() => ({}))) as {
          hata?: string;
          yollar?: string[];
        };
        if (!y.ok) throw new Error(yv.hata ?? "Dosyalar yüklenemedi.");
        gorseller = yv.yollar ?? [];
      }

      // 2) Sunum kaydedilir.
      const r = await fetch("/api/sunumlar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          talepId: talep.id,
          baslik: baslik.trim(),
          fiyatNum,
          urun: `${marka} ${modelDegeri}`.trim(),
          // marka/model AYRI da gönderilir. Uç ikisini de kabul ediyor ve
          // künye bileşeni `s.marka`/`s.model` okuyor, ama form yalnızca
          // birleştirilmiş `urun` metnini yolluyordu: kayıtta iki alan da
          // boş kalıyor, alıcı tarafı künyeyi `urun.split(" ")` tahminiyle
          // kuruyordu — çok kelimeli markalarda ("A. Lange & Söhne") bu
          // tahmin yanlış çıkar.
          marka: marka || undefined,
          model: modelDegeri || undefined,
          muadil: muadil === true,
          yil,
          renk,
          durum,
          defoVar: defoVar === true,
          kutu,
          fatura,
          aksesuar,
          teslim,
          // Etiketi UÇ üretir; burada yalnızca seçim taşınır.
          kargoFirma: kargo,
          kargo: `${kargo} ile gönderilecek`,
          il,
          ilce,
          aciklama: aciklama.trim(),
          fotolar,
          video,
          gorseller,
        }),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.hata ?? "Sunum gönderilemedi.");
      setGonderildi(true);
      // Profil ve ilan sayfalarındaki sunucu verisi tazelensin ki
      // "Sunumlarım" sekmesi yeni sunumu hemen göstersin.
      router.refresh();
    } catch (e) {
      setGonderimHatasi(
        e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.",
      );
    } finally {
      setGonderiliyor(false);
    }
  }

  // Önizleme ve alıcının göreceği sunum detayı aynı veriyi kullanır.
  const sunum: Sunum = {
    baslik: baslik.trim() || "Sunum başlığı",
    fiyatNum,
    marka: marka || undefined,
    model: modelDegeri || undefined,
    urun:
      muadil === true
        ? `${marka} ${modelDegeri}`.trim()
        : `${talep.marka}${talep.model ? ` ${talep.model}` : ""}`,
    muadil: muadil === true,
    yil,
    renk,
    durum,
    defoVar,
    kutu,
    fatura,
    aksesuar,
    teslim,
    kargo: kargo ? `${kargo} ile gönderilecek` : undefined,
    kargoFirma: kargo || undefined,
    il,
    ilce,
    aciklama,
    fotolar,
    video,
    // Önizlemede yerel object URL'ler kullanılır; gönderimde sunucu yolları.
    gorseller: fotoDosyalar.map((y) => y.url),
  };

  function ileri() {
    if (!adimTamam[adim]) return;
    setAdim((a) => Math.min(sonAdim, a + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }
  function geri() {
    setAdim((a) => Math.max(1, a - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  if (gonderildi) {
    return (
      <main className="mx-auto max-w-[720px] px-6 pb-20 pt-10">
        <div className="rounded-panel border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-extrabold text-ink-900">
            ✓
          </div>
          <h1 className="mt-4 text-[26px] font-extrabold text-ink-900">
            Sunumun talep sahibine ulaştı
          </h1>
          <p className="mx-auto mt-2 max-w-[440px] text-[14.5px] font-medium leading-relaxed text-ink-500">
            {talep.baslik} talebine sunum gönderdin. Alıcı beğenirse teklif
            ister ve sohbet açılır; durumunu Sunumlarım alanından takip
            edebilirsin.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <ButtonLink href="/profil?tab=sunumlar" variant="primary" size="lg">
              Sunumlarım
            </ButtonLink>
            <ButtonLink
              href={`/ilan/${talep.id}`}
              variant="secondary"
              size="lg"
            >
              Talebe dön
            </ButtonLink>
          </div>
        </div>
      </main>
    );
  }

  // ── Giriş ekranı: ilanın özeti + "devam etmek istiyor musun?" ────────────
  if (!basladi) {
    return (
      <main className="mx-auto max-w-[1180px] px-6 pb-10 pt-5">
        <nav className="text-[14px] font-semibold text-ink-400">
          <Link href="/kesfet" className="hover:text-primary">
            Talepleri Keşfet
          </Link>{" "}
          ›{" "}
          <Link href={`/ilan/${talep.id}`} className="hover:text-primary">
            {talep.baslik}
          </Link>{" "}
          › <span className="text-ink-900">Sunum yap</span>
        </nav>

        {/* Yatay düzen — talebin tamamı tek karede, kaydırmadan görünür. */}
        <div className="mt-3 rounded-panel border border-border bg-card p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            {/* Sol: kimlik + fiyat + not */}
            <div className="min-w-0">
              <div className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-primary">
                Sunum yapacağın talep
              </div>
              <h1 className="mt-1.5 text-[25px] font-extrabold leading-snug text-ink-900">
                {talep.baslik}
              </h1>
              <div className="mt-1.5 text-[13.5px] font-medium text-ink-400">
                İlan {talepNo(talep.id)} · {ilanTarihi(talep)} ·{" "}
                {kalanGun(talep)} gün kaldı · {talep.sunum} sunum
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Chip variant="violet">{talep.kategori}</Chip>
                {talep.acil && <Chip variant="acil">! Acil</Chip>}
                {talep.muadilKabul && <Chip variant="lime">Muadil kabul</Chip>}
              </div>

              <div className="mt-3 flex items-baseline justify-between rounded-card bg-primary-soft px-3.5 py-2.5">
                <span className="text-[13.5px] font-bold text-primary-hover">
                  ALICININ FİYATI
                </span>
                <span className="text-[21px] font-extrabold text-primary-hover">
                  {fiyatText(talep.fiyatNum)}
                </span>
              </div>
            </div>

            {/* Sağ: beklentiler — iki/üç sütun, kaydırmasız */}
            <dl className="grid grid-cols-2 gap-x-5 self-start sm:grid-cols-3">
              {talepSatirlari.map((r) => (
                <div key={r.k} className="border-b border-hairline py-2.5">
                  <dt className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-ink-400">
                    {r.k}
                  </dt>
                  <dd className="mt-1 text-[15.5px] font-bold text-ink-900">
                    {r.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Talep notu tam genişlikte: beklentiler kısa kaldığında sağda
              boş alan kalıyor, not da dar sütunda sıkışıyordu. */}
          <div className="mt-4 rounded-card bg-subtle p-4">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-ink-400">
              Alıcının talep notu
            </div>
            <p className="mt-1.5 text-[14.5px] font-medium leading-relaxed text-ink-700">
              {talep.aciklama}
            </p>
          </div>

          {/* Alt şerit: onay sorusu + aksiyonlar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <div className="min-w-0">
              <p className="text-[17px] font-bold text-ink-900">
                Bu ilana sunum teklifi göndereceksiniz. Devam etmek istiyor
                musunuz?
              </p>
              <p className="mt-1 text-[14.5px] font-medium text-ink-500">
                Devam edersen 6 adımda ürününü tanıtırsın; alıcının beklentileri
                ilgili alanların altında görünür.
              </p>
            </div>
            <div className="flex flex-none flex-wrap gap-2.5">
              <ButtonLink
                href={`/ilan/${talep.id}`}
                variant="secondary"
                size="lg"
              >
                Vazgeç
              </ButtonLink>
              <Button
                type="button"
                variant="lime"
                size="lg"
                className="min-w-[200px]"
                onClick={() => {
                  setBasladi(true);
                  if (typeof window !== "undefined")
                    window.scrollTo({ top: 0 });
                }}
              >
                Devam Et ›
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      {/* Üst bilgi */}
      <nav className="text-[13px] font-semibold text-ink-400">
        <Link href="/kesfet" className="hover:text-primary">
          Talepleri Keşfet
        </Link>{" "}
        ›{" "}
        <Link href={`/ilan/${talep.id}`} className="hover:text-primary">
          {talep.baslik}
        </Link>{" "}
        › <span className="text-ink-900">Sunum yap</span>
      </nav>

      <div className="mt-3 mb-5">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
          Sunum yap
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-10 gap-y-2">
          <p className="text-[16px] font-medium text-ink-500">
            Adım {adim}/{sonAdim} · {adimlar[adim - 1].ad} — her adımı
            tamamladıkça bir sonraki açılır.
          </p>
          {adim === sonAdim && (
            <div className="flex min-w-[280px] max-w-[560px] flex-1 items-start gap-2.5 rounded-card bg-primary-soft px-4 py-3">
              <span aria-hidden className="text-[18px] leading-snug">
                🔒
              </span>
              <p className="text-[14.5px] font-medium leading-snug text-ink-700">
                <b>Sunumun sana özeldir.</b> Fiyatın ve açıklaman yalnızca talep
                sahibine görünür; diğer satıcılar göremez.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Adım çubuğu — tamamlananlara geri dönülebilir. */}
      <ol className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {adimlar.map((a, i) => {
          const aktif = a.n === adim;
          const tamam = adimTamam[a.n] && a.n < adim;
          return (
            <li key={a.n} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => a.n < adim && setAdim(a.n)}
                disabled={a.n > adim}
                aria-current={aktif ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[14.5px] font-bold transition-colors ${
                  aktif
                    ? "bg-primary text-white"
                    : tamam
                      ? "cursor-pointer bg-primary-soft text-primary-hover hover:brightness-95"
                      : "cursor-not-allowed bg-page text-ink-300"
                }`}
              >
                <span
                  className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12.5px] font-extrabold ${
                    aktif
                      ? "bg-white text-primary"
                      : tamam
                        ? "bg-accent text-ink-900"
                        : "bg-card text-ink-300"
                  }`}
                >
                  {tamam ? "✓" : a.n}
                </span>
                {a.ad}
              </button>
              {i < adimlar.length - 1 && (
                <span aria-hidden className="text-[13px] text-ink-300">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Tek sütun, sayfa genişliğince — her adımda yalnızca o adımın kutusu. */}
      <div>
        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (adim < sonAdim) {
              ileri();
              return;
            }
            if (gecerli) void sunumuGonder();
          }}
          className="flex flex-col gap-4"
        >
          {/* 1 · Ürün kimliği */}
          <section className={sectionCls} hidden={adim !== 1}>
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>1</span>
              <h2 className="text-[19.5px] font-extrabold text-ink-900">
                Ürün kimliği
              </h2>
            </div>
            <p className="mt-2 text-[14.5px] font-medium leading-relaxed text-ink-500">
              Alıcının ilanda yazdığı bilgilerin karşılığını doldur; boş
              bıraktığın her alan alıcıda soru işareti bırakır.
            </p>

            <div className="mt-4">
              {/* Sayaç eklendi: alan 80'de sessizce kesiyordu ve kullanıcı
                  ne kadar yeri kaldığını hiçbir yerden göremiyordu. Sınır
                  artık uçla AYNI sabitten okunuyor (bkz. lib/metin.ts →
                  BASLIK_SINIR). */}
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="s-baslik" className={labelCls}>
                  Sunum başlığı
                </label>
                <span
                  className={`text-[12.5px] font-semibold ${
                    baslik.trim().length >= BASLIK_EN_AZ
                      ? "text-primary-hover"
                      : "text-ink-400"
                  }`}
                >
                  {baslik.length}/{BASLIK_SINIR}
                </span>
              </div>
              <input
                id="s-baslik"
                value={baslik}
                onChange={(e) =>
                  setBaslik(e.target.value.slice(0, BASLIK_SINIR))
                }
                maxLength={BASLIK_SINIR}
                placeholder="örn. Jelatininde Dawn FM CD · imza kartlı"
                className={inputCls}
              />
            </div>

            {/* Muadil mi? — marka/model alanları buna bağlı açılır. */}
            <div className="mt-[18px]">
              <label className={labelCls}>
                Sunduğun ürün alıcının aradığının birebir aynısı mı?
              </label>
              <Beklenti>
                {talep.muadilKabul
                  ? "Muadil ürün de kabul ediyor."
                  : "Birebir aynısını istiyor."}
              </Beklenti>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    v: false,
                    l: `Evet — ${talep.marka} ${talep.model ?? ""}`.trim(),
                  },
                  { v: true, l: "Hayır — muadili / eşdeğeri" },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    onClick={() => setMuadil(o.v)}
                    className={muadil === o.v ? pillActive : pillPassive}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              {muadil === false && (
                <p className="mt-2 text-[12.5px] font-medium leading-snug text-ink-500">
                  Marka ve model alıcının ilanından alınır:{" "}
                  <strong className="text-ink-900">
                    {talep.marka}
                    {talep.model ? ` ${talep.model}` : ""}
                  </strong>{" "}
                  — tekrar girmene gerek yok.
                </p>
              )}
              {muadil === true && !talep.muadilKabul && (
                <p className="mt-2 text-[12.5px] font-semibold text-danger">
                  Alıcı muadil kabul etmiyor — sunumun elenebilir.
                </p>
              )}
            </div>

            {/* Muadil sunumda marka/model — kategori markalarından seçilir. */}
            {muadil === true && (
              <div className="mt-[18px] grid grid-cols-1 gap-x-3 gap-y-[18px] sm:grid-cols-2">
                <div>
                  <label htmlFor="s-marka" className={labelCls}>
                    Muadil ürünün markası
                  </label>
                  <select
                    id="s-marka"
                    value={markaSecim}
                    onChange={(e) => setMarkaSecim(e.target.value)}
                    className={`${inputCls} cursor-pointer`}
                  >
                    <option value="" disabled>
                      {talep.kategori} markaları
                    </option>
                    {markaListesi.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                    <option>{DIGER_MARKA}</option>
                  </select>
                  {markaSecim === DIGER_MARKA && (
                    <input
                      value={markaDiger}
                      onChange={(e) =>
                        setMarkaDiger(e.target.value.slice(0, 40))
                      }
                      placeholder="Markayı yaz"
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="s-model" className={labelCls}>
                    {modelSlotuCinsiyetMi(talep.kategori)
                      ? "Muadil ürünün cinsiyeti"
                      : "Muadil ürünün modeli"}
                  </label>
                  <input
                    id="s-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value.slice(0, 40))}
                    placeholder={
                      modelSlotuCinsiyetMi(talep.kategori)
                        ? "örn. Kadın"
                        : "örn. 3410"
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* Beklenti notu olan/olmayan alanlar aynı hizada dursun diye
                hücreler eşit yükseklikte; input hep en alta yaslanır. */}
            <div className="mt-[18px] grid grid-cols-1 items-stretch gap-x-3 gap-y-[18px] sm:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="s-yil" className={labelCls}>
                  {yilEtiketi(talep.kategori)}
                </label>
                {talep.yil ? <Beklenti>{talep.yil}</Beklenti> : null}
                {/* Listeden seçilebilir ama serbest yazmaya da açık. */}
                <SecYaAdaYaz
                  id="s-yil"
                  value={yil}
                  // Beden harf de olabilir (XL, Çocuk 6-7 Yaş); yalnızca
                  // yılda rakama zorluyoruz.
                  inputMode={beden ? "text" : "numeric"}
                  onChange={(v) =>
                    setYil(
                      beden
                        ? v.slice(0, 24)
                        : v.replace(/[^0-9]/g, "").slice(0, 4),
                    )
                  }
                  secenekler={[
                    ...new Set(
                      [talep.yil, ...yilSecenekleriFor(talep.kategori)].filter(
                        (y): y is string => Boolean(y),
                      ),
                    ),
                  ]}
                  placeholder={
                    talep.yil ??
                    (beden
                      ? "Seç ya da yaz — örn. L"
                      : "Seç ya da yaz — örn. 2022")
                  }
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="s-renk" className={labelCls}>
                  Renk
                </label>
                {talep.renk ? <Beklenti>{talep.renk}</Beklenti> : null}
                <SecYaAdaYaz
                  id="s-renk"
                  value={renk}
                  onChange={(v) => setRenk(v.slice(0, 30))}
                  secenekler={[
                    ...new Set(
                      [talep.renk, ...RENK_SECENEKLERI].filter(
                        (r): r is string => Boolean(r),
                      ),
                    ),
                  ]}
                  placeholder={talep.renk ?? "Seç ya da yaz — örn. Siyah"}
                />
              </div>
            </div>
          </section>

          {/* 2 · Fotoğraf & video */}
          <section className={sectionCls} hidden={adim !== 2}>
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>2</span>
              <h2 className="text-[19.5px] font-extrabold text-ink-900">
                Ürün fotoğrafları
              </h2>
            </div>
            <p className="mt-2 text-[14.5px] font-medium leading-relaxed text-ink-500">
              En az 1 fotoğraf zorunlu; kendi çektiğin gerçek fotoğraflar
              alıcının en çok baktığı şey. Son kutu kısa video içindir — ürünün
              çalıştığını göstermek sunumunu öne taşır.
            </p>
            {/* Gizli dosya girişleri — kutulara tıklayınca açılır. */}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                dosyaEkle("foto", e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                dosyaEkle("video", e.target.files);
                e.target.value = "";
              }}
            />

            <div className="mt-3.5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {Array.from({ length: MAX_FOTO }, (_, i) => {
                const yuklu = fotoDosyalar[i];
                if (yuklu)
                  return (
                    <div
                      key={yuklu.id}
                      className="relative aspect-square overflow-hidden rounded-control border-[1.5px] border-primary bg-subtle"
                    >
                      {/* Önizleme yerel object URL'den gelir; sunucuya
                          yükleme sunum gönderilirken yapılır. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={yuklu.url}
                        alt={`Fotoğraf ${i + 1}`}
                        className="h-full w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => dosyaKaldir("foto", yuklu.id)}
                        aria-label={`Fotoğraf ${i + 1} kaldır`}
                        className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink-900/70 text-[12px] font-bold text-white hover:bg-danger"
                      >
                        ✕
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded-md bg-ink-900/70 px-1.5 py-[2px] text-[10px] font-bold text-white">
                          Kapak
                        </span>
                      )}
                    </div>
                  );
                return (
                  <button
                    key={`bos-${i}`}
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    aria-label="Fotoğraf ekle"
                    className="flex aspect-square cursor-pointer items-center justify-center rounded-control border-[1.5px] border-dashed border-border-input bg-subtle text-[12px] font-bold text-ink-400 transition-colors hover:border-primary hover:text-primary"
                  >
                    +
                  </button>
                );
              })}

              {/* 6. kutu: video */}
              {videoDosyalar[0] ? (
                <div className="relative aspect-square overflow-hidden rounded-control border-[1.5px] border-accent">
                  <video
                    src={videoDosyalar[0].url}
                    className="h-full w-full object-cover"
                    muted
                  />
                  <button
                    type="button"
                    onClick={() => dosyaKaldir("video", videoDosyalar[0].id)}
                    aria-label="Videoyu kaldır"
                    className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink-900/70 text-[12px] font-bold text-white hover:bg-danger"
                  >
                    ✕
                  </button>
                  <span className="absolute bottom-1 left-1 rounded-md bg-ink-900/70 px-1.5 py-[2px] text-[10px] font-bold text-white">
                    Video
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  aria-label="Video ekle"
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control border-[1.5px] border-dashed border-border-input bg-subtle text-[12px] font-bold text-ink-400 transition-colors hover:border-accent hover:text-accent-ink"
                >
                  <span aria-hidden className="text-[18px] leading-none">
                    ▸
                  </span>
                  Video
                </button>
              )}
            </div>

            <p className="mt-2.5 text-[13px] font-medium text-ink-400">
              JPG, PNG, WEBP veya GIF · fotoğraf başına en fazla{" "}
              {boyutText(MAX_FOTO_BYTE)} · video en fazla{" "}
              {boyutText(MAX_VIDEO_BYTE)}. Fotoğraflar yüklenirken 3:4 dikey
              ölçüye (1200×1600) otomatik uyarlanır — kırpma yapılmaz.
            </p>
            {dosyaHatasi && (
              <p className="mt-1.5 text-[13px] font-bold text-danger">
                {dosyaHatasi}
              </p>
            )}
          </section>

          {/* 3 · Kondisyon — alıcının kriterlerine yanıt */}
          <section className={sectionCls} hidden={adim !== 3}>
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>3</span>
              <h2 className="text-[19.5px] font-extrabold text-ink-900">
                Kondisyon ve alıcının koşulları
              </h2>
            </div>

            <div className="mt-4">
              <label className={labelCls}>Ürün durumu</label>
              <Beklenti>
                {talepDurumlari(talep).length === 0
                  ? "Ürün durumu farketmiyor."
                  : `${talepDurumlari(talep).join(" / ")} olmalı.`}
              </Beklenti>
              <div className="flex flex-wrap gap-2">
                {durumSecenekleri.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={durum === d}
                    onClick={() => setDurum(d)}
                    className={durum === d ? pillActive : pillPassive}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-[18px]">
              <label className={labelCls}>Üründe defo var mı?</label>
              {/* Alıcı yanıt vermediyse ona söz atfedilmez; eskiden boş
                  kayıt "Defosuz olmalı." diye okunuyordu. */}
              <Beklenti>
                {talep.defoKabul === undefined
                  ? "Alıcı belirtmedi."
                  : talep.defoKabul
                    ? "Defolu da olabilir."
                    : "Defosuz olmalı."}
              </Beklenti>
              <div className="flex gap-2">
                {[
                  { v: false, l: "Defosuz" },
                  { v: true, l: "Defosu var" },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    onClick={() => setDefoVar(o.v)}
                    className={defoVar === o.v ? pillActive : pillPassive}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              {/* Defo tarifi ayrı bir alanda değil; satıcı defoyu açıklamada
                  ya da sohbette anlatır — akış tek yerde toplanır. */}
              {/* KIRMIZI UYARI YALNIZCA GERÇEK BİR ŞARTTA.
                  Alıcı soruyu yanıtlamamışken de "Alıcı defosuz ürün istiyor"
                  diye kırmızı uyarı çıkıyordu — satıcıyı olmayan bir şarta
                  göre caydırıyordu. */}
              {defoVar === true && (
                <p
                  className={`mt-3 text-[12.5px] font-semibold leading-normal ${
                    talep.defoKabul === false ? "text-danger" : "text-ink-500"
                  }`}
                >
                  {talep.defoKabul === false
                    ? "Alıcı defosuz ürün istiyor. Yine de sunabilirsin; defoyu aşağıdaki açıklama alanında ya da sohbette açıkça belirt."
                    : "Defoyu aşağıdaki açıklama alanında ya da sohbette ayrıntılı anlat."}
                </p>
              )}
            </div>

            <div className="mt-[18px]">
              <label className={labelCls}>Beraberinde</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { on: kutu, set: setKutu, l: "Orijinal kutusu" },
                  { on: fatura, set: setFatura, l: "Faturası" },
                  { on: aksesuar, set: setAksesuar, l: "Aksesuarları" },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    aria-pressed={o.on}
                    onClick={() => o.set(!o.on)}
                    className={o.on ? pillActive : pillPassive}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 4 · Fiyat & teslimat */}
          <section className={sectionCls} hidden={adim !== 4}>
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>4</span>
              <h2 className="text-[19.5px] font-extrabold text-ink-900">
                Fiyat ve teslimat
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-[18px] sm:grid-cols-2">
              <div>
                <label htmlFor="s-fiyat" className={labelCls}>
                  Sunum fiyatın (TL)
                </label>
                <Beklenti>{fiyatText(talep.fiyatNum)}</Beklenti>
                <input
                  id="s-fiyat"
                  inputMode="numeric"
                  value={binlikAyir(fiyat)}
                  onChange={(e) =>
                    setFiyat(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))
                  }
                  placeholder={binlikAyir(String(talep.fiyatNum))}
                  className={inputCls}
                />
                {fiyatNum > 0 && (
                  <p
                    className={`mt-2 text-[12.5px] font-semibold ${
                      fiyatNum <= talep.fiyatNum
                        ? "text-accent-ink"
                        : "text-danger"
                    }`}
                  >
                    {fiyatNum <= talep.fiyatNum
                      ? "Alıcının belirlediği fiyatın içindesin."
                      : `Alıcının fiyatını ${binlikAyir(
                          String(fiyatNum - talep.fiyatNum),
                        )} TL aşıyor.`}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="s-teslim" className={labelCls}>
                  Kargoya verme süresi
                </label>
                <Beklenti>
                  {talep.acil
                    ? "Acil-Hızlı kargo bekliyor."
                    : "3 gün kuralı geçerli."}
                </Beklenti>
                <select
                  id="s-teslim"
                  value={teslim}
                  onChange={(e) => setTeslim(e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="" disabled>
                    Süre seç
                  </option>
                  {teslimSecenekleri.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-[18px]">
              <label htmlFor="s-kargo-firma" className={labelCls}>
                Hangi kargo firmasıyla göndereceksin?
              </label>
              {/* Boş `Beklenti`: bu alanın alıcı tarafında bir beklentisi
                  yok, ama bileşen sabit yükseklikte olduğu için ızgaradaki
                  diğer alanlarla hizayı o tutuyor. */}
              <Beklenti />
              <select
                id="s-kargo-firma"
                value={kargo}
                onChange={(e) => setKargo(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Kargo firması seç…</option>
                {KARGO_FIRMALARI.map((k) => (
                  <option key={k.ad} value={k.ad}>
                    {k.ad}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-[18px] grid grid-cols-1 items-stretch gap-x-3 gap-y-[18px] sm:grid-cols-2">
              <div className="flex flex-col">
                {/* "Ürünün bulunduğu şehir" değil: sorulan şey ürünün şu
                    an nerede durduğu değil, gönderinin nereden çıkacağı.
                    Kargo firması seçimiyle aynı bölümün parçası. */}
                <label htmlFor="s-il" className={labelCls}>
                  Ürünü nereden göndereceksin?
                </label>
                <Beklenti>
                  {bulunmaEki(`${talep.ilce}, ${talep.il}`)} ikamet ediyor.
                </Beklenti>
                <select
                  id="s-il"
                  value={il}
                  onChange={(e) => {
                    setIl(e.target.value);
                    setIlce("");
                  }}
                  className={`${inputCls} mt-auto cursor-pointer`}
                >
                  <option value="" disabled>
                    Şehir seç
                  </option>
                  {ilAdlari.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="s-ilce" className={labelCls}>
                  İlçe
                </label>
                <Beklenti />
                <select
                  id="s-ilce"
                  value={ilce}
                  disabled={!il}
                  onChange={(e) => setIlce(e.target.value)}
                  className={`${inputCls} mt-auto cursor-pointer disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-300`}
                >
                  <option value="" disabled>
                    {il ? "İlçe seç" : "Önce şehir seç"}
                  </option>
                  {(il ? ilceler(il) : []).map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 5 · Açıklama */}
          <section className={sectionCls} hidden={adim !== 5}>
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>5</span>
              <h2 className="text-[19.5px] font-extrabold text-ink-900">
                Alıcıya notun
              </h2>
            </div>
            <p className="mt-2 text-[14.5px] font-medium leading-relaxed text-ink-500">
              Alıcının talep notunda sorduklarını burada yanıtla — kondisyon,
              kullanım geçmişi, varsa sertifika/kanıt.
            </p>
            <div className="mt-3.5 rounded-card bg-subtle p-3.5">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink-400">
                Alıcının talep notu
              </div>
              <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink-700">
                {talep.aciklama}
              </p>
            </div>
            <textarea
              rows={6}
              value={aciklama}
              // SINIR UÇLA HİZALI OLMALI: form 800'e izin veriyor ama
              // `/api/sunumlar` 600'e kırpıyordu, yani satıcının yazdığı
              // son 200 karakter sessizce kayboluyordu — üstelik sayaç
              // "0/800" diyerek 800 yazılabileceğini söylüyordu.
              onChange={(e) =>
                setAciklama(e.target.value.slice(0, MAX_ACIKLAMA))
              }
              placeholder="Ürünün kondisyonunu, kutu ve fatura durumunu, elinde nasıl olduğunu anlat."
              className={`${inputCls} mt-3.5 resize-y`}
            />
            <small
              className={`mt-1.5 block text-[12px] font-medium ${
                aciklama.trim().length > 0 &&
                aciklama.trim().length < MIN_ACIKLAMA
                  ? "text-danger"
                  : "text-ink-400"
              }`}
            >
              {aciklama.trim().length}/{MAX_ACIKLAMA} · en az {MIN_ACIKLAMA}{" "}
              karakter
            </small>
          </section>

          {/* 6 · Önizleme, onay & gönder */}
          <section className={sectionCls} hidden={adim !== 6}>
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>6</span>
              <h2 className="text-[19.5px] font-extrabold text-ink-900">
                Önizle ve gönder
              </h2>
            </div>
            <p className="mt-2 text-[14.5px] font-medium leading-relaxed text-ink-500">
              Alıcının göreceği sunum özeti — hatalı bir şey varsa ilgili adıma
              dönüp düzeltebilirsin.
            </p>

            {/* Sunum başlığı — galerinin de üstünde, tam genişlikte */}
            <div className="mt-4 text-[22px] font-extrabold leading-snug text-ink-900">
              {baslik.trim() || "Sunum başlığı"}
            </div>
            {/* Alıcı bunu sunum kartında da görecek — önizlemede de dursun. */}
            {muadil === true && (
              <span className="mt-2 inline-flex items-center rounded-full bg-star px-2.5 py-1.5 text-[11px] font-bold leading-none text-ink-900">
                MUADİL ÜRÜN
              </span>
            )}

            {/* Galeri + künye — alıcının göreceği düzenin önizlemesi */}
            <div className="mt-3 flex flex-col items-start gap-4 lg:flex-row">
              <SunumGaleri
                gorseller={fotoDosyalar.map((y) => y.url)}
                fotolar={fotolar}
                video={video}
                className="lg:w-[320px] lg:flex-none"
              />

              {/* Künye */}
              <div className="flex min-w-0 flex-1 flex-col self-stretch">
                <SunumKunye
                  satirlar={kunyeSatirlari(sunum, talep, {
                    kendiSunumum: true,
                  })}
                />

                {/* Künye ile galerinin alt hizası arasındaki boşlukta durur. */}
                <label className="mt-auto flex cursor-pointer items-start gap-2.5 pt-4 text-[15px] font-medium leading-relaxed text-ink-700">
                  <input
                    type="checkbox"
                    checked={onay}
                    onChange={(e) => setOnay(e.target.checked)}
                    className="mt-0.5 h-[18px] w-[18px] flex-none accent-[var(--color-primary)]"
                  />
                  Sunduğum ürünün yukarıdaki bilgilerle birebir aynı olduğunu,
                  aksi halde iade sürecinin işleyeceğini kabul ediyorum.
                </label>
              </div>
            </div>

            {/* Alıcıya notun — sağdaki boşlukta gönder tuşu göz önünde durur. */}
            <div className="mt-4">
              <SunumNotu
                metin={aciklama}
                yan={
                  <>
                    <Button
                      type="submit"
                      variant="lime"
                      size="lg"
                      disabled={!gecerli || gonderiliyor}
                      className="w-full"
                    >
                      {gonderiliyor ? "Gönderiliyor…" : "Sunumu Gönder"}
                    </Button>
                    {gonderimHatasi && (
                      <p
                        role="alert"
                        className="mt-2 text-[13px] font-bold leading-relaxed text-acil"
                      >
                        {gonderimHatasi}
                      </p>
                    )}
                  </>
                }
              />
            </div>
          </section>

          {/* Adım gezinmesi */}
          <div className="flex items-center justify-between gap-3">
            {adim > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={geri}
              >
                ‹ Geri
              </Button>
            ) : (
              <ButtonLink
                href={`/ilan/${talep.id}`}
                variant="secondary"
                size="lg"
              >
                ‹ Talebe dön
              </ButtonLink>
            )}

            {/* Son adımda gönder tuşu önizlemenin yanında durur. */}
            {adim < sonAdim && (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!adimTamam[adim]}
                className="min-w-[180px]"
              >
                Devam ›
              </Button>
            )}
          </div>

          {!adimTamam[adim] && (
            <p className="-mt-1 text-right text-[12.5px] font-medium text-ink-400">
              {adim === 1 &&
                "Başlık ve birebir/muadil yanıtı (muadilse marka) gerekli."}
              {adim === 2 && "Devam etmek için en az 1 fotoğraf ekle."}
              {adim === 3 && "Ürün durumu ve defo yanıtı gerekli."}
              {adim === 4 && "Fiyat, kargo süresi ve kargo firması gerekli."}
              {adim === 5 && `Not en az ${MIN_ACIKLAMA} karakter olmalı.`}
              {adim === 6 && "Göndermek için onay kutusunu işaretle."}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
