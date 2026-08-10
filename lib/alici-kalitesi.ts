// ── Alıcı Kalitesi ────────────────────────────────────────────────────
// BulBana ters pazar yerinde satıcı, bir talebe sunum yapmadan önce
// "bu alıcı süreci sonuna götürür mü?" sorusuna cevap arar. Bu modül
// alıcının geçmiş davranış sinyallerini tek bir 0-100 puana ve
// Yüksek / Orta / Düşük seviyesine indirger.
//
// Saf (pure) ve deterministik: aynı girdi her zaman aynı çıktıyı verir.
// Üretimde metrikler DB'den gelir; şimdilik sayfalar fixture besliyor.

export type AliciSeviye = "yuksek" | "orta" | "dusuk";

/** Alıcının davranışından toplanan ham sinyaller — hepsi son 12 ay. */
export type AliciMetrik = {
  /** Satıcıların alıcıya verdiği yıldız ortalaması (0-5). */
  puanOrtalamasi: number;
  /** Puan veren tamamlanmış sipariş sayısı. */
  degerlendirmeSayisi: number;
  /** 4-5 yıldızlı yorum sayısı. */
  olumluYorum: number;
  /** 1-2 yıldızlı yorum sayısı. */
  olumsuzYorum: number;
  /** Ödemesi yapılıp teslimle kapanan alım sayısı. */
  tamamlananAlim: number;
  /** Teklif kabul edildikten sonra alıcı yüzünden düşen sipariş sayısı. */
  iptalEdilenAlim: number;
  /** Aldığı sunumlardan yanıtladığı (kabul/ret/pazarlık) oran — 0-1. */
  sunumYanitOrani: number;
  /** Kimlik doğrulaması tamamlanmış mı. */
  kimlikDogrulandi: boolean;
};

export type KaliteSinyal = {
  /** Kartta gösterilen kısa etiket. */
  ad: string;
  /** Ham değerin okunabilir hali (ör. "4,8 / 5"). */
  deger: string;
  /** Bu sinyalden alınan puan. */
  puan: number;
  /** Bu sinyalin toplamdaki ağırlığı (maks. puan). */
  agirlik: number;
  /** Ağırlığının en az %70'i alındıysa güçlü sayılır. */
  guclu: boolean;
};

export type AliciKalite = {
  seviye: AliciSeviye;
  /** 0-100 arası toplam puan (yuvarlanmış). */
  puan: number;
  etiket: string;
  /** Seviyenin tek cümlelik gerekçesi. */
  ozet: string;
  sinyaller: KaliteSinyal[];
  /** Puanı yukarı çeken sinyal adları. */
  gucluYanlar: string[];
  /** Puanı aşağı çeken sinyal adları. */
  zayifYanlar: string[];
  /**
   * Geçmişi puanı anlamlı kılacak kadar dolu değilse true — seviye yine
   * hesaplanır ama kartta "yeni alıcı" uyarısı gösterilir.
   */
  yeniAlici: boolean;
};

// Sinyal ağırlıkları — toplamı 100.
const AGIRLIK = {
  puan: 35,
  yorumTonu: 20,
  tamamlanan: 15,
  iptal: 15,
  yanit: 10,
  kimlik: 5,
} as const;

/** Yüksek/Orta eşiği ve Orta/Düşük eşiği. */
export const ESIK = { yuksek: 75, orta: 50 } as const;

/** Az sayıda veriyle uç puan çıkmasın diye Bayes yumuşatma sabitleri. */
const PUAN_PRIOR = 4.2; // ortalama bir alıcı
const PUAN_PRIOR_AGIRLIK = 5; // 5 sahte değerlendirme kadar çeker
const TON_PRIOR = 0.8; // yorumların %80'i olumlu varsayımı
const TON_PRIOR_AGIRLIK = 4;

/** Bu eşiğin altındaki geçmiş "yeni alıcı" sayılır. */
const YENI_ALICI_ISLEM = 3;

