"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  kategoriler,
  fiyatText,
  binlikAyir,
  URUN_DURUMLARI,
  KART_GORSEL_ORANI,
} from "@/lib/data";
import type { Talep } from "@/lib/data";
import { BASLIK_SINIR, BASLIK_EN_AZ } from "@/lib/metin";
import { ilAdlari, ilceler } from "@/lib/turkiye-il-ilce";
import type { KayitliAdres } from "@/lib/adres";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { kategoriIkonlar } from "@/components/KategoriIkon";
import { IlanDetay } from "@/components/IlanDetay";
import { useOturumSahibi } from "@/lib/aktif-kullanici";
import { taslakOku, taslakSil, taslakYaz, useTaslak } from "@/lib/taslak";
import { videoYoluMu } from "@/lib/gorsel";
import { SecimKutusu } from "@/components/ui/SecimKutusu";
import {
  turlerFor,
  cesitlerFor,
  markalarFor,
  modellerFor,
  modelEtiketi,
  modelSlotuCinsiyetMi,
  yilEtiketi,
  yilSecenekleriFor,
  yilSlotuBedenMi,
  RENKLER,
} from "@/lib/urun-agaci";

const MIN_ACIKLAMA = 30;

// Yükleme sınırları
const MAX_FOTO = 4;
const MAX_VIDEO = 2;
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

/** Seçilen bir dosya ve önizleme için üretilmiş object URL'i. */
type Yuklenen = { id: string; dosya: File; url: string };

// Video ayrımı tek yerde: lib/gorsel.ts → videoYoluMu.

function boyutText(byte: number): string {
  const mb = byte / (1024 * 1024);
  return mb >= 1
    ? `${mb.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`
    : `${Math.round(byte / 1024)} KB`;
}

// Alıcının kabul ettiği ürün durumu (tek seçim).
// İlan süresi sabittir: 30 gün (formda gösterilir, seçilemez).
const ilList = ilAdlari;

const inputCls =
  "w-full box-border rounded-control border-[1.5px] border-border-input px-4 py-[15px] text-[16.5px] font-medium leading-snug text-ink-900 outline-none placeholder:text-ink-300 focus:border-primary";

const pillActive =
  "cursor-pointer rounded-full border-[1.5px] border-primary bg-primary-soft px-4 py-[12px] text-[15px] font-bold text-primary-hover";
const pillPassive =
  "cursor-pointer rounded-full border-[1.5px] border-border-input bg-card px-4 py-[12px] text-[15px] font-semibold text-ink-700 hover:border-primary hover:text-primary";

const stepBadge =
  "flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-primary text-[16px] font-extrabold text-white";

const labelCls = "mb-2.5 block text-[15.5px] font-bold text-ink-900";

/** Açılır kutudaki "listede yok" seçeneği. */
const BASKA_KONUM = "Farklı adres gir";

