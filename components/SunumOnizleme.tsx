import { ayniMi } from "@/lib/metin";
import type { ReactNode } from "react";
import type { Talep } from "@/lib/data";
import {
  fiyatText,
  URUN_DURUMLARI,
  talepDurumlari,
  talepDurumUyar,
} from "@/lib/data";
import { modelEtiketi, yilEtiketi } from "@/lib/urun-agaci";

/**
 * Satıcının 6 adımda doldurduğu sunum — sunum yap ekranının son adımındaki
 * önizleme ile alıcının gördüğü sunum detayı AYNI veriyi, aynı bileşenlerle
 * gösterir. Alan eklendiğinde tek yer güncellenir.
 */
export type Sunum = {
  baslik: string;
  fiyatNum: number;
  /** "The Weeknd Dawn FM" — muadil sunumda satıcının seçtiği marka/model. */
  urun: string;
  /** Künyede ayrı satır olarak gösterilir; yoksa `urun` bölünerek türetilir. */
  marka?: string;
  model?: string;
  muadil: boolean;
  yil?: string;
  renk?: string;
  durum?: string;
  defoVar?: boolean | null;
  defoNot?: string;
  kutu?: boolean;
  fatura?: boolean;
  aksesuar?: boolean;
  /** "1–2 gün içinde kargoda" */
  teslim?: string;
  /** Ekranda görünen etiket: "Aras Kargo ile gönderilecek". */
  kargo?: string;
  /**
   * Satıcının gönderiyi yapacağı kargo firması — sunumda seçilir ve
   * BAĞLAYICIDIR. `kargoSaat` ile aynı mantık: satıcının kendi vaadi,
   * sipariş açıldıktan sonra değiştirilemez. Sipariş kodunun gönderisi bu
   * firmada oluşturulur (bkz. lib/kargo-gonderi.ts).
   *
   * Yeni sunumlarda ZORUNLU; alan eklenmeden önceki kayıtlarda yok ve
   * orada firma gönderi adımında seçilir.
   */
  kargoFirma?: string;
  il?: string;
  ilce?: string;
  aciklama?: string;
  fotolar: number;
  video?: boolean;
  /** Yüklenen görsellerin yolları — boşsa yer tutucu kutular çizilir. */
  gorseller?: string[];
};

/** Sunum satırının alıcının ilandaki beklentisiyle ilişkisi. */
export type Eslesme = "uyuyor" | "farkli" | "notr";

export type KunyeSatiri = {
  /** Uyuşmazlık notu künyede gösterilmez (başka yerde gösteriliyordur). */
  notGizli?: boolean;
  k: string;
  v: string;
  /** Fiyat satırı — mor ve daha büyük yazılır. */
  mor?: boolean;
  eslesme?: Eslesme;
  /** Rozetin yanındaki açıklama: "Sen 2022 istedin" gibi. */
  beklenti?: string;
  /** Bilgi amaçlı satır — kriter sayımına girmez (ör. konum). */
  sayilmaz?: boolean;
};

/**
 * Karşılaştırmanın sabit kriterleri: yıl, ürün durumu, ürün defosu, model
 * ve renk. Fiyat ve marka künyede gösterilir ama orana katılmaz — fiyat
 * pazarlığa açıktır, marka zaten talebin kimliğidir.
 *
 * PAYDA HER ZAMAN 5'TİR. Önceden yalnızca alıcının doldurduğu alanlar
 * sayılıyordu; bu yüzden iki kriter belirtilmiş bir ilanda "2 kriterden
 * 2'si uyuyor" yazıyor ve oran olduğundan iyi görünüyordu. Doğrusu
 * "5 kriterden 2'si uyuyor".
 */
export const KRITER_TOPLAM = 5;

/**
 * Alıcının kabul ettiği durum bir ALT SINIRDIR: satıcının ürünü en az o
 * kalitede olmalıdır. Sıralama `URUN_DURUMLARI` dizisinden gelir
 * (iyiden kötüye), böylece yeni bir durum eklendiğinde burası kendiliğinden
 * doğru çalışır — elle tutulan bir eşleşme tablosu sessizce eskiyordu.
 */