/** Tamamlanan alımda tavan puana ulaşılan işlem sayısı. */
const TAMAMLANAN_TAVAN = 20;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function yuzde(n: number): string {
  return `%${Math.round(n * 100)}`;
}

function sayiText(n: number): string {
  return n.toLocaleString("tr-TR");
}

function puanText(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Ham metrikleri Alıcı Kalitesi'ne çevirir.
 *
 * Her sinyal 0-1 aralığına normalize edilir, ağırlığıyla çarpılır ve
 * toplanır. Az veri (yeni alıcı) durumunda puan ve yorum tonu Bayes
 * yumuşatmasıyla ortalamaya çekilir; böylece tek bir 5 yıldızlı yorum
 * alıcıyı doğrudan "Yüksek" yapmaz.
 */
export function aliciKalitesi(m: AliciMetrik): AliciKalite {
  const yorumToplam = m.olumluYorum + m.olumsuzYorum;
  const islemToplam = m.tamamlananAlim + m.iptalEdilenAlim;

  // 1) Yıldız ortalaması — 3,0 taban, 5,0 tavan; değerlendirme sayısıyla yumuşatılır.
  const puanYumusak =
    (m.puanOrtalamasi * m.degerlendirmeSayisi +
      PUAN_PRIOR * PUAN_PRIOR_AGIRLIK) /
    (m.degerlendirmeSayisi + PUAN_PRIOR_AGIRLIK);
  const puanOran = clamp01((puanYumusak - 3) / 2);

  // 2) Yorum tonu — olumlu yorumun payı.
  const tonYumusak =
    (m.olumluYorum + TON_PRIOR * TON_PRIOR_AGIRLIK) /
    (yorumToplam + TON_PRIOR_AGIRLIK);
  const tonOran = clamp01((tonYumusak - 0.5) / 0.5);

  // 3) Tamamlanan alım — logaritmik: ilk alımlar en çok, sonrakiler az katkı verir.
  const tamamlananOran = clamp01(
    Math.log10(1 + m.tamamlananAlim) / Math.log10(1 + TAMAMLANAN_TAVAN),
  );

  // 4) İptal oranı — %0 iptal tam puan, %20 ve üstü sıfır.
  const iptalOrani = islemToplam > 0 ? m.iptalEdilenAlim / islemToplam : 0;
  const iptalOran = clamp01(1 - iptalOrani / 0.2);

  // 5) Sunumlara yanıt — satıcının en çok şikayet ettiği davranış.
  const yanitOran = clamp01(m.sunumYanitOrani);

  const sinyaller: KaliteSinyal[] = [
    {
      ad: "Aldığı yıldız",
      deger: m.degerlendirmeSayisi
        ? `${puanText(m.puanOrtalamasi)} / 5 · ${sayiText(m.degerlendirmeSayisi)} değerlendirme`
        : "Henüz değerlendirme yok",
      puan: puanOran * AGIRLIK.puan,
      agirlik: AGIRLIK.puan,
      guclu: false,
    },
    {
      ad: "Yorum tonu",
      deger: yorumToplam
        ? `${sayiText(m.olumluYorum)} olumlu · ${sayiText(m.olumsuzYorum)} olumsuz`
        : "Henüz yorum yok",
      puan: tonOran * AGIRLIK.yorumTonu,
      agirlik: AGIRLIK.yorumTonu,
      guclu: false,
    },
    {
      ad: "Tamamlanan alım",
      deger: sayiText(m.tamamlananAlim),
      puan: tamamlananOran * AGIRLIK.tamamlanan,
      agirlik: AGIRLIK.tamamlanan,
      guclu: false,
    },
    {
      ad: "İptal oranı",
      deger: islemToplam
        ? `${yuzde(iptalOrani)} · ${sayiText(m.iptalEdilenAlim)} iptal`
        : "İşlem yok",
      puan: iptalOran * AGIRLIK.iptal,
      agirlik: AGIRLIK.iptal,
      guclu: false,
    },
    {
      ad: "Sunumlara yanıt",
      deger: yuzde(yanitOran),
      puan: yanitOran * AGIRLIK.yanit,
      agirlik: AGIRLIK.yanit,
      guclu: false,
    },
    {
      ad: "Kimlik doğrulama",
      deger: m.kimlikDogrulandi ? "Doğrulandı" : "Doğrulanmadı",
      puan: m.kimlikDogrulandi ? AGIRLIK.kimlik : 0,
      agirlik: AGIRLIK.kimlik,
      guclu: false,
    },
  ].map((s) => ({ ...s, guclu: s.puan >= s.agirlik * 0.7 }));

  const puan = Math.round(sinyaller.reduce((t, s) => t + s.puan, 0));
  const yeniAlici = islemToplam < YENI_ALICI_ISLEM;

  // Olumsuz sinyal yoksa geçmişsizlik tek başına "Düşük" sebebi değildir —
  // yeni alıcı en fazla "Orta" tabanına oturur, kartta uyarısıyla gösterilir.
  const olumsuzKanit = m.olumsuzYorum > 0 || m.iptalEdilenAlim > 0;
  const hamSeviye: AliciSeviye =
    puan >= ESIK.yuksek ? "yuksek" : puan >= ESIK.orta ? "orta" : "dusuk";
  const seviye: AliciSeviye =
    hamSeviye === "dusuk" && yeniAlici && !olumsuzKanit ? "orta" : hamSeviye;

  const gucluYanlar = sinyaller.filter((s) => s.guclu).map((s) => s.ad);
  const zayifYanlar = sinyaller
    .filter((s) => s.puan < s.agirlik * 0.4)
    .map((s) => s.ad);

  return {
    seviye,
    puan,
    etiket: SEVIYE_ETIKET[seviye],
    ozet: ozetCumlesi(seviye, yeniAlici, zayifYanlar),
    sinyaller,
    gucluYanlar,
    zayifYanlar,
    yeniAlici,
  };
}

export const SEVIYE_ETIKET: Record<AliciSeviye, string> = {
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

/** Kartın renk paleti — tasarım token'larıyla birebir. */
export const SEVIYE_STIL: Record<
  AliciSeviye,
  { rozet: string; bar: string; yuzey: string; metin: string }
> = {
  yuksek: {
    // Koyu mor zemin + lime yazı — sitedeki en yüksek vurgulu rozet.
    rozet: "bg-ink-900 text-accent",
    bar: "bg-accent",
    yuzey: "border-border bg-card",
    metin: "text-accent-ink",
  },
  orta: {
    rozet: "bg-star text-ink-900",
    bar: "bg-star",
    yuzey: "border-border bg-card",
    metin: "text-ink-700",
  },
  dusuk: {
    rozet: "bg-danger-soft text-danger",
    bar: "bg-danger",
    yuzey: "border-danger-line bg-danger-soft",
    metin: "text-danger",
  },
};

function ozetCumlesi(
  seviye: AliciSeviye,
  yeniAlici: boolean,
  zayifYanlar: string[],
): string {
  if (yeniAlici) {
    return "Geçmiş işlem sayısı az; puan yeni işlemlerle netleşecek.";
  }
  // Sinyal adları olduğu gibi kullanılır — "İptal" gibi başlıklarda
  // toLocaleLowerCase("tr") bile noktalı i üretip metni bozuyor.
  const zayif = zayifYanlar.join(", ");
  if (seviye === "yuksek") {
    return "Yüksek puan, olumlu yorumlar ve düşük iptal oranı — süreci sonuna götüren bir alıcı.";
  }
  if (seviye === "orta") {
    return zayif
      ? `Genel olarak sorunsuz; dikkat edilecek nokta: ${zayif}.`
      : "Geçmişi genel olarak sorunsuz, öne çıkan bir risk sinyali yok.";
  }
  return zayif
    ? `Risk sinyalleri var: ${zayif}. Sunum öncesi şartları netleştir.`
    : "Risk sinyalleri var. Sunum öncesi şartları netleştir.";
}
