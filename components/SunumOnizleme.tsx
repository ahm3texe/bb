import type { ReactNode } from "react";
import type { Talep } from "@/lib/data";
import { fiyatText } from "@/lib/data";

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
  /** "Kargo satıcıya ait" */
  kargo?: string;
  il?: string;
  ilce?: string;
  aciklama?: string;
  fotolar: number;
  video?: boolean;
};

/** Sunum satırının alıcının ilandaki beklentisiyle ilişkisi. */
export type Eslesme = "uyuyor" | "farkli" | "notr";

export type KunyeSatiri = {
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
 * Alıcının ilanında belirttiği, ölçülebilir kriter sayısı. Payda her sunumda
 * aynı olsun diye sunumdan değil TALEPTEN türetilir.
 */
export function kriterSayisi(talep?: Talep): number {
  if (!talep) return 0;
  let n = 2; // fiyat + aranan ürün
  if (talep.durum) n += 1;
  if (talep.defoKabul !== undefined) n += 1;
  if (talep.yil) n += 1;
  if (talep.renk) n += 1;
  return n;
}

/** Alıcının kabul ettiği durum → satıcının seçebileceği durumlar. */
const DURUM_KABUL: Record<string, string[]> = {
  "Yeni / az kullanılmış": [
    "Kutusu açılmamış",
    "Yenilenmiş",
    "Az kullanılmış",
  ],
  "Yeni / etiketli": ["Kutusu açılmamış", "Yenilenmiş"],
  "Az kullanılmış": ["Kutusu açılmamış", "Yenilenmiş", "Az kullanılmış"],
  "İyi durumda": [
    "Kutusu açılmamış",
    "Yenilenmiş",
    "Az kullanılmış",
    "Kullanılmış",
  ],
  "Çalışır durumda": [
    "Kutusu açılmamış",
    "Yenilenmiş",
    "Az kullanılmış",
    "Kullanılmış",
  ],
};

function durumEslesme(talepDurum: string, sunumDurum: string): Eslesme {
  if (!talepDurum || !sunumDurum) return "notr";
  if (talepDurum === "Fark etmez") return "uyuyor";
  const kabul = DURUM_KABUL[talepDurum];
  if (!kabul) return "notr";
  return kabul.includes(sunumDurum) ? "uyuyor" : "farkli";
}

/**
 * Künye satırlarını üretir. `talep` verilirse her satır alıcının ilandaki
 * beklentisiyle karşılaştırılır (alıcı tarafındaki sunum detayı).
 */
export function kunyeSatirlari(s: Sunum, talep?: Talep): KunyeSatiri[] {
  const defolu = s.defoVar === true;
  const ham: (KunyeSatiri | null)[] = [
    {
      k: "Fiyat teklifi",
      v: s.fiyatNum > 0 ? fiyatText(s.fiyatNum) : "",
      mor: true,
      ...(talep
        ? s.fiyatNum <= talep.fiyatNum
          ? {
              eslesme: "uyuyor" as const,
              beklenti: `Bütçen ${fiyatText(talep.fiyatNum)}`,
            }
          : {
              eslesme: "farkli" as const,
              beklenti: `Bütçenin ${fiyatText(s.fiyatNum - talep.fiyatNum)} üstünde`,
            }
        : {}),
    },
    {
      k: "Ürün",
      v: s.urun,
      ...(talep
        ? !s.muadil
          ? { eslesme: "uyuyor" as const, beklenti: "Birebir aradığın ürün" }
          : talep.muadilKabul
            ? { eslesme: "uyuyor" as const, beklenti: "Muadil kabul ediyorsun" }
            : {
                eslesme: "farkli" as const,
                beklenti: `Muadil ürün — sen ${talep.marka}${talep.model ? ` ${talep.model}` : ""} istedin`,
              }
        : {}),
    },
    s.yil
      ? {
          k: "Yıl",
          v: s.yil,
          ...(talep?.yil
            ? talep.yil === s.yil
              ? { eslesme: "uyuyor" as const, beklenti: "İstediğin yıl" }
              : { eslesme: "farkli" as const, beklenti: `Sen ${talep.yil} istedin` }
            : {}),
        }
      : null,
    s.renk
      ? {
          k: "Renk",
          v: s.renk,
          ...(talep?.renk
            ? talep.renk === s.renk
              ? { eslesme: "uyuyor" as const, beklenti: "İstediğin renk" }
              : {
                  eslesme: "farkli" as const,
                  beklenti: `Sen ${talep.renk} istedin`,
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
                const e = durumEslesme(talep.durum, s.durum!);
                if (e === "notr") return {};
                return e === "uyuyor"
                  ? { eslesme: e, beklenti: "Kabul ettiğin durumda" }
                  : { eslesme: e, beklenti: `Sen "${talep.durum}" istedin` };
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
              ? { eslesme: "farkli" as const, beklenti: "Sen defosuz istedin" }
              : { eslesme: "uyuyor" as const, beklenti: "Defo beklentine uygun" }
            : {}),
        },
    {
      k: "Birlikte gelenler",
      v: [
        s.kutu ? "Kutusu" : null,
        s.fatura ? "Faturası" : null,
        s.aksesuar ? "Aksesuarları" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    { k: "Kargoya verme", v: s.teslim ?? "" },
    { k: "Kargo ücreti", v: s.kargo ?? "" },
    // Konum bilgi amaçlıdır: kriter sayımına girmez, eşleşme notu da almaz.
    {
      k: "Konum",
      v: [s.ilce, s.il].filter(Boolean).join(", "),
      sayilmaz: true,
    },
  ];

  return ham.filter((r): r is KunyeSatiri => Boolean(r && r.v));
}

/**
 * Kaç kriterin uyduğu — alıcı listesinde, detayda ve karşılaştırmada rozet.
 * Payda talebin kriter sayısıdır: sunum bir alanı boş bıraktıysa o kriter
 * "uymamış" sayılır, böylece bütün sunumlar aynı paydayla karşılaştırılır.
 */
export function eslesmeOzeti(satirlar: KunyeSatiri[], talep?: Talep) {
  const sayilan = satirlar.filter((r) => !r.sayilmaz);
  const uyan = sayilan.filter((r) => r.eslesme === "uyuyor").length;
  const farkli = sayilan.filter((r) => r.eslesme === "farkli");
  const toplam = talep ? kriterSayisi(talep) : uyan + farkli.length;
  return { uyan, toplam, farkli };
}

function EslesmeNotu({ satir }: { satir: KunyeSatiri }) {
  if (!satir.eslesme || satir.eslesme === "notr" || !satir.beklenti) return null;
  const uyuyor = satir.eslesme === "uyuyor";
  return (
    <div
      className={`mt-1 text-[12.5px] font-semibold leading-snug ${
        uyuyor ? "text-accent-ink" : "text-danger"
      }`}
    >
      {uyuyor ? "✓" : "⚠"} {satir.beklenti}
    </div>
  );
}

/**
 * Sunum görselleri — büyük kapak solda küçük kareler, ilan kartlarıyla aynı
 * 3/4 oranında.
 */
export function SunumGaleri({
  fotolar,
  video,
  className = "",
}: {
  fotolar: number;
  video?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex w-full items-start gap-2.5 ${className}`}>
      <div className="flex flex-col gap-2">
        {Array.from({ length: Math.max(0, fotolar - 1) }).map((_, i) => (
          <div
            key={i}
            className="ref-image flex aspect-[3/4] w-[52px] flex-none items-center justify-center rounded-lg font-mono text-[9.5px] text-[#968cac]"
          >
            foto {i + 2}
          </div>
        ))}
        {video && (
          <div className="flex aspect-[3/4] w-[52px] flex-none items-center justify-center rounded-lg bg-accent text-[11px] font-extrabold text-ink-900">
            ▸ video
          </div>
        )}
      </div>
      <div className="ref-image flex aspect-[3/4] min-w-0 flex-1 items-center justify-center self-start rounded-xl font-mono text-[11px] text-[#968cac]">
        foto 1
      </div>
    </div>
  );
}

/** İki sütunlu künye tablosu — satıcı önizlemesi ve alıcı detayı ortak. */
export function SunumKunye({ satirlar }: { satirlar: KunyeSatiri[] }) {
  const sonSatirBasi = Math.floor((satirlar.length - 1) / 2) * 2;
  return (
    <dl className="grid grid-cols-2 gap-x-5">
      {satirlar.map((r, i) => (
        <div
          key={r.k}
          className={`py-2.5 ${
            i < sonSatirBasi ? "border-b border-hairline" : ""
          }`}
        >
          <dt
            className={`text-[11.5px] font-bold uppercase tracking-[0.05em] ${
              r.mor ? "text-primary" : "text-ink-400"
            }`}
          >
            {r.k}
          </dt>
          <dd
            className={`mt-1 text-[15.5px] font-bold ${
              r.mor
                ? "text-[17px] font-extrabold text-primary-hover"
                : "text-ink-900"
            }`}
          >
            {r.v}
          </dd>
          <EslesmeNotu satir={r} />
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
          <p className="mt-2 whitespace-pre-line text-[16px] font-medium leading-[1.65] text-ink-900">
            {metin.trim()}
          </p>
        </div>
      )}
      {yan && <div className="lg:w-[240px] lg:flex-none lg:self-center">{yan}</div>}
    </div>
  );
}