function durumEslesme(talep: Talep, sunumDurum: string): Eslesme {
  if (!sunumDurum) return "notr";
  // Boş liste = "Hepsi": hiçbir kısıt yok.
  const kabul = talepDurumlari(talep);
  if (kabul.length === 0) return "uyuyor";
  // İşaretlenenlerden biri birebir tutuyorsa uyar.
  if (talepDurumUyar(talep, sunumDurum)) return "uyuyor";

  const sira = URUN_DURUMLARI as readonly string[];
  const sunulan = sira.indexOf(sunumDurum);
  if (sunulan === -1) return "notr";
  // Dizi iyiden kötüye sıralı: kabul edilenlerden herhangi birinden daha
  // iyi bir durum sunulduysa alıcıyı memnun eder.
  const enKotuKabul = Math.max(
    ...kabul.map((d) => sira.indexOf(d)).filter((i) => i !== -1),
    -1,
  );
  if (enKotuKabul === -1) return "notr";
  return sunulan <= enKotuKabul ? "uyuyor" : "farkli";
}

/**
 * Gönderiyi yapacak kargo firmasını yazar.
 *
 * Bu fonksiyon bir dönem `kargoKimden` idi ve "Satıcıdan" / "Alıcıdan"
 * döndürüyordu: sunumda sorulan şey kargo ÜCRETİNİN kimde olduğuydu. O
 * soru kalktı — gönderiyi satıcı yapıyor, dolayısıyla alıcının kargo
 * üzerinde bir seçimi yok. Sunumda sorulan tek şey artık firma.
 *
 * Firma bilinmiyorsa (alan eklenmeden önceki kayıtlar) boş döner;
 * uydurma bir firma adı üretilmez.
 */
export function kargoFirmasi(s: Pick<Sunum, "kargoFirma">): string {
  // `kargo` ETİKETİNE DÜŞÜLMEZ. Eski kayıtlarda o alan "Kargo satıcıya
  // ait" gibi bir ÜCRET ifadesi taşıyor; onu "Kargo firması" başlığının
  // altına koymak, firma olmayan bir değeri firma diye göstermek olurdu.
  // Bilinmiyorsa boş döner: künye süzgeci (`Boolean(r.v)`) satırı eler,
  // karşılaştırma tablosu "—" gösterir.
  return s.kargoFirma ?? "";
}

/** Serbest metin karşılaştırması — büyük/küçük harf ve boşluk farkı yutulur. */
function metinEsit(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return (
    // Türkçe yazım farkı künye karşılaştırmasını bozmasın.
    ayniMi(a, b)
  );
}

/**
 * Künye satırlarını üretir. `talep` verilirse her satır alıcının ilandaki
 * beklentisiyle karşılaştırılır (alıcı tarafındaki sunum detayı).
 */