export function IlanAcForm({
  duzenleId,
  duzenlenen,
  taslagiAc = false,
}: {
  duzenleId?: string;
  /** Düzenlenecek talep — sunucudan gelir (sabit veriden değil). */
  duzenlenen?: Talep;
  /**
   * Kayıtlı taslak forma AÇILIŞTA yüklensin mi?
   *
   * Profilim'deki "Taslaklar" panelinden "Düzenlemeye devam et" denildiğinde
   * `?taslak=yukle` ile gelir. Normal girişte false: kullanıcı formu
   * sıfırdan doldurmak istiyor olabilir, taslağı ona ÇUBUKLA sorarız.
   */
  taslagiAc?: boolean;
}) {
  const [kategori, setKategori] = useState("");
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState(""); // Talep notu
  const [fiyat, setFiyat] = useState("");
  const [acilSecim, setAcilSecim] = useState(false);
  const [pazarlikSecim, setPazarlikSecim] = useState(false);
  const [tur, setTur] = useState("");
  const [cesit, setCesit] = useState("");
  const [marka, setMarka] = useState("");
  const [model, setModel] = useState("");
  const [yil, setYil] = useState("");
  const [renk, setRenk] = useState("");
  const [defo, setDefo] = useState<null | boolean>(null);
  // Kabul edilen ürün durumları — boş liste = "Hepsi". Kapsayıcı seçenek
  // ayrı bir bayrak değil, listenin boş hali (Talep Alarmı ile aynı kural).
  const [durumlar, setDurumlar] = useState<string[]>([]);
  const hepsiDurum = durumlar.length === 0;
  /** Kart, önizleme ve kayıt için okunabilir özet. */
  const durum = hepsiDurum ? "Hepsi" : durumlar.join(" / ");

  /**
   * "Hepsi" hiçbir seçeneği kilitlemez: tekil bir duruma basılınca Hepsi
   * bırakılır. Tekillerin tamamı seçilirse anlamı zaten "hepsi" olduğu
   * için kapsayıcı seçenek devralır; hiçbiri kalmazsa da Hepsi'ye döner.
   */
  function durumToggle(d: string) {
    setDurumlar((prev) => {
      const yeni = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d];
      return yeni.length === URUN_DURUMLARI.length ? [] : yeni;
    });
  }
  const [muadilSecim, setMuadilSecim] = useState(false);
  // Kayıtlı adresler — kullanıcı konumunu her talepte baştan seçmesin.
  // Varsayılan adres form açılırken otomatik uygulanır; kullanıcı
  // isterse başka adrese ya da elle girişe geçebilir.
  const [adresler, setAdresler] = useState<KayitliAdres[]>([]);
  const [seciliAdresId, setSeciliAdresId] = useState("");

  const [il, setIl] = useState<string>("");
  const [ilce, setIlce] = useState("");
  const ilceList = il ? ilceler(il) : [];
  const [mahalle, setMahalle] = useState("");
  // Cadde/sokak ilçe ile mahalle arasında sorulur; ilanda kapı numarası
  // görünmediği için burada da yalnızca cadde adı isteniyor.
  const [cadde, setCadde] = useState("");
  // Apartman / kat / daire de ayarlardaki adres formuyla aynı şekilde
  // sorulur; ilanda görünmez, yalnızca anlaşma sonrası teslimat içindir.
  const [apartman, setApartman] = useState("");
  const [kat, setKat] = useState("");
  const [daire, setDaire] = useState("");
  // Mahalle listesi hangi il/ilçe için geldiğiyle birlikte saklanır; seçim
  // değişince eski liste kendiliğinden düşer (effect içinde setState gerekmez).
  const [mahalleVeri, setMahalleVeri] = useState<{
    anahtar: string;
    liste: string[];
  } | null>(null);
  const [konumTarifi, setKonumTarifi] = useState("");
  // Seçilen dosyalar tarayıcı belleğinde tutulur; her biri için bir
  // object URL üretilip önizlemede kullanılır, kaldırılınca geri verilir.
  const [fotoDosyalar, setFotoDosyalar] = useState<Yuklenen[]>([]);
  const [videoDosyalar, setVideoDosyalar] = useState<Yuklenen[]>([]);
  /**
   * DÜZENLEME MODUNDA ilanın HÂLİHAZIRDAKİ görselleri (sunucu yolları).
   *
   * Bu liste eksikti ve sonucu ağırdı: düzenleme formu fotoğraf adımını boş
   * açıyor, adım "en az 1 görsel" istediği için kullanıcı yeniden yüklemek
   * zorunda kalıyor, gönderilen yeni liste de eskisinin yerine geçtiği için
   * orijinal fotoğraflar hem kayıttan hem DİSKTEN siliniyordu. Başlıktaki
   * bir yazım hatasını düzeltmek bütün fotoğrafları kaybettiriyordu.
   */
  const [mevcutGorseller, setMevcutGorseller] = useState<string[]>([]);
  const mevcutFotolar = mevcutGorseller.filter((g) => !videoYoluMu(g));
  const mevcutVideolar = mevcutGorseller.filter(videoYoluMu);
  const [dosyaHatasi, setDosyaHatasi] = useState("");
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // Sayaçlar KAYITLI görselleri de içerir: düzenleme modunda ilanda zaten
  // 3 fotoğraf varsa kutu "3/4" göstermeli, "0/4" değil.
  const fotolar = mevcutFotolar.length + fotoDosyalar.length;
  const videolar = mevcutVideolar.length + videoDosyalar.length;
  const sure = 30;
  const [published, setPublished] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderimHatasi, setGonderimHatasi] = useState("");
  const [yayinId, setYayinId] = useState("");
  const [toastOn, setToastOn] = useState(false);
  /**
   * Bu cihazda kayıtlı bir taslak var mı? (null = henüz bakılmadı)
   *
   * Effect yerine render sırasında düzeltme kalıbı — `yuklenenIlan` ile
   * aynı desen. `localStorage` sunucuda yok, o yüzden ilk render'da null
   * kalır ve istemcide bir kez okunur.
   */
  /**
   * Kayıtlı taslak — depoyu dinleyen hook'tan (bkz. lib/taslak.ts).
   *
   * Eskiden RENDER SIRASINDA `localStorage` okunup `setState` çağrılıyordu;
   * React 19 bunu kaskad render olarak uyarıyor ve sunucuda `localStorage`
   * olmadığı için hidrasyon da kırılganlaşıyordu.
   */
  const kayitliTaslak = useTaslak();
  /** Çubuk kullanıcı "Taslağı yükle" ya da "Sil" dedikten sonra kapanır. */
  const [taslakCubuguKapali, setTaslakCubuguKapali] = useState(false);
  // Düzenleme modunda taslak teklif edilmez: kullanıcı var olan bir ilanı
  // düzenliyor, yarım kalmış başka bir formu değil.
  const taslakVar = !duzenleId && !!kayitliTaslak && !taslakCubuguKapali;
  /** Taslak yazılamadıysa kullanıcıya gösterilen uyarı. */
  const [taslakHatasi, setTaslakHatasi] = useState("");
  const toastRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Düzenleme modu: ?duzenle=<id> sunucuda okunup prop olarak gelir.
  const duzenleModu = !!duzenleId && !!duzenlenen;

  useEffect(() => () => clearTimeout(toastRef.current), []);

  /**
   * Profilim'den "Düzenlemeye devam et" ile gelindiyse taslağı doğrudan
   * yükle. Kullanıcı taslağını orada zaten görüp seçti; formda bir kez daha
   * "Taslağı yükle" demesi gereksiz bir adım olurdu.
   */
  const taslakYuklendiRef = useRef(false);
  useEffect(() => {
    if (!taslagiAc || duzenleId || taslakYuklendiRef.current) return;
    taslakYuklendiRef.current = true;
    // Ref, taslağın yalnızca bir kez yüklenmesini garantiler.
    taslagiYukle();
  }, [taslagiAc, duzenleId]);

  // Object URL'ler kaldırma anında (dosyaKaldir) ve yayınlarken geri verilir.
  // Sayfadan çıkıldığında tarayıcı zaten belgeye bağlı tüm URL'leri serbest
  // bırakır, bu yüzden ayrıca unmount temizliği gerekmiyor.
  function tumUrlleriBirak() {
    [...fotoDosyalar, ...videoDosyalar].forEach((y) =>
      URL.revokeObjectURL(y.url),
    );
  }

  function dosyaEkle(tip: "foto" | "video", secilen: FileList | null) {
    if (!secilen || secilen.length === 0) return;
    const foto = tip === "foto";
    // Sınır KAYITLI görselleri de kapsar; yoksa düzenlemede tavan aşılırdı.
    const mevcut = foto
      ? [...mevcutFotolar, ...fotoDosyalar]
      : [...mevcutVideolar, ...videoDosyalar];
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

  /** Kayıtlı bir görseli listeden çıkarır (kayıt gönderilince kalıcı olur). */
  function kayitliGorseliKaldir(yol: string) {
    setMevcutGorseller((p) => p.filter((g) => g !== yol));
    setDosyaHatasi("");
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

  // İl + ilçe seçilince mahalleler sunucudan çekilir (veri seti istemciye gömülmez).
  const mahalleAnahtar = il && ilce ? `${il}|${ilce}` : "";
  useEffect(() => {
    if (!mahalleAnahtar) return;
    const [aIl, aIlce] = mahalleAnahtar.split("|");
    const ac = new AbortController();
    fetch(
      `/api/mahalleler?il=${encodeURIComponent(aIl)}&ilce=${encodeURIComponent(aIlce)}`,
      { signal: ac.signal },
    )
      .then((r) => r.json())
      .then((d: { mahalleler?: string[] }) =>
        setMahalleVeri({ anahtar: mahalleAnahtar, liste: d.mahalleler ?? [] }),
      )
      .catch(() => {
        if (!ac.signal.aborted)
          setMahalleVeri({ anahtar: mahalleAnahtar, liste: [] });
      });
    return () => ac.abort();
  }, [mahalleAnahtar]);

  const mahalleList =
    mahalleVeri && mahalleVeri.anahtar === mahalleAnahtar
      ? mahalleVeri.liste
      : [];
  const mahalleYukleniyor =
    !!mahalleAnahtar && mahalleVeri?.anahtar !== mahalleAnahtar;

  // Düzenleme modunda formu bir kez mevcut talebin değerleriyle doldur.
  // Effect yerine render sırasında düzeltme kalıbı: hangi ilanın yüklendiği
  // state'te tutulur, id değişince alanlar yeniden kurulur.
  const [yuklenenIlan, setYuklenenIlan] = useState<string | undefined>(
    undefined,
  );
  if (duzenleId && duzenleId !== yuklenenIlan) {
    const t = duzenlenen;
    setYuklenenIlan(duzenleId);
    if (t) {
      setKategori(t.kategori);
      setBaslik(t.baslik);
      setMarka(t.marka);
      setAciklama(t.aciklama);
      setFiyat(String(t.fiyatNum));
      setAcilSecim(!!t.acil);
      setPazarlikSecim(!!t.pazarlik);
      setMuadilSecim(!!t.muadilKabul);
      // `?? false` YAZILIYDI: alanı boş kalmış bir talep düzenlenirken form
      // kullanıcı adına "Hayır, defosuz" seçiyor, zorunluluk kuralı da
      // sessizce atlanıyordu. Boş kayıt boş gelir; düzenleyen yanıtlar.
      setDefo(t.defoKabul ?? null);
      setTur(t.tur ?? "");
      setCesit(t.cesit ?? "");
      setModel(t.model ?? "");
      setYil(t.yil ?? "");
      setRenk(t.renk ?? "");
      setDurumlar(
        (t.durumlar ?? []).filter((d) =>
          (URUN_DURUMLARI as readonly string[]).includes(d),
        ),
      );
      setIl(t.il);
      setIlce(t.ilce);
      setMahalle(t.mahalle ?? "");
      // Kayıtlı adres otomatik uygulanmasın: talebin kendi konumu geçerli.
      // Kayıtlı görseller forma yüklenir; kullanıcı isterse tek tek kaldırır.
      setMevcutGorseller(t.gorseller ?? []);
      setSeciliAdresId("duzenleme");
    }
  }

  // Tür → Marka → Model zincirinin seçenekleri; her biri bir üstündekine bağlı.
  // Yıl ve renk kategoriden bağımsız; sabit listeler.
  // Giyimde bu alan bedeni tutuyor; seçenekler kategoriye göre değişir.
  useEffect(() => {
    let iptal = false;
    fetch("/api/adresler")
      .then((r) => (r.ok ? r.json() : { adresler: [] }))
      .then((v: { adresler?: KayitliAdres[] }) => {
        if (iptal) return;
        const gelen = v.adresler ?? [];
        setAdresler(gelen);
        // Taslaktan gelen konum varsa ona dokunma; yoksa varsayılan adres.
        const varsayilan = gelen.find((a) => a.varsayilan) ?? gelen[0];
        if (!varsayilan) return;
        setSeciliAdresId((mevcut) => {
          if (mevcut) return mevcut;
          setIl(varsayilan.il);
          setIlce(varsayilan.ilce);
          setMahalle(varsayilan.mahalle);
          setCadde(varsayilan.cadde);
          setApartman(varsayilan.apartman ?? "");
          setKat(varsayilan.kat ?? "");
          setDaire(varsayilan.daire ?? "");
          setKonumTarifi((varsayilan.tarif ?? "").slice(0, 60));
          return varsayilan.id;
        });
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
    // Yalnızca ilk açılışta: sonrasında kullanıcının seçimi geçerli.
  }, []);

  /** Açılır kutuda görünen etiket — "Ev · Nilüfer, Bursa". */
  function adresEtiketi(a: KayitliAdres): string {
    const yer = [a.mahalle, a.ilce, a.il].filter(Boolean).join(", ");
    return `${a.ad}${a.varsayilan ? " (varsayılan)" : ""} · ${yer}`;
  }

  /** Kayıtlı adresi forma uygular. */
  function adresiUygula(id: string) {
    setSeciliAdresId(id);
    if (!id) return;
    const a = adresler.find((x) => x.id === id);
    if (!a) return;
    setIl(a.il);
    setIlce(a.ilce);
    setMahalle(a.mahalle);
    setCadde(a.cadde);
    setApartman(a.apartman ?? "");
    setKat(a.kat ?? "");
    setDaire(a.daire ?? "");
    setKonumTarifi((a.tarif ?? "").slice(0, 60));
  }

  const yilSecenekleri = useMemo(() => yilSecenekleriFor(kategori), [kategori]);
  const renkSecenekleri = useMemo(() => [...RENKLER], []);

  const turler = turlerFor(kategori);
  const cesitler = tur ? cesitlerFor(kategori, tur) : [];
  const markalar = cesit ? markalarFor(kategori, tur, cesit) : [];
  const modeller = marka ? modellerFor(kategori, tur, cesit, marka) : [];

  const baslikOk = baslik.trim().length >= BASLIK_EN_AZ;
  const aciklamaOk = aciklama.trim().length >= MIN_ACIKLAMA;
  const kategoriOk = kategori !== "";
  const fiyatNum = parseInt(fiyat, 10) || 0;
  const fiyatOk = fiyatNum > 0;
  // Referans olarak fotoğraf da video da yeterli sayılır.
  const fotoOk = fotolar + videolar >= 1;
  /*
   * Defo yanıtı ZORUNLU.
   *
   * Alan isteğe bağlıydı ve boş bırakılabiliyordu; `defoKabul` o zaman
   * `undefined` kalıyor, ekranların çoğu da onu "Defosuz olmalı" diye
   * okuyordu. Yani alıcının hiç vermediği yanıt, satıcıya kesin bir şart
   * gibi gösteriliyordu — sunum ekranında kırmızı uyarıya kadar gidiyordu.
   * Cevabı formda istemek, bu yanılgıyı kaynağında bitiriyor.
   */
  const defoOk = defo !== null;
  const canPublish =
    baslikOk && aciklamaOk && kategoriOk && fiyatOk && fotoOk && defoOk;

  // ── Adım adım form ─────────────────────────────────────────────────
  // Sunum formundaki akışın aynısı: her adımda yalnızca o bölüm görünür,
  // tamamlanınca "Devam" bir sonrakini açar. Sağdaki güvence kutusu ve
  // canlı önizleme adımlardan bağımsız, hep yerinde durur.
  const adimlar = [
    { n: 1, ad: "Ne arıyorsun?" },
    { n: 2, ad: "Ürün & fiyat" },
    { n: 3, ad: "Fotoğraf" },
    { n: 4, ad: "Adres bilgisi" },
    { n: 5, ad: "Şartlar & yayın" },
  ];
  const sonAdim = adimlar.length;
  const [adim, setAdim] = useState(1);

  const adimTamam: Record<number, boolean> = {
    1: kategoriOk && baslikOk && aciklamaOk,
    2: fiyatOk,
    3: fotoOk,
    // Kayıtlı adres seçiliyse alanlar zaten dolu gelir.
    4: il !== "" && ilce !== "" && mahalle.trim() !== "",
    5: canPublish,
  };
  const adimUyarisi: Record<number, string> = {
    1: "Kategori, en az 5 karakterlik başlık ve talep notu gerekli.",
    2: "Talebin için bir fiyat gir.",
    3: "En az bir fotoğraf ya da video ekle.",
    4: "Şehir, ilçe ve mahalle gerekli.",
    5: defoOk
      ? "İlan açmak için tüm alanlar doldurulmalıdır."
      : "Üründe defo kabul edip etmediğini seçmelisin.",
  };

  // Yayın öncesi tam sayfa önizleme: kart tıklanınca talebin alıcı
  // gözüyle nasıl görüneceği gösterilir ("böyle görünecek, yayınlıyor musun?").
  const aktifKullanici = useOturumSahibi();
  const [onizlemeAcik, setOnizlemeAcik] = useState(false);
  // "İlanı Yayınla" önce bu soruyu sorar: önizlemek ister misin?
  const [onaySorusu, setOnaySorusu] = useState(false);

  /** Henüz kaydedilmemiş talebin detay sayfası için geçici kopyası. */
  const onizlemeTalebi: Talep = {
    id: "onizleme",
    baslik: baslik.trim() || "Talep başlığın",
    marka: marka || "",
    aciklama: aciklama.trim(),
    fiyatNum,
    kategori,
    il,
    ilce,
    mahalle: mahalle || undefined,
    sunum: 0,
    gun: sure,
    durum: durum || "Hepsi",
    durumlar,
    eklendi: 0,
    sahibi: aktifKullanici.kullanici,
    acil: acilSecim || undefined,
    pazarlik: pazarlikSecim || undefined,
    tur: tur || undefined,
    cesit: cesit || undefined,
    model: model || undefined,
    yil: yil || undefined,
    renk: renk || undefined,
    defoKabul: defo ?? undefined,
    muadilKabul: muadilSecim ?? undefined,
    // Kayıtlı görseller (düzenleme modunda) + henüz yüklenmemiş yerel
    // dosyaların object URL'leri.
    gorseller: [
      ...mevcutGorseller,
      ...[...fotoDosyalar, ...videoDosyalar].map((y) => y.url),
    ],
  };

  // Modallar body'ye taşınır: sayfa sarmalayıcısındaki giriş animasyonu
  // (animate-page-in) kalıcı bir stacking context yarattığı için, içeride
  // kalan pencere z-index'i ne olursa olsun header'ın altında kalıyordu.
  // İlk boyamada document yok (sunucu); istemcide ilk render sonrası açılır.
  const monte = typeof document !== "undefined";

  // Pencere açıkken arka plandaki sayfa kaymasın.
  useEffect(() => {
    if (!onizlemeAcik && !onaySorusu) return;
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = eski;
    };
  }, [onizlemeAcik, onaySorusu]);

  function ileri() {
    if (!adimTamam[adim]) return;
    setAdim((a) => Math.min(sonAdim, a + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }
  function geri() {
    setAdim((a) => Math.max(1, a - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  /**
   * Yayınlama: önce dosyalar sunucuya yüklenir, dönen yollarla talep
   * kaydedilir. Her iki adım da sunucuda ayrıca doğrulanır — buradaki
   * `canPublish` yalnızca kullanıcıyı erken uyarmak içindir.
   */
  async function yayinla() {
    if (!canPublish || gonderiliyor) return;
    setGonderiliyor(true);
    setGonderimHatasi("");
    try {
      // 1) Dosyaları yükle. Kayıtlı görseller korunur; listeden çıkarılanlar
      //    düşer (depo, düşenleri diskten de siler — bkz. talepGuncelle).
      let gorseller: string[] = [...mevcutGorseller];
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
        gorseller = [...gorseller, ...(yv.yollar ?? [])];
      }

      // 2) Talebi kaydet. Düzenleme modunda yeni kayıt açılmaz; mevcut
      //    talep güncellenir (yeni görsel eklenmediyse eskiler korunur).
      const r = await fetch(
        duzenleModu ? `/api/talepler/${duzenleId}` : "/api/talepler",
        {
          method: duzenleModu ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baslik,
            aciklama,
            kategori,
            fiyatNum,
            tur,
            cesit,
            marka,
            model,
            yil,
            renk,
            il,
            ilce,
            mahalle,
            // Teslimat adresi: ilanda görünmez, anlaşma sonrası satıcıya açılır.
            cadde,
            apartman,
            kat,
            daire,
            konumTarifi,
            durum,
            durumlar,
            acil: acilSecim,
            pazarlik: pazarlikSecim,
            muadilKabul: muadilSecim,
            defoKabul: defo,
            ...(gorseller.length ? { gorseller } : {}),
          }),
        },
      );
      const v = await r.json();
      if (!r.ok) throw new Error(v.hata ?? "Talep kaydedilemedi.");

      setYayinId(v.talep.id as string);
      tumUrlleriBirak();
      setPublished(true);
    } catch (e) {
      setGonderimHatasi(
        e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.",
      );
    } finally {
      setGonderiliyor(false);
    }
  }

  function saveDraft() {
    // Yazma başarısını modül döndürür; "kaydedildi" demeden önce ona bakılır.
    const yazildi = taslakYaz({
      kategori,
      baslik,
      aciklama,
      fiyat,
      acilSecim,
      pazarlikSecim,
      muadilSecim,
      tur,
      cesit,
      marka,
      model,
      yil,
      renk,
      defo,
      durumlar,
      il,
      ilce,
      mahalle,
      cadde,
      apartman,
      kat,
      daire,
      konumTarifi,
    });

    if (yazildi) {
      // Kullanıcı ZATEN formda: "yarım kalmış taslağın var, yükle" çubuğunu
      // kendi az önce kaydettiği şey için göstermek kafa karıştırıcıydı.
      // Çubuk sayfa AÇILIŞINDA anlamlı, kaydetmenin hemen ardından değil.
      setTaslakCubuguKapali(true);
      setTaslakHatasi("");
    } else {
      // BAŞARI BİLDİRİMİ YAZMADAN SONRA. Eskiden yazma hatası sessizce
      // yutuluyor ama toast yine de "Taslağın bu cihaza kaydedildi"
      // diyordu: gizli sekmede ya da depolama kotası dolu bir tarayıcıda
      // kullanıcı kaydettiğini sanıp formu kapatıyor, geri döndüğünde
      // hiçbir şey bulamıyordu.
      setTaslakHatasi(
        "Taslak bu tarayıcıya kaydedilemedi (depolama kapalı olabilir). Formu kapatma.",
      );
      return;
    }
    setToastOn(true);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastOn(false), 3600);
  }

  /**
   * Kayıtlı taslağı forma geri yükler.
   *
   * BU EKSİKTİ: "Taslak Kaydet" düğmesi `localStorage`'a yazıyordu ama
   * kodun hiçbir yeri o anahtarı OKUMUYORDU. Bildirim açıkça "bir dahaki
   * sefere kaldığın yerden devam edebilirsin" diyordu; kullanıcı geri
   * geldiğinde form bomboş açılıyordu.
   */
  function taslagiYukle() {
    const t = taslakOku();
    if (!t) return;
    {
      setKategori(t.kategori ?? "");
      setBaslik(t.baslik ?? "");
      setAciklama(t.aciklama ?? "");
      setFiyat(t.fiyat ?? "");
      setAcilSecim(!!t.acilSecim);
      setPazarlikSecim(!!t.pazarlikSecim);
      setMuadilSecim(!!t.muadilSecim);
      setTur(t.tur ?? "");
      setCesit(t.cesit ?? "");
      setMarka(t.marka ?? "");
      setModel(t.model ?? "");
      setYil(t.yil ?? "");
      setRenk(t.renk ?? "");
      setDefo(t.defo ?? null);
      setDurumlar(
        (t.durumlar ?? []).filter((d) =>
          (URUN_DURUMLARI as readonly string[]).includes(d),
        ),
      );
      setIl(t.il ?? "");
      setIlce(t.ilce ?? "");
      setMahalle(t.mahalle ?? "");
      setCadde(t.cadde ?? "");
      setApartman(t.apartman ?? "");
      setKat(t.kat ?? "");
      setDaire(t.daire ?? "");
      setKonumTarifi(t.konumTarifi ?? "");
      // Taslakta konum varsa kayıtlı adres otomatik uygulanmasın.
      if (t.il) setSeciliAdresId("taslak");
      setTaslakCubuguKapali(true);
    }
  }

  /** Kayıtlı taslağı siler. */
  function taslagiSil() {
    taslakSil();
    setTaslakCubuguKapali(true);
  }

  /** Kart önizlemesindeki kapak — kayıtlı fotoğraf varsa o öncelikli. */
  const kapakGorsel = mevcutFotolar[0] ?? fotoDosyalar[0]?.url;

  const konumText = [mahalle, ilce, il].filter((p) => p.trim()).join(", ");
  const fotoText =
    fotolar > 0
      ? `kapak görseli · ${fotolar}/4${videolar > 0 ? ` · ${videolar} video` : ""}`
      : videolar > 0
        ? `${videolar} video`
        : "referans görsel ekle";

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
            <strong className="text-ink-900">{sure} gün</strong> boyunca
            satıcılara açık. Sunumlar geldikçe bildirim alacaksın; sunumları
            yalnızca sen görebilirsin.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <ButtonLink href={`/ilan/${yayinId}`} variant="primary" size="lg">
              İlanı Gör
            </ButtonLink>
            <ButtonLink href="/kesfet" variant="secondary" size="lg">
              Keşfet&apos;e Dön
            </ButtonLink>
          </div>
          <p className="mt-5 text-[13px] font-medium text-ink-500">
            İlanını{" "}
            {/* Bağlantı YENİ açılan ilanı taşımalı: id'siz hâli her zaman
                kullanıcının başka bir ilanını açıyordu. */}
            <Link
              href={`/ilan-yonetimi?id=${encodeURIComponent(yayinId)}`}
              className="font-semibold"
            >
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

      {/* Üst blok, alttaki içerik gridiyle aynı sütun ölçüsünde: sağdaki
          güvence kutusu ve önizleme başlığı buraya alınınca talep kartı
          soldaki adım kutusuyla tam aynı hizada başlıyor. */}
      <div className="mb-4 mt-2 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* Başlık ve adım çubuğu birlikte, sağdaki güvence kutusuyla
            göz hizasında dursun diye dikeyde ortalanır. */}
        <div className="min-w-0 lg:self-center">
          <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-[-1.2px] text-ink-900">
            {duzenleModu ? "Talebini Düzenle" : "Aradığını İlan Et"}
          </h1>
          <p className="mb-5 mt-3 max-w-[620px] text-[17px] font-medium leading-relaxed text-ink-700">
            {duzenleModu
              ? "Bilgileri güncelle; değişiklikler yayındaki talebine yansır."
              : "Fiyatı sen belirle, satıcılar sunumlarıyla sana gelsin. İlan açmak ücretsizdir."}
          </p>
          {/* Adım çubuğu — tamamlananlara geri dönülebilir. */}
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
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
                    className={`flex items-center gap-2 rounded-full px-3 py-2 text-[13.5px] font-bold transition-colors ${
                      aktif
                        ? "bg-primary text-white"
                        : tamam
                          ? "cursor-pointer bg-primary-soft text-primary-hover hover:brightness-95"
                          : "cursor-not-allowed bg-page text-ink-300"
                    }`}
                  >
                    <span
                      className={`flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full text-[12px] font-extrabold ${
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
          <p className="mt-3 text-[13.5px] font-medium text-ink-500">
            Adım {adim}/{sonAdim} · {adimlar[adim - 1].ad} — her adımı
            tamamladıkça bir sonraki açılır.
          </p>

          {/* Kayıtlı taslak varsa geri yükleme teklifi. Bu çubuk eksikti:
      "Taslak Kaydet" yazıyordu ama hiçbir yer geri okumuyordu. */}
          {taslakVar && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-control border-[1.5px] border-primary bg-primary-soft px-4 py-3">
              <p className="min-w-[220px] flex-1 text-[13.5px] font-semibold leading-snug text-primary-hover">
                Bu cihazda yarım kalmış bir taslağın var. Fotoğraflar taslağa
                kaydedilemez; onları yeniden eklemen gerekir.
              </p>
              <Button size="sm" variant="primary" onClick={taslagiYukle}>
                Taslağı yükle
              </Button>
              <Button size="sm" variant="secondary" onClick={taslagiSil}>
                Sil
              </Button>
            </div>
          )}

          {/* Taslak yazılamadıysa söyle: eskiden hata yutuluyor ve toast yine
      "kaydedildi" diyordu. */}
          {taslakHatasi && (
            <p
              role="alert"
              className="mt-3.5 rounded-control border-[1.5px] border-danger-line bg-danger-soft px-4 py-3 text-[13px] font-bold text-danger"
            >
              {taslakHatasi}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3.5">
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
              iade olarak ulaştıktan sonra ödemenizin tamamı, herhangi bir
              kesinti uygulanmadan tarafınıza iade edilir.
            </p>
          </div>
          <div className="text-[12px] font-bold uppercase tracking-[1.4px] text-ink-500">
            Canlı önizleme — talep kartın
          </div>
        </div>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── FORM ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* 1 · Kategori + başlık + talep notu */}
          <section
            className="rounded-panel border border-border bg-card p-[26px]"
            hidden={adim !== 1}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={stepBadge}>1</span>
              <h2 className="text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
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
                      onClick={() => {
                        setKategori(k.ad);
                        // Zincir yukarıdan aşağı sıfırlanır.
                        setTur("");
                        setCesit("");
                        setMarka("");
                        setModel("");
                      }}
                      className={`flex items-center gap-3 rounded-control border-[1.5px] p-3.5 text-left ${
                        active
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-card hover:border-primary"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[15px] font-extrabold ${
                          active
                            ? "bg-primary text-white"
                            : "bg-primary-soft text-primary-hover"
                        }`}
                      >
                        {Ikon ? <Ikon className="h-[19px] w-[19px]" /> : k.harf}
                      </span>
                      <span
                        className={`text-[15px] font-semibold leading-tight ${
                          active
                            ? "font-bold text-primary-hover"
                            : "text-ink-700"
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
                <label
                  htmlFor="ia-baslik"
                  className="text-[15.5px] font-bold text-ink-900"
                >
                  Talep başlığı <span className="text-danger">*</span>
                </label>
                <span
                  className={`text-[12.5px] font-semibold ${
                    baslikOk ? "text-primary-hover" : "text-danger"
                  }`}
                >
                  {baslik.length}/{BASLIK_SINIR}
                  {baslikOk ? "" : ` · en az ${BASLIK_EN_AZ} karakter`}
                </span>
              </div>
              <input
                id="ia-baslik"
                value={baslik}
                onChange={(e) =>
                  setBaslik(e.target.value.slice(0, BASLIK_SINIR))
                }
                maxLength={BASLIK_SINIR}
                placeholder={'örn. İmzalı "Dawn FM" CD arıyorum'}
                className={inputCls}
              />
            </div>

            <div className="mt-[18px]">
              <div className="mb-2 flex items-baseline justify-between">
                <label
                  htmlFor="ia-not"
                  className="text-[15.5px] font-bold text-ink-900"
                >
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
          <section
            className="rounded-panel border border-border bg-card p-[26px]"
            hidden={adim !== 2}
          >
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>2</span>
              <h2 className="text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
                Ürün bilgisi ve fiyat
              </h2>
            </div>

            {/* Tür / Marka / Model / Yıl / Renk — fiyatın hemen üstünde */}
            <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-[18px] sm:grid-cols-2">
              <div>
                <label htmlFor="ia-tur" className={labelCls}>
                  Tür
                </label>
                <SecimKutusu
                  id="ia-tur"
                  deger={tur}
                  onDegis={(v) => {
                    setTur(v);
                    setCesit("");
                    setMarka("");
                    setModel("");
                  }}
                  secenekler={turler}
                  placeholder="Tür seç"
                  serbestPlaceholder="örn. Plak, Konsol, Kol saati"
                  kapali={!kategori}
                  kapaliMetin="Önce kategori seç"
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ia-cesit" className={labelCls}>
                  Çeşit
                </label>
                <SecimKutusu
                  id="ia-cesit"
                  deger={cesit}
                  onDegis={(v) => {
                    setCesit(v);
                    setMarka("");
                    setModel("");
                  }}
                  secenekler={cesitler}
                  placeholder="Çeşit seç"
                  serbestPlaceholder="örn. Dizüstü, Masaüstü"
                  kapali={!tur}
                  kapaliMetin="Önce tür seç"
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ia-marka" className={labelCls}>
                  Marka
                </label>
                <SecimKutusu
                  id="ia-marka"
                  deger={marka}
                  onDegis={(v) => {
                    setMarka(v);
                    setModel("");
                  }}
                  secenekler={markalar}
                  placeholder="Marka seç"
                  serbestPlaceholder="örn. Apple, Sega, The Weeknd"
                  kapali={!cesit}
                  kapaliMetin="Önce çeşit seç"
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ia-model" className={labelCls}>
                  {modelEtiketi(kategori)}
                </label>
                <SecimKutusu
                  id="ia-model"
                  deger={model}
                  onDegis={setModel}
                  secenekler={modeller}
                  placeholder={
                    modelSlotuCinsiyetMi(kategori)
                      ? "Cinsiyet seç"
                      : "Model seç"
                  }
                  serbestPlaceholder={
                    modelSlotuCinsiyetMi(kategori)
                      ? "örn. Kadın, Unisex"
                      : "örn. MacBook Air, 3310"
                  }
                  kapali={!marka}
                  kapaliMetin="Önce marka seç"
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ia-yil" className={labelCls}>
                  {yilEtiketi(kategori)}
                </label>
                <SecimKutusu
                  id="ia-yil"
                  deger={yil}
                  onDegis={setYil}
                  secenekler={yilSecenekleri}
                  placeholder={
                    yilSlotuBedenMi(kategori) ? "Beden seç" : "Yıl seç"
                  }
                  inputCls={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ia-renk" className={labelCls}>
                  Renk
                </label>
                <SecimKutusu
                  id="ia-renk"
                  deger={renk}
                  onDegis={setRenk}
                  secenekler={renkSecenekleri}
                  placeholder="Renk seç"
                  inputCls={inputCls}
                />
              </div>
            </div>

            <div className="mt-[18px]">
              <label htmlFor="ia-fiyat" className={labelCls}>
                Fiyat <span className="text-danger">*</span>
              </label>
              <div className="flex items-center gap-1.5 rounded-control border-[1.5px] border-border-input bg-card py-[7px] pl-1 pr-3 sm:w-fit">
                <input
                  id="ia-fiyat"
                  inputMode="numeric"
                  value={binlikAyir(fiyat)}
                  onChange={(e) =>
                    setFiyat(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))
                  }
                  placeholder="0"
                  aria-label="Fiyat (TL)"
                  className="w-[150px] border-none bg-transparent px-2.5 py-0.5 text-[26px] font-extrabold leading-none tracking-[-0.5px] text-ink-900 outline-none"
                />
                <span className="text-[19px] font-extrabold leading-none text-ink-400">
                  TL
                </span>
              </div>
            </div>
          </section>

          {/* 3 · Fotoğraf ve video */}
          <section
            className="rounded-panel border border-border bg-card p-[26px]"
            hidden={adim !== 3}
          >
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>3</span>
              <h2 className="text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
                Fotoğraf ve video
              </h2>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-[15.5px] font-bold text-ink-900">
                  Fotoğraf / Video ekle <span className="text-danger">*</span>
                </label>
                <span
                  className={`text-[14px] font-bold ${fotoOk ? "text-primary-hover" : "text-danger"}`}
                >
                  {fotolar}/4 fotoğraf · {videolar}/2 video
                  {fotoOk ? "" : " · en az 1 gerekli"}
                </span>
              </div>
              {/* Gerçek dosya seçiciler — kutular bunları tetikler */}
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  dosyaEkle("foto", e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  dosyaEkle("video", e.target.files);
                  e.target.value = "";
                }}
              />

              {/* Kutular kare, fotoğraflar değil. Önizlemeler `object-cover`
                  ile doldurulduğunda yatay bir fotoğrafın sağı solu
                  kırpılıyordu: kullanıcı yüklediği kareyi olduğu gibi
                  göremiyor, kapağın ne görüneceğini kestiremiyordu.
                  `object-contain` ile fotoğraf kutuya SIĞAR; artan yer
                  `bg-subtle` ile dolar. Aynı kural canlı önizlemede, sunum
                  formunda ve ilan kartlarında da geçerli. */}
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                {/* 4 fotoğraf kutusu */}
                {Array.from({ length: MAX_FOTO }, (_, i) => {
                  // Kayıtlı görseller önce gelir, yeni seçilenler onları
                  // izler; ikisi de aynı ızgarada ve ikisi de kaldırılabilir.
                  const kayitli = mevcutFotolar[i];
                  if (kayitli) {
                    return (
                      <div
                        key={kayitli}
                        className="group relative aspect-square overflow-hidden rounded-control border-[1.5px] border-primary bg-subtle"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={kayitli}
                          alt={`Kayıtlı fotoğraf ${i + 1}`}
                          className="h-full w-full object-contain"
                        />
                        {i === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.5px] text-white">
                            Kapak
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => kayitliGorseliKaldir(kayitli)}
                          aria-label="Kayıtlı fotoğrafı kaldır"
                          title="Kaldır"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/75 text-[13px] font-bold leading-none text-white backdrop-blur transition-colors hover:bg-acil"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                  const y = fotoDosyalar[i - mevcutFotolar.length];
                  if (y) {
                    return (
                      <div
                        key={y.id}
                        className="group relative aspect-square overflow-hidden rounded-control border-[1.5px] border-primary bg-subtle"
                      >
                        {/* next/image object URL'i optimize edemez; ham img doğru seçim. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={y.url}
                          alt={`Fotoğraf ${i + 1}: ${y.dosya.name}`}
                          className="h-full w-full object-contain"
                        />
                        {i === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.5px] text-white">
                            Kapak
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => dosyaKaldir("foto", y.id)}
                          aria-label={`${y.dosya.name} — kaldır`}
                          title="Kaldır"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/75 text-[13px] font-bold leading-none text-white backdrop-blur transition-colors hover:bg-acil"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={`foto-bos-${i}`}
                      type="button"
                      onClick={() => fotoInputRef.current?.click()}
                      aria-label="Fotoğraf ekle"
                      className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-control border-[1.5px] border-dashed border-border-input bg-subtle text-[14px] font-bold text-ink-400 transition-colors hover:border-primary hover:text-primary"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[22px] w-[22px]"
                        aria-hidden
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2.5" />
                        <circle cx="8.5" cy="10" r="1.6" />
                        <path d="M21 16l-5-5-6.5 8" />
                      </svg>
                      <span className="text-[12px] font-semibold">
                        Fotoğraf
                      </span>
                    </button>
                  );
                })}

                {/* 2 video kutusu */}
                {Array.from({ length: MAX_VIDEO }, (_, i) => {
                  const kayitli = mevcutVideolar[i];
                  if (kayitli) {
                    return (
                      <div
                        key={kayitli}
                        className="relative aspect-square overflow-hidden rounded-control border-[1.5px] border-accent-ink bg-ink-900"
                      >
                        <video
                          src={kayitli}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[22px] text-white/90"
                        >
                          ▶
                        </span>
                        <button
                          type="button"
                          onClick={() => kayitliGorseliKaldir(kayitli)}
                          aria-label="Kayıtlı videoyu kaldır"
                          title="Kaldır"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/75 text-[13px] font-bold leading-none text-white backdrop-blur transition-colors hover:bg-acil"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                  const y = videoDosyalar[i - mevcutVideolar.length];
                  if (y) {
                    return (
                      <div
                        key={y.id}
                        className="relative aspect-square overflow-hidden rounded-control border-[1.5px] border-accent-ink bg-ink-900"
                      >
                        <video
                          src={y.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[22px] text-white/90"
                        >
                          ▶
                        </span>
                        <button
                          type="button"
                          onClick={() => dosyaKaldir("video", y.id)}
                          aria-label={`${y.dosya.name} — kaldır`}
                          title="Kaldır"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/75 text-[13px] font-bold leading-none text-white backdrop-blur transition-colors hover:bg-acil"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={`video-bos-${i}`}
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      aria-label="Video ekle"
                      className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-control border-[1.5px] border-dashed border-border-input bg-subtle text-[14px] font-bold text-ink-400 transition-colors hover:border-accent-ink hover:text-accent-ink"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[22px] w-[22px]"
                        aria-hidden
                      >
                        <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
                        <path d="M15.5 10.5l6-3.5v10l-6-3.5z" />
                      </svg>
                      <span className="text-[12px] font-semibold">Video</span>
                    </button>
                  );
                })}
              </div>

              {dosyaHatasi && (
                <p
                  role="alert"
                  className="mt-2.5 rounded-control border border-acil-line bg-acil-soft px-3.5 py-2.5 text-[13.5px] font-semibold text-acil"
                >
                  {dosyaHatasi}
                </p>
              )}

              <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-ink-500">
                En fazla <b>4 fotoğraf</b> ve <b>2 video</b> ekleyebilirsin; en
                az biri zorunludur. Aradığın ürünün fiziksel bir örneği elinde
                yoksa, ürünü tanımlayan bir referans görsel veya video
                yeterlidir. Eklediğin ilk fotoğraf kapak görseli olarak
                kullanılır. Fotoğraflar yüklenirken 3:4 dikey ölçüye (1200×1600)
                otomatik uyarlanır — kırpma yapılmaz. Kutulara tıklayarak
                ekleyebilir veya kaldırabilirsin.
              </p>
            </div>
          </section>

          {/* 4 · Adres bilgisi */}
          <section
            className="rounded-panel border border-border bg-card p-[26px]"
            hidden={adim !== 4}
          >
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>4</span>
              <h2 className="text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
                Adres bilgisi
              </h2>
            </div>

            {adresler.length > 0 && (
              <div className="mt-4">
                <label htmlFor="ia-adres" className={labelCls}>
                  {/* Elle girişe geçilince başlık da onu anlatsın. */}
                  {seciliAdresId ? "Kayıtlı adreslerin" : "Adres giriniz"}
                </label>
                {/* Adresler kart yerine açılır kutuda: beş adres yan yana
                    dizilince konum bölümü kalabalıklaşıyordu. */}
                <SecimKutusu
                  id="ia-adres"
                  deger={
                    seciliAdresId
                      ? adresler.find((a) => a.id === seciliAdresId)
                        ? adresEtiketi(
                            adresler.find((a) => a.id === seciliAdresId)!,
                          )
                        : ""
                      : BASKA_KONUM
                  }
                  onDegis={(etiket) => {
                    if (etiket === BASKA_KONUM) {
                      setSeciliAdresId("");
                      setIl("");
                      setIlce("");
                      setMahalle("");
                      setCadde("");
                      setApartman("");
                      setKat("");
                      setDaire("");
                      setKonumTarifi("");
                      return;
                    }
                    const bulunan = adresler.find(
                      (a) => adresEtiketi(a) === etiket,
                    );
                    if (bulunan) adresiUygula(bulunan.id);
                  }}
                  secenekler={[...adresler.map(adresEtiketi), BASKA_KONUM]}
                  placeholder="Adres seç"
                  inputCls={inputCls}
                />
                <p className="mt-2 text-[12px] font-medium text-ink-400">
                  Adreslerini{" "}
                  <Link
                    href="/ayarlar"
                    className="font-bold text-primary hover:text-primary-hover"
                  >
                    Ayarlar › Adresler
                  </Link>{" "}
                  bölümünden yönetebilirsin. İlanda yalnızca il, ilçe ve mahalle
                  görünür.
                </p>
              </div>
            )}

            {/* Kayıtlı adres seçiliyse alanları tekrar doldurtmuyoruz:
                adresin özeti gösterilir, düzenlemek isteyen "Başka adres"e
                geçer ve kutucuklar geri gelir. */}
            {seciliAdresId ? (
              <div className="mt-4 rounded-[14px] border border-border bg-subtle p-4">
                <div className="text-[12.5px] font-bold text-ink-900">
                  Seçili adres
                </div>
                <p className="mt-1.5 text-[12.5px] font-medium leading-[1.55] text-ink-500">
                  {[
                    mahalle,
                    cadde,
                    [apartman, kat && `Kat ${kat}`, daire && `Daire ${daire}`]
                      .filter(Boolean)
                      .join(" "),
                    konumTarifi,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  <br />
                  {[ilce, il].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-[12px] font-medium text-ink-400">
                  Bu talep için farklı bir konum girmek istersen yukarıdan “
                  {BASKA_KONUM}” seç.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ia-il" className={labelCls}>
                    Şehir
                  </label>
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
                  <label htmlFor="ia-ilce" className={labelCls}>
                    İlçe
                  </label>
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
                  <label htmlFor="ia-mahalle" className={labelCls}>
                    Mahalle
                  </label>
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
                  <label htmlFor="ia-cadde" className={labelCls}>
                    Cadde / Sokak
                  </label>
                  <input
                    id="ia-cadde"
                    value={cadde}
                    onChange={(e) => setCadde(e.target.value.slice(0, 80))}
                    maxLength={80}
                    placeholder="Örn. Üniversite Caddesi"
                    className={inputCls}
                  />
                </div>
                {/* Apartman / kat / daire — ayarlardaki adres formuyla aynı
                  sırada ve elle doldurulur. */}
                <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-3">
                  <div>
                    <label htmlFor="ia-apartman" className={labelCls}>
                      Apartman
                    </label>
                    <input
                      id="ia-apartman"
                      value={apartman}
                      onChange={(e) => setApartman(e.target.value.slice(0, 60))}
                      maxLength={60}
                      placeholder="Apartman adı veya numarası"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="ia-kat" className={labelCls}>
                      Kat
                    </label>
                    <input
                      id="ia-kat"
                      inputMode="numeric"
                      value={kat}
                      onChange={(e) => setKat(e.target.value.slice(0, 10))}
                      maxLength={10}
                      placeholder="Örn. 3"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="ia-daire" className={labelCls}>
                      Daire
                    </label>
                    <input
                      id="ia-daire"
                      inputMode="numeric"
                      value={daire}
                      onChange={(e) => setDaire(e.target.value.slice(0, 10))}
                      maxLength={10}
                      placeholder="Örn. 7"
                      className={inputCls}
                    />
                  </div>
                </div>
                {/* Adres tarifi tek satırı hak ediyor: serbest metin ve
                  adres seçim kutusuyla aynı genişlikte duruyor. */}
                <div className="sm:col-span-2">
                  {/* Etiket diğer konum alanlarıyla aynı düzende; sayaç
                    etiketin sağında kalıyor. */}
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="ia-konum-tarifi" className={labelCls}>
                      Adres tarifi
                    </label>
                    <span className="mb-1.5 text-[12.5px] font-semibold text-ink-500">
                      {konumTarifi.length}/60
                    </span>
                  </div>
                  <input
                    id="ia-konum-tarifi"
                    value={konumTarifi}
                    onChange={(e) =>
                      setKonumTarifi(e.target.value.slice(0, 60))
                    }
                    maxLength={60}
                    placeholder="Zil adı, giriş, yol tarifi…"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </section>

          {/* 5 · Görünürlük + kabul şartları */}
          <section
            className="rounded-panel border border-border bg-card p-[26px]"
            hidden={adim !== 5}
          >
            <div className="flex items-center gap-2.5">
              <span className={stepBadge}>5</span>
              <h2 className="text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
                Görünürlük ve kabul şartların
              </h2>
            </div>

            {/* Görünürlük destekleri — her satırda destek ve kendi açıklaması */}
            <div className="mt-4">
              {/* Başlık yerine doğrudan faydayı söyleyen kutu — eski
                  kapanış notuyla aynı görünüm: ampul + oval mor zemin. */}
              <div className="mb-2.5 flex items-center gap-3 rounded-[16px] bg-primary-soft px-4 py-3 text-[14px] font-medium leading-relaxed text-primary-hover">
                <span aria-hidden className="text-[22px] leading-none">
                  💡
                </span>
                <p>
                  Bu iki görünürlük desteğini kullanarak talebinize{" "}
                  <b>2 kata kadar daha hızlı</b> karşılık bulabilirsiniz.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {/* Acil */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAcilSecim((v) => !v)}
                    aria-pressed={acilSecim}
                    className={`flex min-w-[120px] flex-none items-center justify-center gap-1.5 rounded-full border-[1.5px] px-4 py-2.5 text-[14.5px] font-bold transition-colors ${
                      acilSecim
                        ? "border-acil bg-acil text-white"
                        : "border-border-input bg-card text-ink-700 hover:border-acil hover:text-acil"
                    }`}
                  >
                    Acil !
                  </button>
                  <p className="min-w-[240px] flex-1 text-[13.5px] font-medium leading-snug text-primary-hover">
                    <b>Acil</b> etiketi, talebinizi öne çıkararak daha fazla
                    satıcının dikkatini çeker ve daha kısa sürede daha fazla
                    teklif almanıza yardımcı olur.
                  </p>
                </div>

                {/* Üst sıra */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPazarlikSecim((v) => !v)}
                    aria-pressed={pazarlikSecim}
                    className={`flex min-w-[120px] flex-none items-center justify-center gap-1.5 rounded-full border-[1.5px] px-4 py-2.5 text-[14.5px] font-bold transition-colors ${
                      pazarlikSecim
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-border-input bg-card text-ink-500 hover:border-accent hover:text-accent-ink"
                    }`}
                  >
                    Üst sıra
                  </button>
                  <p className="min-w-[240px] flex-1 text-[13.5px] font-medium leading-snug text-primary-hover">
                    <b>Üst Sıra</b> seçeneğiyle ilanınız, ilgili kategorinin üst
                    sıralarında gösterilir. İlan kartınız hafif yeşil bir arka
                    planla vurgulanarak standart ilanlardan kolayca ayrışır.
                  </p>
                </div>
              </div>
            </div>

            {/* Soru ve cevabı yan yana: bölüm boyu kısalıyor, gözün
                soru→şık yolu da kısa kalıyor. */}
            <div className="mt-[18px] flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className={`${labelCls} mb-0 flex-1 min-w-[220px]`}>
                Muadil ürün kabul eder misin?
              </label>
              <div className="flex flex-none gap-2">
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
            </div>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-500">
              “Evet” dersen aradığın ürünün muadili (eşdeğeri) olan sunumları da
              değerlendirdiğini belirtirsin; talebin, filtreden{" "}
              <strong className="text-ink-700">“Muadil kabul”</strong>{" "}
              seçeneğini işaretleyen satıcıların karşısına çıkar.
            </p>

            {/* Zorunlu alan: yanıtlanmadan ilan yayınlanamaz. */}
            <div className="mt-[18px] flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className={`${labelCls} mb-0 flex-1 min-w-[220px]`}>
                Üründe defo kabul eder misin?{" "}
                <span className="text-danger">*</span>
              </label>
              <div className="flex flex-none gap-2">
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
            {!defoOk && (
              <p className="mt-2 text-[13px] font-semibold leading-relaxed text-ink-500">
                Bu soruyu yanıtlamadan ilan yayınlanamaz: satıcı, defolu bir
                ürünü sunup sunamayacağını bilmeli.
              </p>
            )}

            <div className="mt-[18px]">
              <label className={labelCls}>Kabul ettiğin ürün durumu</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={hepsiDurum}
                  onClick={() => setDurumlar([])}
                  className={hepsiDurum ? pillActive : pillPassive}
                >
                  Hepsi
                </button>
                {URUN_DURUMLARI.map((d) => {
                  const aktif = !hepsiDurum && durumlar.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={aktif}
                      onClick={() => durumToggle(d)}
                      className={aktif ? pillActive : pillPassive}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Adım gezinmesi — son adımda yayınlama düğmesi çıkar. */}
          <section className="flex flex-wrap items-center gap-3.5 rounded-panel border border-border bg-card px-[22px] py-[18px]">
            {adim > 1 && (
              <Button variant="secondary" size="lg" onClick={geri}>
                ‹ Geri
              </Button>
            )}
            <Button variant="secondary" size="lg" onClick={saveDraft}>
              Taslak Kaydet
            </Button>
            <div className="min-w-[200px] flex-1">
              {adimTamam[adim] ? (
                <div className="text-[13px] font-medium leading-relaxed text-primary-hover">
                  {adim === sonAdim
                    ? "Her şey tamam — talebin yayına hazır ✓"
                    : "Bu adım tamam — devam edebilirsin ✓"}
                </div>
              ) : (
                <div className="text-[13px] font-medium leading-relaxed text-danger">
                  {adimUyarisi[adim]}
                </div>
              )}
              {gonderimHatasi && (
                <div
                  role="alert"
                  className="mt-1.5 text-[13px] font-bold leading-relaxed text-acil"
                >
                  {gonderimHatasi}
                </div>
              )}
            </div>
            {adim < sonAdim ? (
              <Button
                variant="primary"
                disabled={!adimTamam[adim]}
                onClick={ileri}
                className="px-7 py-[17px] text-[15.5px]"
              >
                Devam ›
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!canPublish || gonderiliyor}
                onClick={() => setOnaySorusu(true)}
                className="px-7 py-[17px] text-[15.5px]"
              >
                {gonderiliyor ? "Yayınlanıyor…" : "İlanı Yayınla"}
              </Button>
            )}
          </section>
        </div>

        {/* ── SAĞ SÜTUN: yalnız kart; üst hizası soldaki adım kutusuyla
              aynı olsun diye güvence kutusu ve başlık üst bloğa alındı ── */}
        <aside className="flex flex-col gap-3.5 lg:self-stretch">
          {/* Önizleme — kaydırmada ekrana kilitlenir */}
          <div className="lg:sticky lg:top-[150px]">
            {/* Kart TIKLANMAZ — yalnızca canlı önizlemedir.
                Karta tıklayınca talep sayfasının tam önizlemesi açılıyordu:
                form doldurulurken, yarım bir talebin "alıcıya böyle
                görünecek" sayfasını açmak akışı bölüyordu. Önizleme artık
                tek bir yerde, son adımda ("İlanı Yayınla" → "Evet, önizle")
                açılır. */}
            <div className="block w-full text-left">
              <div
                className={`mx-auto w-[260px] max-w-full overflow-hidden rounded-card border shadow-[var(--shadow-pop)] transition-colors ${
                  // Üst sıra: etiket yerine hafif yeşil zemin — kartlardaki davranışın aynısı.
                  pazarlikSecim
                    ? "border-accent bg-accent/45"
                    : "border-border bg-card"
                }`}
              >
                {/* Dikey görsel alanı — ölçü kartla AYNI sabitten gelir. */}
                <div
                  className={`relative flex ${KART_GORSEL_ORANI} items-center justify-center overflow-hidden ${
                    kapakGorsel ? "bg-subtle" : "ref-image"
                  }`}
                >
                  {kapakGorsel ? (
                    /* Kapak = kayıtlı ilk fotoğraf, yoksa eklenen ilk fotoğraf. */
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={kapakGorsel}
                      alt="Kapak görseli önizlemesi"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="font-mono text-[11.5px] text-[#7d738f]">
                      {fotoText}
                    </span>
                  )}
                  {/* Sağ üst: yalnızca acil seçiliyse etiket çıkar. */}
                  {acilSecim && (
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-acil px-2 py-[5px] text-[11px] font-extrabold uppercase tracking-[1px] text-white">
                      ! Acil
                    </span>
                  )}
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
                  {/* Üst sıra çip olarak gösterilmez — kart zemini yeşile döner.
                    "Muadil kabul" çipi de KALDIRILDI: gerçek ilan kartında
                    böyle bir etiket yok, önizleme yanıltıyordu. Tercih artık
                    yalnızca Keşfet'teki muadil filtresinde işe yarıyor. */}
                  <div className="mt-2.5 border-t border-hairline pt-2 text-[12.5px] font-medium text-ink-500">
                    {konumText} · 0 sunum
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-center text-[12.5px] font-medium leading-relaxed text-ink-400">
              Talebin Keşfet listesinde böyle görünecek. Tam sayfa önizleme son
              adımda, “İlanı Yayınla” dedikten sonra açılır.
            </p>
          </div>
        </aside>
      </div>

      {/* Yayınla → önce önizleme sorusu */}
      {monte &&
        onaySorusu &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Yayın onayı"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/70 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOnaySorusu(false);
            }}
          >
            <div className="w-full max-w-[420px] rounded-panel bg-card p-6 shadow-pop">
              <div className="text-[19px] font-extrabold text-ink-900">
                İlanı önizlemek ister misin?
              </div>
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-ink-700">
                Talebin, satıcıların göreceği haliyle açılır; kontrol ettikten
                sonra oradan yayınlayabilirsin.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Button
                  variant="primary"
                  onClick={() => {
                    setOnaySorusu(false);
                    setOnizlemeAcik(true);
                  }}
                  className="flex-1"
                >
                  Evet, önizle
                </Button>
                <Button
                  variant="secondary"
                  disabled={gonderiliyor}
                  onClick={() => {
                    setOnaySorusu(false);
                    void yayinla();
                  }}
                  className="flex-1"
                >
                  Hayır, yayınla
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Yayın öncesi tam sayfa önizleme */}
      {monte &&
        onizlemeAcik &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Talep sayfası önizlemesi"
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-hidden bg-ink-900/70 p-3 sm:p-5"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOnizlemeAcik(false);
            }}
          >
            {/* Kaydırma panelin kendi içinde: üstteki ve alttaki eylem
              çubukları böylece her zaman ekranda kalır. */}
            <div className="mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1180px] flex-col overflow-hidden rounded-panel bg-page shadow-pop sm:max-h-[calc(100dvh-2.5rem)]">
              {/* Üst çubuk — panelin sabit başlığı */}
              <div className="flex flex-none flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3.5">
                <div className="min-w-[220px] flex-1">
                  <div className="text-[15px] font-extrabold text-ink-900">
                    Talebin satıcılara böyle görünecek
                  </div>
                  <p className="mt-0.5 text-[13px] font-medium text-ink-500">
                    Bu bir önizlemedir — talep henüz yayınlanmadı, buradaki
                    düğmeler çalışmaz.
                  </p>
                </div>
                {/* Sağ üstte, kaldırılan düğmelerin yerinde: bakış açısını
                  tek bakışta söyleyen lime rozet. */}
                <div className="flex flex-none items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.6px] text-ink-900">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-[17px] w-[17px] flex-none"
                    aria-hidden
                  >
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Satıcılar böyle görecek
                </div>
              </div>

              {/* Gerçek talep sayfası — talebi gören bir satıcının gözünden
                (kendiIlanim=false). Önizlemede etkileşim kapalıdır. */}
              {/* Önizlemede sayfa üstü çubuk yok: sağdaki talep sahibi kartı
                gerçek sayfadaki 150px ofsetle değil, panelin kendi üstüne
                yapışsın ki iki sütun aynı hizada kalsın. */}
              {/* Kayan bölüm: yalnızca talep sayfası kayar, çubuklar sabit. */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [&_aside]:lg:top-4">
                {/* Kaydırma dış kapsayıcıda kalır; tıklama engeli yalnızca
                  içeriğe uygulanır, yoksa fare tekerleği de çalışmıyordu. */}
                <div className="pointer-events-none select-none">
                  <IlanDetay
                    talep={onizlemeTalebi}
                    benzer={[]}
                    kendiIlanim={false}
                  />
                </div>
              </div>

              {/* Alt eylem çubuğu — sayfanın sonuna inen kullanıcı da
                buradan yayınlayabilsin diye ekranda sabit kalır. */}
              <div className="flex flex-none flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-5 py-3.5">
                <span className="mr-auto text-[13px] font-medium text-ink-500">
                  Kontrol ettiysen talebini şimdi yayınlayabilirsin.
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setOnizlemeAcik(false)}
                >
                  Düzenlemeye dön
                </Button>
                <Button
                  variant="primary"
                  disabled={!canPublish || gonderiliyor}
                  onClick={() => {
                    setOnizlemeAcik(false);
                    void yayinla();
                  }}
                >
                  {gonderiliyor ? "Yayınlanıyor…" : "Onayla ve Talebi Yayınla"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

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
            Taslağın bu cihaza kaydedildi — form alanları geri yüklenecek,
            fotoğrafları yeniden eklemen gerekir.
          </div>
        </>
      )}
    </main>
  );
}
