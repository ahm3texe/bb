// ── Kullanıcı Kalitesi ────────────────────────────────────────────────
// Bulbana ters pazar yerinde satıcı, bir talebe sunum yapmadan önce
// "bu alıcı süreci sonuna götürür mü?" sorusuna cevap arar. Bu modül
// kullanıcının geçmiş davranış sinyallerini tek bir 0-100 puana ve
// yıldız ortalamasına dayalı Yüksek / Orta / Düşük seviyesine indirger.
//
// Saf (pure) ve deterministik: aynı girdi her zaman aynı çıktıyı verir.
// Üretimde metrikler DB'den gelir; şimdilik sayfalar fixture besliyor.

export type AliciSeviye = "yuksek" | "orta" | "dusuk" | "degerlendirilmedi";

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
  /**
   * Aldığı sunumlardan yanıtladığının oranı (0-1).
   * Hiç sunum almadıysa `null` — 0 yazmak, sunum gelmemiş bir kullanıcıyı
   * "hiç yanıt vermiyor" gibi gösterirdi.
   */
  sunumYanitOrani: number | null;
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
  /**
   * Bu sinyal için ölçüm var mı?
   *
   * Veri yokluğu ile kötü performans AYNI ŞEY DEĞİL. Eskiden ikisi de 0 puan
   * alıyordu: hiç sunum almamış bir kullanıcı "Sunumlara yanıt" sinyalinden
   * sıfır alıyor, üstüne o sinyal "zayıf yan" olarak listeleniyordu. Ölçümü
   * olmayan sinyal artık toplama HİÇ girmez.
   */
  veriVar: boolean;
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
  puan: 37,
  yorumTonu: 21,
  tamamlanan: 16,
  iptal: 16,
  yanit: 10,
} as const;

/**
 * Seviye eşikleri — yıldız ortalaması üzerinden (0-5).
 *   4,0 ve üstü → Yüksek
 *   2,0 – 4,0   → Orta
 *   0,0 – 2,0   → Düşük
 *
 * NOT: 3-4 arası aralık ayrıca belirtilmediği için orta banda dahil edildi;
 * böylece 0-5 aralığının tamamı boşluksuz kapsanıyor.
 */
export const YILDIZ_ESIK = { yuksek: 4, orta: 2 } as const;

/**
 * Az sayıda veriyle uç puan çıkmasın diye Bayes yumuşatma sabitleri.
 *
 * Prior 5,0: ilk alışverişini sorunsuz tamamlayan kullanıcı tam puandan
 * başlar. Kimse "kanıtlanana kadar suçlu" değildir; puan ancak gerçek
 * değerlendirmeler, iptaller ve olumsuz yorumlar geldikçe aşağı iner.
 */