export function kunyeSatirlari(
  s: Sunum,
  talep?: Talep,
  secenek?: {
    karsilastirma?: boolean;
    kendiSunumum?: boolean;
    /**
     * Fiyat satırını künyeden çıkarır. Sunum detayında fiyat sağdaki
     * panelde zaten büyük puntoyla duruyor ("Satıcının fiyatı"); künyede
     * bir kez daha yazmak aynı sayıyı tek ekranda iki kez göstermekti.
     */
    fiyatGizli?: boolean;
  },
): KunyeSatiri[] {
  const defolu = s.defoVar === true;
  // Satıcı kendi sunumuna bakarken beklentiler alıcının ağzından değil,
  // "Alıcı … istedi" diliyle yazılır — kendine sunum yapmıyor.
  const satici = secenek?.kendiSunumum === true;
  const yilSozu =
    (talep?.kategori ?? "") === "Giyim & Aksesuar" ? "beden" : "model";
  // Satıcı kendi önizlemesinde alıcı diliyle yazılmış ("Bütçen…", "Sen …
  // istedin") notları görmemeli; taksonomi satırları yine talepten gelir.
  const kars = secenek?.karsilastirma === false ? undefined : talep;
  const ham: (KunyeSatiri | null)[] = [
    secenek?.fiyatGizli
      ? null
      : {
          // Satıcı kendi sunumuna bakıyorsa "teklifin", alıcı bakıyorsa "teklifi".
          k: secenek?.kendiSunumum ? "Fiyat teklifin" : "Fiyat teklifi",
          v: s.fiyatNum > 0 ? fiyatText(s.fiyatNum) : "",
          mor: true,
          sayilmaz: true,
          // Fiyat farkı uyarısı künyede değil, sohbet butonunun üstünde durur.
          notGizli: true,
          ...(kars
            ? s.fiyatNum === kars.fiyatNum
              ? {
                  eslesme: "uyuyor" as const,
                  beklenti: "Alıcının bütçesiyle aynı.",
                }
              : s.fiyatNum < kars.fiyatNum
                ? {
                    eslesme: "uyuyor" as const,
                    beklenti: `${fiyatText(kars.fiyatNum - s.fiyatNum)} ucuz teklif.`,
                  }
                : {
                    eslesme: "farkli" as const,
                    beklenti: `${fiyatText(s.fiyatNum - kars.fiyatNum)} pahalı teklif.`,
                  }
            : {}),
        },
    // Ürün kimliği: taksonomi talepten, marka/model sunumdan gelir.
    talep?.kategori ? { k: "Kategori", v: talep.kategori } : null,
    {
      k: "Marka",
      v: s.marka ?? s.urun.split(" ")[0] ?? s.urun,
      sayilmaz: true,
      // Marka bir kriter değil, talebin kimliği — onay tiki almaz.
      // Yalnızca alıcının kabul etmediği bir muadil sunuluyorsa uyarı çıkar.
      ...(kars && s.muadil && !kars.muadilKabul
        ? {
            eslesme: "farkli" as const,
            beklenti: `Muadil ürün — alıcı ${kars.marka}${kars.model ? ` ${kars.model}` : ""} istedi.`,
          }
        : {}),
    },
    // Tür ve çeşit markadan sonra, modelden önce gelir.
    talep?.tur ? { k: "Tür", v: talep.tur } : null,
    talep?.cesit ? { k: "Çeşit", v: talep.cesit } : null,
    (() => {
      const model = s.model ?? s.urun.split(" ").slice(1).join(" ");
      if (!model) return null;
      return {
        // Giyimde bu slot cinsiyet tutuyor; başlık da ona göre değişir.
        k: modelEtiketi(talep?.kategori ?? ""),
        v: model,
        ...(kars?.model
          ? metinEsit(kars.model, model)
            ? {
                eslesme: "uyuyor" as const,
                beklenti: satici
                  ? "Alıcının istediği model"
                  : "İstediğin model",
              }
            : {
                eslesme: "farkli" as const,
                beklenti: satici
                  ? `Alıcı ${kars.model} istedi`
                  : `Sen ${kars.model} istedin`,
              }
          : {}),
      };
    })(),
    s.yil
      ? {
          k: yilEtiketi(talep?.kategori ?? ""),
          v: s.yil,
          ...(kars?.yil
            ? metinEsit(kars.yil, s.yil)
              ? {
                  eslesme: "uyuyor" as const,
                  beklenti: satici
                    ? `Alıcının istediği ${yilSozu}`
                    : "İstediğin yıl",
                }
              : {
                  eslesme: "farkli" as const,
                  beklenti: satici
                    ? `Alıcı ${kars.yil} ${yilSozu} istedi`
                    : `Sen ${kars.yil} istedin`,
                }
            : {}),
        }
      : null,
    s.renk
      ? {
          k: "Renk",
          v: s.renk,
          ...(kars?.renk
            ? metinEsit(kars.renk, s.renk)
              ? {
                  eslesme: "uyuyor" as const,
                  beklenti: satici
                    ? "Alıcının istediği renk"
                    : "İstediğin renk",
                }
              : {
                  eslesme: "farkli" as const,
                  beklenti: satici
                    ? `Alıcı ${kars.renk} istedi`
                    : `Sen ${kars.renk} istedin`,
                }
            : {}),
        }
      : null,
    s.durum
      ? {
          k: "Ürün durumu",
          v: s.durum,
          ...(talep
            ? (() => {
                const e = durumEslesme(talep, s.durum!);
                if (e === "notr") return {};
                return e === "uyuyor"
                  ? {
                      eslesme: e,
                      beklenti: satici
                        ? "Alıcının kabul ettiği durumda"
                        : "Kabul ettiğin durumda",
                    }
                  : {
                      eslesme: e,
                      beklenti: satici
                        ? `Alıcı "${talepDurumlari(talep).join(" / ")}" istedi`
                        : `Sen "${talepDurumlari(talep).join(" / ")}" istedin`,
                    };
              })()
            : {}),
        }
      : null,
    s.defoVar === null || s.defoVar === undefined
      ? null
      : {
          k: "Ürün defosu",
          v: defolu ? `Defolu${s.defoNot ? ` — ${s.defoNot}` : ""}` : "Defosuz",
          ...(talep && talep.defoKabul !== undefined
            ? talep.defoKabul === false && defolu
              ? {
                  eslesme: "farkli" as const,
                  beklenti: satici
                    ? "Alıcı defosuz istedi"
                    : "Sen defosuz istedin",
                }
              : {
                  eslesme: "uyuyor" as const,
                  beklenti: satici
                    ? "Alıcının defo beklentisine uygun"
                    : "Defo beklentine uygun",
                }
            : {}),
        },
    {
      k: "Beraberinde",
      v: [
        s.kutu ? "Kutusu" : null,
        s.fatura ? "Faturası" : null,
        s.aksesuar ? "Aksesuarları" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    { k: "Kargoya verme", v: s.teslim ?? "" },
    /*
     * KONUM = ürünün NEREDEN gönderileceği. Satıcı bunu sunumda seçiyordu
     * ama künyede hiç yazmıyordu; alıcı yalnızca satıcı kartındaki konumu
     * görüyordu. Gönderi yeri kargo süresini doğrudan etkilediği için
     * süre sözünün hemen altında durur.
     *
     * Kriter sayımına girmez (`sayilmaz`): alıcı ilanında satıcının
     * konumu diye bir beklenti belirtmiyor.
     */
    {
      k: "Konum",
      v: [s.ilce, s.il].filter(Boolean).join(", "),
      sayilmaz: true,
    },
    /*
     * KARGO FİRMASI KÜNYEDE.
     *
     * Bir dönem yalnızca sunum detayındaki satıcı panelinde duruyordu;
     * yani alıcı, gelen sunumlar listesinde ve satıcı da kendi canlı
     * önizlemesinde göremiyordu. Firma artık sunumda seçiliyor,
     * bağlayıcı ve gönderi orada oluşturuluyor (bkz.
     * lib/kargo-gonderi.ts) — yani satıcının verdiği sözlerden biri ve
     * yeri, süre sözünün ("Kargoya verme") hemen yanı.
     *
     * Kriter sayımına girmez (`sayilmaz`): alıcı ilanında kargo firması
     * diye bir beklenti belirtmiyor, dolayısıyla "uyuyor/uymuyor" diye
     * tartılacak bir şey yok. Sayıma katmak paydayı bozar ve her sunumu
     * haksız yere eksik gösterirdi.
     */
    { k: "Kargo firması", v: kargoFirmasi(s), sayilmaz: true },
  ];

  return ham.filter((r): r is KunyeSatiri => Boolean(r && r.v));
}

/**
 * Kaç kriterin uyduğu — alıcı listesinde, detayda ve karşılaştırmada rozet.
 * Payda talebin kriter sayısıdır: sunum bir alanı boş bıraktıysa o kriter
 * "uymamış" sayılır, böylece bütün sunumlar aynı paydayla karşılaştırılır.
 */
/**
 * "5 kriterden 4'ü uyuyor" — Türkçe iyelik eki son rakama göre değişir.
 * Sıfır özel durum: "hiçbiri uymuyor" daha doğal okunur.
 */
export function kriterCumlesi(uyan: number, toplam: number): string {
  // Alıcı hiç somut kriter belirtmemişse çelişecek bir şey de yoktur.
  if (toplam === 0) return "Kriterlerin hepsi uyumlu";
  if (uyan === 0) return `${toplam} kriterden hiçbiri uymuyor`;
  const ekler: Record<string, string> = {
    "0": "ı",
    "1": "i",
    "2": "si",
    "3": "ü",
    "4": "ü",
    "5": "i",
    "6": "sı",
    "7": "si",
    "8": "i",
    "9": "u",
  };
  const ek = ekler[String(uyan).slice(-1)] ?? "i";
  return `${toplam} kriterden ${uyan}'${ek} uyuyor`;
}

export function eslesmeOzeti(satirlar: KunyeSatiri[], talep?: Talep) {
  const sayilan = satirlar.filter((r) => !r.sayilmaz);
  const uyan = sayilan.filter((r) => r.eslesme === "uyuyor").length;
  const farkli = sayilan.filter((r) => r.eslesme === "farkli");
  // Payda sabittir; talep yoksa karşılaştırılacak bir şey de yok.
  const toplam = talep ? KRITER_TOPLAM : 0;
  return { uyan, toplam, farkli };
}

/**
 * Yalnızca UYUŞMAYAN kriterler için uyarı satırı. Uyanlar artık değerin
 * yanındaki lime onay rozetiyle gösteriliyor; ikisini birden yazmak
 * künyeyi gereksiz uzatıyordu.
 */
/**
 * Uyuşmayan kriterin simgesi: kan kırmızısı üçgen içinde beyaz ünlem.
 *
 * Onay rozetinin (✓) tam karşılığı — aynı hizada, aynı ölçüde. Metin
 * yerine simge kullanılmasının sebebi ızgara: gerekçe cümlesi değerin
 * altına yazıldığında hücreler farklı yükseklikte kalıyor ve künye
 * kayıyordu.
 *
 * Renk tek başına anlam taşımaz (renk körlüğü): şekil de farklı — onay
 * yuvarlak köşeli dolu bir kutu, uyuşmazlık üçgen. Gerekçe ayrıca
 * `title`/`aria-label` ile okunur.
 */
/**
 * İki rozetin ORTAK KUTUSU — aynı ölçü, aynı köşe, aynı hiza.
 *
 * Onay dolu bir çipken uyuşmazlık çıplak bir üçgendi: aynı sütunda yan
 * yana gelen iki değerin rozetleri farklı yükseklikte ve farklı görsel
 * ağırlıkta duruyor, künye asimetrik görünüyordu. Artık ikisi de aynı
 * çip; şekil farkı çipin İÇİNDE sürüyor (onay ✓, uyuşmazlık üçgen), yani
 * renk körlüğü gerekçesi korunuyor — renk tek başına anlam taşımıyor.
 *
 * `mt-[2px]`: kutu 18px, değerin satır kutusu ~21px (15.5px × leading-snug).
 * Aradaki farkın yarısı kadar indirilince rozet, değerin İLK satırının tam
 * ortasına oturur — değer sarıp iki satıra taşsa bile.
 */
const ROZET_KUTU =
  "mt-[2px] flex h-[18px] w-[21px] flex-none items-center justify-center rounded-md leading-none";

function UyusmuyorSimgesi() {
  return (
    <svg
      viewBox="0 0 20 18"
      className="h-[13px] w-[14px] flex-none"
      role="img"
      aria-hidden
    >
      <path
        d="M10 1.6 18.6 16.4H1.4L10 1.6Z"
        fill="#c0201f"
        stroke="#c0201f"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 6.4v4.6"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="10" cy="13.5" r="1.05" fill="#fff" />
    </svg>
  );
}

/**
 * Sunum görselleri — büyük kapak solda küçük kareler, 3/4 oranında.
 *
 * İlan kartı artık 4/5 (bkz. lib/data.ts → KART_GORSEL_ORANI): kart bir
 * ızgarada yan yana duruyor ve orada yükseklik pahalı, detay galerisinde
 * ise fotoğrafı incelemek için yer değerli. İki kutunun işi farklı,
 * ölçüleri de artık ayrı.
 */
export function SunumGaleri({
  fotolar,
  video,
  gorseller = [],
  className = "",
}: {
  fotolar: number;
  video?: boolean;
  /** Gerçekten yüklenmiş görseller; yoksa yer tutucu kutular çizilir. */
  gorseller?: string[];
  className?: string;
}) {
  const adet = Math.max(fotolar, gorseller.length);
  // Düzen talep detay sayfasındaki galerinin aynısı: solda 56 px'lik dikey
  // ray, sağda 3/4 oranında ana görsel. Görsel `object-contain` ile tam
  // sığar — `cover` ile kırpıldığında ürün fotoğrafı garip görünüyordu.
  return (
    <div className={`flex w-full items-start gap-3 ${className}`}>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: Math.max(0, adet - 1) }).map((_, i) => {
          const src = gorseller[i + 1];
          return (
            <div
              key={src ?? i}
              className={`relative h-14 w-14 flex-none overflow-hidden rounded-lg border-2 border-border ${
                src ? "bg-subtle" : "ref-image"
              }`}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={`Fotoğraf ${i + 2}`}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          );
        })}
        {video && (
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-accent text-[11px] font-extrabold text-ink-900">
            ▸
          </div>
        )}
      </div>

      <div
        className={`relative aspect-[3/4] w-full max-w-[290px] flex-1 overflow-hidden rounded-2xl border border-border ${
          gorseller[0]
            ? "bg-subtle"
            : "ref-image flex items-center justify-center"
        }`}
      >
        {gorseller[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gorseller[0]}
            alt="Kapak fotoğrafı"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="font-mono text-[11px] text-ink-400">foto 1</span>
        )}
      </div>
    </div>
  );
}

/** İki sütunlu künye tablosu — satıcı önizlemesi ve alıcı detayı ortak. */
export function SunumKunye({ satirlar }: { satirlar: KunyeSatiri[] }) {
  /*
   * İKİ SÜTUN, KESİLMEYEN DEĞERLER.
   *
   * Künye bir dönem üç sütunluydu ve her değer `truncate` ile tek satıra
   * sıkıştırılıyordu; tamamı yalnızca baloncukta görünüyordu. Sonuç, dar
   * hücrelerde "MacBook …", "Faturası · Aks…", "Bugün Kargod…" gibi yarım
   * okunan satırlardı — künyenin işi tam da bu bilgileri okutmak.
   *
   * Sütun sayısı ikiye indi, hücre genişledi ve değerler artık SARIYOR.
   * Sarma ızgarayı bozmuyor: CSS ızgarasında aynı satırdaki hücreler
   * varsayılan olarak birbirine göre gerilir (`align-items: stretch`),
   * yani alt çizgiler yine aynı hizada kalır. Üç sütunda kesmenin
   * gerekçesi hücrelerin farklı yükseklikte kalmasıydı; iki sütunda o
   * sorun yok.
   */
  // Son satırın alt çizgisi kaldırılır. Mobilde ızgara tek sütun olduğu
  // için orada yalnızca EN SON hücrenin çizgisi kalkar; `sm:` üstünde
  // son satırın tamamı.
  const sonSatirBasi = Math.floor((satirlar.length - 1) / 2) * 2;
  return (
    <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
      {satirlar.map((r, i) => (
        <div
          key={r.k}
          className={`min-w-0 py-3 ${
            i === satirlar.length - 1
              ? ""
              : `border-b border-hairline${
                  i >= sonSatirBasi ? " sm:border-b-0" : ""
                }`
          }`}
        >
          <dt
            className={`text-[11.5px] font-bold uppercase tracking-[0.05em] ${
              r.mor ? "text-ink-900" : "text-ink-400"
            }`}
          >
            {r.k}
          </dt>
          <dd className="mt-1.5 flex items-start gap-1.5">
            <span
              className={`min-w-0 break-words text-[15.5px] font-bold leading-snug text-ink-900 ${
                r.mor ? "text-[17px] font-extrabold" : ""
              }`}
            >
              {r.v}
            </span>
            {/* İKİ ROZET AYNI YERDE, AYNI ÖLÇÜDE.
                Uyuşmayan kriterin gerekçesi eskiden değerin ALTINA cümle
                olarak yazılıyordu ("⚠ Sen 2026 istedin"); satır yüksekliği
                hücreden hücreye değişince künye ızgarası kayıyordu. Artık
                uyuşan da uyuşmayan da değerin sağında tek bir rozet:
                yeşil onay ya da kırmızı ünlem. Gerekçe metni rozetin
                `title`/`aria-label`'ında durur, yani ne bilgi kaybolur ne
                de ekran okuyucudan gizlenir. */}
            {r.eslesme === "uyuyor" && (
              <span
                title={r.beklenti}
                aria-label={r.beklenti ?? "Beklentiye uygun"}
                className={`${ROZET_KUTU} bg-accent text-[12px] font-extrabold text-accent-ink`}
              >
                ✓
              </span>
            )}
            {r.eslesme === "farkli" && !r.notGizli && (
              <span
                title={r.beklenti}
                aria-label={r.beklenti ?? "Beklentiyle uyuşmuyor"}
                className={`${ROZET_KUTU} bg-danger-soft`}
              >
                <UyusmuyorSimgesi />
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Satıcının alıcıya yazdığı not; sağındaki boşluğa aksiyon konulabilir. */
export function SunumNotu({
  metin,
  baslik = "Alıcıya notun",
  yan,
}: {
  metin: string;
  baslik?: string;
  yan?: ReactNode;
}) {
  if (!metin.trim() && !yan) return null;
  return (
    <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start">
      {metin.trim() && (
        <div className="min-w-0 flex-1 rounded-card border border-hairline bg-subtle p-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-ink-400">
            {baslik}
          </div>
          <p className="mt-2 whitespace-pre-line break-words text-[16px] font-medium leading-[1.65] text-ink-900">
            {metin.trim()}
          </p>
        </div>
      )}
      {yan && (
        <div className="lg:w-[240px] lg:flex-none lg:self-center">{yan}</div>
      )}
    </div>
  );
}