const PUAN_PRIOR = 5;
const PUAN_PRIOR_AGIRLIK = 3;
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
 * Ham metrikleri Kullanıcı Kalitesi'ne çevirir.
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
  const yanitVeriVar = m.sunumYanitOrani !== null;
  const yanitOran = clamp01(m.sunumYanitOrani ?? 0);

  const sinyaller: KaliteSinyal[] = [
    {
      ad: "Aldığı yıldız",
      deger: m.degerlendirmeSayisi
        ? `${puanText(m.puanOrtalamasi)} / 5 · ${sayiText(m.degerlendirmeSayisi)} değerlendirme`
        : "Henüz değerlendirme yok",
      puan: puanOran * AGIRLIK.puan,
      agirlik: AGIRLIK.puan,
      guclu: false,
      veriVar: m.degerlendirmeSayisi > 0,
    },
    {
      ad: "Yorum tonu",
      deger: yorumToplam
        ? `${sayiText(m.olumluYorum)} olumlu · ${sayiText(m.olumsuzYorum)} olumsuz`
        : "Henüz yorum yok",
      puan: tonOran * AGIRLIK.yorumTonu,
      agirlik: AGIRLIK.yorumTonu,
      guclu: false,
      veriVar: yorumToplam > 0,
    },
    {
      ad: "Tamamlanan alım",
      deger: sayiText(m.tamamlananAlim),
      puan: tamamlananOran * AGIRLIK.tamamlanan,
      agirlik: AGIRLIK.tamamlanan,
      guclu: false,
      veriVar: islemToplam > 0,
    },
    {
      ad: "İptal oranı",
      deger: islemToplam
        ? `${yuzde(iptalOrani)} · ${sayiText(m.iptalEdilenAlim)} iptal`
        : "İşlem yok",
      puan: iptalOran * AGIRLIK.iptal,
      agirlik: AGIRLIK.iptal,
      guclu: false,
      veriVar: islemToplam > 0,
    },
    {
      ad: "Sunumlara yanıt",
      deger: yanitVeriVar ? yuzde(yanitOran) : "Henüz sunum almadı",
      puan: yanitOran * AGIRLIK.yanit,
      agirlik: AGIRLIK.yanit,
      guclu: false,
      veriVar: yanitVeriVar,
    },
  ].map((s) => ({ ...s, guclu: s.veriVar && s.puan >= s.agirlik * 0.7 }));

  // Puan, YALNIZCA ölçümü olan sinyaller üzerinden ve 100'e ölçeklenerek
  // hesaplanır. Aksi halde veri yokluğu düşük puan gibi görünürdü.
  const olculen = sinyaller.filter((s) => s.veriVar);
  const toplamAgirlik = olculen.reduce((t, s) => t + s.agirlik, 0);
  const puan = toplamAgirlik
    ? Math.round(
        (olculen.reduce((t, s) => t + s.puan, 0) / toplamAgirlik) * 100,
      )
    : 0;
  const yeniAlici = islemToplam < YENI_ALICI_ISLEM;

  // Seviye YALNIZCA yıldız ortalamasından gelir; 0-100 bileşik puan kartta
  // gerekçeyi açıklamak için durur ama seviyeyi belirlemez.
  //
  // Eskiden "yeni alıcı" yumuşatması vardı: geçmişi olmayan ve olumsuz
  // sinyali bulunmayan kullanıcı Düşük yerine Orta gösteriliyordu. Bu, 0
  // ortalamalı bir kullanıcının "Orta" görünmesine yol açtığı için kaldırıldı
  // — artık eşik ne diyorsa o. Geçmişsizlik `yeniAlici` bayrağıyla ve özet
  // cümlesiyle ayrıca belirtilir.
  // Hiç geçmişi olmayan kullanıcı değerlendirilmez: 0 işlemi "düşük kalite"
  // saymak, henüz alışveriş yapmamış herkesi haksız yere damgalardı.
  const gecmisVar =
    islemToplam > 0 || m.degerlendirmeSayisi > 0 || yorumToplam > 0;

  // Etkin yıldız: gerçek değerlendirme varsa ondan, yoksa tam puandan
  // başlar. İptaller ve olumsuz yorumlar bu puanı aşağı çeker; böylece ilk
  // alışverişini sorunsuz bitiren kullanıcı 5 yıldızla başlar, sorun
  // çıktıkça 4'e, 3'e doğru iner.
  const iptalCezasi = Math.min(2, (iptalOrani / 0.2) * 2);
  // Olumsuz yorum cezası yalnızca yıldız verisi yokken uygulanır: yıldız
  // ortalaması varsa olumsuzluk zaten oraya yansımıştır, iki kez cezalandırmak
  // 4,2 ortalamalı bir kullanıcıyı haksız yere "Orta"ya düşürüyordu.
  const olumsuzCezasi =
    m.degerlendirmeSayisi === 0 && yorumToplam
      ? Math.min(1.5, (m.olumsuzYorum / yorumToplam) * 3)
      : 0;
  const etkinYildiz = Math.max(
    0,
    (m.degerlendirmeSayisi > 0 ? puanYumusak : PUAN_PRIOR) -
      iptalCezasi -
      olumsuzCezasi,
  );

  const seviye: AliciSeviye = !gecmisVar
    ? "degerlendirilmedi"
    : etkinYildiz >= YILDIZ_ESIK.yuksek
      ? "yuksek"
      : etkinYildiz >= YILDIZ_ESIK.orta
        ? "orta"
        : "dusuk";

  const gucluYanlar = olculen.filter((s) => s.guclu).map((s) => s.ad);
  // Ölçümü olmayan sinyal zayıf yan sayılmaz: "Sunumlara yanıt" hiç sunum
  // almamış birinin eksiği değildir.
  const zayifYanlar = olculen
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
  degerlendirilmedi: "Henüz değerlendirilmedi",
};

/** Kartın renk paleti — tasarım token'larıyla birebir. */
export const SEVIYE_STIL: Record<
  AliciSeviye,
  { rozet: string; bar: string; yuzey: string; metin: string }
> = {
  yuksek: {
    // Sitenin lime yeşili. Lime üzerinde yazı patlıcan moru olur — beyaz ya da
    // lime yazı bu zeminde okunmaz (globals.css'teki accent notuna bakın).
    rozet: "bg-accent text-accent-ink",
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
    // Kan kırmızısı (--color-acil) — bordo `danger` tonundan bilerek ayrı.
    // Beyaz yazıyla 5,9:1 kontrast, küçük metin için AA'yı geçer.
    rozet: "bg-acil text-white",
    bar: "bg-acil",
    yuzey: "border-acil-line bg-acil-soft",
    metin: "text-acil",
  },
  // Geçmişi olmayan kullanıcı: uyarı değil, bilgi. Nötr gri kullanılır.
  degerlendirilmedi: {
    rozet: "bg-subtle text-ink-500",
    bar: "bg-border-input",
    yuzey: "border-border bg-card",
    metin: "text-ink-500",
  },
};

function ozetCumlesi(
  seviye: AliciSeviye,
  yeniAlici: boolean,
  zayifYanlar: string[],
): string {
  if (seviye === "degerlendirilmedi") {
    return "Henüz tamamlanmış bir alışverişi yok; kalite puanı ilk işlemden sonra oluşur.";
  }
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
