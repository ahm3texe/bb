// ── Veri erişim sınırı ────────────────────────────────────────────────
// BACKEND SINIRI: Sunucu tarafındaki tüm okuma işlemleri buradan geçer.
// Bugün `lib/*.ts` içindeki sabit dizileri okur; backend bağlandığında
// SADECE bu dosyanın gövdesi değişir (fetch / Supabase / Prisma çağrısına
// dönüşür), çağıran sayfaların hiçbiri değişmez.
//
// Fonksiyonlar bilerek `async` — bugün beklenecek bir şey olmasa da
// çağrı yerleri şimdiden `await` ile yazıldığı için, gerçek ağ çağrısına
// geçildiğinde tek satır bile düzeltme gerekmeyecek.
//
// Kullanım kuralı: bu modülü YALNIZCA Server Component'ler (app/**/page.tsx)
// çağırmalı. Client bileşenler veriyi prop olarak almalı; böylece istemciye
// veri katmanı taşınmaz ve gerçek API anahtarları sızmaz.

import { kategoriler, fiyatText } from "./data";
import {
  taleplerOku,
  sunumlarOku,
  acikSunumBul,
  anlasmalarOku,
  anlasmaGetir,
  mesajlarOku,
  okunduOku,
  islemlerOku,
  favoriSayisi,
  iptallerOku,
  aktarimlarOku,
  hesapEpostasiOku,
  hesapTelefonuOku,
  profilOku,
  alarmlarOku,
} from "./depo";
import { anlasmaDurumu, kargoSonTarih } from "./anlasma";
import type { Alarm } from "./depo";
import type { Anlasma } from "./anlasma";
import { acikTalepler, gecenGun } from "./talep-durum";

/** "Bugün" · "1 gün önce" · "12 gün önce" — kart üstündeki kısa tarih. */
function gunMetni(gun: number): string {
  return gun <= 0 ? "Bugün" : `${gun} gün önce`;
}
import { ortalamaKargoSaati, ortalamaYanitSaati } from "./olcum";
import { kusurluIptaller } from "./iptal";
import type { IptalSebep } from "./iptal";
import type { Talep, Kategori } from "./data";
import { getKullanici } from "./kullanicilar";
import type { Kullanici } from "./kullanicilar";
import type { GelenSunum } from "./gelen-sunumlar";
import { sunumAcikMi } from "./gelen-sunumlar";
import type { Sunumum } from "./sunumlarim";
import { degerlendirmelerFor, degerlendirmelerOku } from "./depo";
import { degerlendirilenRol, puanOrtalamasi, rolAyir } from "./degerlendirme";
import type { Sohbet } from "./sohbetler";
import { gecenSureIso } from "./bildirimler";

// ── Talep alarmları ───────────────────────────────────────────────────

/**
 * Hesabın tek bir alarmı — sayfa `lib/depo`'yu doğrudan çağırmasın diye.
 *
 * Kural BACKEND.md'de yazılı: hiçbir `page.tsx` depoyu doğrudan okumaz,
 * okuma katmanı burasıdır. Alarm sayfası bir süre kuralı deldi; Supabase
 * geçişinde değişecek yerleri iki dosyada tutan şey tam da bu sınır.
 * Başkasının alarmı `undefined` döner (liste zaten hesaba göre süzülür).
 */
export async function alarmGetir(
  kullanici: string,
  id: string,
): Promise<Alarm | undefined> {
  return (await alarmlarOku(kullanici)).find((a) => a.id === id);
}

// ── Talepler ──────────────────────────────────────────────────────────

/**
 * Yayındaki talepler — kullanıcıların açtıkları, en yeni önce.
 * Kapanıp 12 saat geçmiş talepler herkese açık listelerde görünmez;
 * sahibinin profili ile sunum yapanların listeleri ayrı yollardan okur.
 */
export async function taleplerGetir(): Promise<Talep[]> {
  return acikTalepler(await taleplerOku());
}

/**
 * Kullanıcının bağlamı süren talepleri: kendi açtıkları ile sunum
 * gönderdikleri. Alışverişi biten talebin kartı bu kişiler için 12 saat
 * boyunca tıklanabilir kalır; başkaları "artık mevcut değil" görür.
 */
export async function ilgiliTalepIdleri(kullanici: string): Promise<string[]> {
  const [talepler, sunumlar] = await Promise.all([
    taleplerOku(),
    sunumlarOku(),
  ]);
  return [
    ...talepler.filter((t) => t.sahibi === kullanici).map((t) => t.id),
    ...sunumlar.filter((s) => s.satici === kullanici).map((s) => s.talepId),
  ];
}

/** Gizlenmiş olanlar dâhil tüm talepler — iç bağlam çözümleri için. */
export async function tumTaleplerGetir(): Promise<Talep[]> {
  return taleplerOku();
}

/** Tek talep. Bulunamazsa `undefined` — çağıran `notFound()` çağırmalı. */
export async function talepGetir(id: string): Promise<Talep | undefined> {
  const hepsi = await taleplerOku();
  return hepsi.find((t) => t.id === id);
}

/** Bir kullanıcının açtığı talepler. */
export async function kullaniciTalepleriGetir(
  kullanici: string,
): Promise<Talep[]> {
  const hepsi = await taleplerOku();
  return hepsi.filter((t) => t.sahibi === kullanici);
}

/** En yeni talepler (ana sayfa şeridi). Depo zaten en yeniyi başa koyar. */
export async function sonTaleplerGetir(adet = 10): Promise<Talep[]> {
  const hepsi = await taleplerGetir();
  return hepsi.slice(0, adet);
}

// ── Kategoriler ───────────────────────────────────────────────────────

/** Kategori listesi — referans veri, muhtemelen sabit kalacak. */
export async function kategorilerGetir(): Promise<Kategori[]> {
  return kategoriler;
}

/** Kategori başına açık talep sayısı. Backend'de tek bir COUNT sorgusu olur. */
export async function kategoriSayilariGetir(): Promise<Record<string, number>> {
  const hepsi = await taleplerGetir();
  const say: Record<string, number> = {};
  for (const k of kategoriler) say[k.ad] = 0;
  for (const t of hepsi) say[t.kategori] = (say[t.kategori] ?? 0) + 1;
  return say;
}

/*
 * `kullaniciGetir` KALDIRILDI: sabit kaydı olduğu gibi döndürüyordu, yani
 * puanı, alım/satış sayısı ve değerlendirmesi her zaman 0 olan bir kullanıcı.
 * Tek çağıranı sunum detay sayfasıydı ve sayfa bu yüzden gerçek sayıyı hiç
 * göremiyor, kartına "12 talep tamamladı" diye sabit yazıyordu. Hesaplanan
 * kayıt için `kullaniciProfilGetir` var.
 */

/**
 * Profil için kullanıcı kaydı — yıldız ortalaması, değerlendirme sayısı ve
 * yorumlar gerçek değerlendirmelerden gelir. Böylece "Kullanıcı Kalitesi"
 * de sahadaki veriye dayanır, sabit fixture'a değil.
 */
/**
 * Bir kullanıcının GERÇEK davranış metrikleri.
 *
 * Bu sayılar `lib/kullanicilar.ts` içindeki sabit kayıtta 0 yazılıydı ve
 * hiçbir yerden hesaplanmıyordu — ama profilde, hesap menüsünde, işlem
 * dökümünde ve **ilan sayfasında satıcıya** gösteriliyorlardı. Yani on
 * alışveriş yapmış bir alıcı, sunum yapmayı düşünen satıcıya "0 alım
 * tamamladı" diye görünüyordu. Kullanıcı Kalitesi seviyesi de bu
 * sayılardan besleniyor.
 *
 * Ölçülemeyen tek alan `iptalEdilenAlim`: düşen siparişler kayıttan
 * siliniyor, geriye iz kalmıyor (bkz. BACKEND.md).
 */
export async function kullaniciMetrikleriGetir(kullanici: string): Promise<{
  tamamlananAlim: number;
  tamamlananSatis: number;
  /** Alıcının kusuruyla düşen sipariş sayısı. */
  iptalEdilenAlim: number;
  /** Satıcının kusuruyla düşen sipariş sayısı. */
  iptalEdilenSatis: number;
  /** Aldığı sunumlardan yanıtladığının oranı (0-1); hiç sunum yoksa null. */
  sunumYanitOrani: number | null;
  /** Sözünde durduğu kargo yüzdesi (0-100); hiç gönderi yoksa null. */
  zamanindaKargo: number | null;
  /**
   * Mesajlara ortalama yanıt süresi (saat); ölçülemiyorsa null.
   *
   * Bu iki alan ("~1 saat", "1 gün") bir dönem profilde KODA GÖMÜLÜ
   * sabitlerdi ve ölçen hiçbir kod yoktu. Artık gerçekten hesaplanıyor
   * (bkz. lib/olcum.ts).
   */
  ortYanitSaat: number | null;
  /** Ödemeden kargoya verene kadar geçen ortalama süre (saat); yoksa null. */
  ortKargoSaat: number | null;
  /**
   * SATICI olarak aldığı yıldız ortalaması ve değerlendirme sayısı.
   *
   * Sunum kartlarındaki yıldız buradan tazelenir. Değer kayda yazılıp
   * donuyordu; dahası kişinin ALICI olarak aldığı yorumlar da içine
   * karışıyordu — satıcı seçen alıcı, aslında o kişinin alıcılığına
   * verilmiş yıldızlara bakıyordu (bkz. lib/degerlendirme.ts → rolAyir).
   */
  saticiPuan: number;
  saticiDegerlendirme: number;
  /**
   * Kullanıcının kusurlu bulunduğu iptaller — GEREKÇESİYLE.
   *
   * Sayı zaten gösteriliyordu ("2 iptal") ama nedeni hiçbir yerde
   * yazmıyordu; kullanıcı puanının neden düştüğünü anlayamıyordu.
   */
  kusurlar: { sebep: IptalSebep; zaman: string }[];
}> {
  const [
    islemler,
    sunumlar,
    talepler,
    anlasmalar,
    iptaller,
    mesajlar,
    degerlendirmeler,
  ] = await Promise.all([
    islemlerOku(),
    sunumlarOku(),
    taleplerOku(),
    anlasmalarOku(),
    iptallerOku(),
    mesajlarOku(),
    degerlendirmelerFor(kullanici),
  ]);

  const tamamlananAlim = islemler.filter((i) => i.alici === kullanici).length;
  const tamamlananSatis = islemler.filter((i) => i.satici === kullanici).length;

  // Sunumlara yanıt: kendi taleplerine gelen sunumlardan kaçına karar
  // verdi? "Süresi doldu" yanıtsız kalmış demektir; kabul/ret ise yanıt.
  // Hâlâ beklemedeki sunumlar sayılmaz — süre henüz dolmadı.
  const kendiTalepler = new Set(
    talepler.filter((t) => t.sahibi === kullanici).map((t) => t.id),
  );
  const gelen = sunumlar.filter((s) => kendiTalepler.has(s.talepId));
  const yanitlanan = gelen.filter(
    (s) => s.sonuc === "kabul" || s.sonuc === "red",
  ).length;
  const yanitsiz = gelen.filter((s) => s.sonuc === "suresi-doldu").length;
  const sunumYanitOrani =
    yanitlanan + yanitsiz > 0 ? yanitlanan / (yanitlanan + yanitsiz) : null;

  // Zamanında kargo: satıcı olarak verdiği sözü tuttuğu gönderi oranı.
  const gonderileri = anlasmalar.filter(
    (a) => a.satici === kullanici && a.kargoZamani,
  );
  const zamaninda = gonderileri.filter((a) => {
    const son = kargoSonTarih(a);
    return (
      !!son && new Date(a.kargoZamani!).getTime() <= new Date(son).getTime()
    );
  }).length;
  const zamanindaKargo = gonderileri.length
    ? Math.round((zamaninda / gonderileri.length) * 100)
    : null;

  // Kusur kaydı sipariş düştüğü anda yazılır (bkz. lib/iptal.ts); sipariş
  // kaydı silinse bile iz kalır.
  const iptalEdilenAlim = iptaller.filter(
    (i) => i.kusur === "alici" && i.alici === kullanici,
  ).length;
  const iptalEdilenSatis = iptaller.filter(
    (i) => i.kusur === "satici" && i.satici === kullanici,
  ).length;

  // Yıldız ortalaması ROLE GÖRE: satıcılığına verilen yıldızlar satıcı
  // tarafında, alıcılığına verilenler alıcı tarafında sayılır.
  const saticiYorumlari = rolAyir(degerlendirmeler).satici;

  return {
    tamamlananAlim,
    tamamlananSatis,
    iptalEdilenAlim,
    iptalEdilenSatis,
    saticiPuan: Number(puanOrtalamasi(saticiYorumlari).toFixed(1)),
    saticiDegerlendirme: saticiYorumlari.length,
    sunumYanitOrani,
    zamanindaKargo,
    // Ölçüm yoksa null döner ve arayüz "—" gösterir; uydurma sayı yok.
    ortYanitSaat: ortalamaYanitSaati(mesajlar, kullanici),
    ortKargoSaat: ortalamaKargoSaati(anlasmalar, kullanici),
    // En yeni önce; ekran ilk birkaçını gösterir.
    kusurlar: kusurluIptaller(iptaller, kullanici)
      .map((i) => ({ sebep: i.sebep, zaman: i.zaman }))
      .sort((a, b) => b.zaman.localeCompare(a.zaman)),
  };
}

export async function kullaniciProfilGetir(
  ad: string,
): Promise<Kullanici | undefined> {
  const k = getKullanici(ad);
  if (!k) return undefined;

  const [degerlendirmeler, talepler, metrik, kayitliProfil] = await Promise.all(
    [
      degerlendirmelerFor(ad),
      taleplerOku(),
      kullaniciMetrikleriGetir(ad),
      // Kullanıcının Ayarlar'dan yazdığı bilgiler. Bunlar bir dönem yalnızca
      // tarayıcıda duruyordu; herkese açık profil sabit kayıttan okuduğu için
      // kişinin yazdığı biyografi YALNIZCA KENDİSİNE görünüyordu.
      profilOku(ad),
    ],
  );

  // Davranış sayıları değerlendirmeden BAĞIMSIZ: hiç puan almamış bir
  // kullanıcının da tamamlanmış alımı/satışı olabilir. Eskiden burada erken
  // dönülüyordu ve o kullanıcı her yerde "0 alım / 0 satış" görünüyordu.
  const temel: Kullanici = {
    ...k,
    // Kullanıcının kendi yazdığı ad ve biyografi sabit kaydı ezer.
    ad: kayitliProfil
      ? `${kayitliProfil.ad} ${kayitliProfil.soyad}`.trim() || k.ad
      : k.ad,
    bio: kayitliProfil?.bio || k.bio,
    tamamlananSatis: metrik.tamamlananSatis,
    // Değerlendirme yoksa üç alan da 0 kalır; arayüz sayıya değil SAYIYA
    // BAKARAK "henüz değerlendirilmemiş" der.
    aliciPuan: 0,
    aliciDegerlendirme: 0,
    saticiPuan: 0,
    saticiDegerlendirme: 0,
    zamanindaKargo: metrik.zamanindaKargo,
    ortYanitSaat: metrik.ortYanitSaat,
    ortKargoSaat: metrik.ortKargoSaat,
    aliciMetrik: {
      ...k.aliciMetrik,
      tamamlananAlim: metrik.tamamlananAlim,
      iptalEdilenAlim: metrik.iptalEdilenAlim,
      sunumYanitOrani: metrik.sunumYanitOrani,
    },
  };
  if (!degerlendirmeler.length) return temel;

  /*
   * PUAN ROLE GÖRE AYRIŞIR.
   *
   * Tek bir ortalama vardı ve kişinin iki rolünü harmanlıyordu. İki ayrı
   * sorun doğuruyordu:
   *
   *   1. Yıldızın yanındaki sayı hiçbir soruya cevap vermiyordu — "iyi
   *      satıcı mı" ile "iyi alıcı mı" aynı rakama sıkışmıştı.
   *   2. Alıcı Kalitesi skoru (bkz. lib/alici-kalitesi.ts) bu karışık
   *      ortalamadan besleniyordu; satıcı olarak alınan yıldızlar alıcı
   *      seviyesini yükseltiyordu.
   *
   * Artık `aliciMetrik` YALNIZCA alıcılığına verilen yorumlardan hesaplanır;
   * satıcı tarafı ayrı alanlarda durur. `puan`/`degerlendirme` genel
   * toplamdır ve rolün bilinmediği yerlerde (kendi hesap kartı) kullanılır.
   */
  const { alici: aliciYorumlari, satici: saticiYorumlari } =
    rolAyir(degerlendirmeler);
  const ortalama = puanOrtalamasi(degerlendirmeler);
  const aliciOrtalama = puanOrtalamasi(aliciYorumlari);
  const olumlu = aliciYorumlari.filter((d) => d.puan >= 4).length;
  const olumsuz = aliciYorumlari.filter((d) => d.puan <= 2).length;

  return {
    ...temel,
    puan: Number(ortalama.toFixed(1)),
    degerlendirme: degerlendirmeler.length,
    aliciPuan: Number(aliciOrtalama.toFixed(1)),
    aliciDegerlendirme: aliciYorumlari.length,
    saticiPuan: Number(puanOrtalamasi(saticiYorumlari).toFixed(1)),
    saticiDegerlendirme: saticiYorumlari.length,
    yorumlar: degerlendirmeler.map((d) => ({
      yazan: d.yazan,
      harf: getKullanici(d.yazan)?.harf ?? d.yazan.slice(0, 2).toUpperCase(),
      urun: talepler.find((t) => t.id === d.talepId)?.baslik ?? "Alışveriş",
      tarih: new Date(d.zaman).toLocaleDateString("tr-TR"),
      puan: d.puan,
      text: d.yorum,
      // Yorumun hangi role verildiği kayıtta vardı ama profile taşınmıyordu;
      // okuyan, cümleden tahmin etmek zorunda kalıyordu.
      rol: degerlendirilenRol(d),
      id: d.id,
    })),
    aliciMetrik: {
      ...temel.aliciMetrik,
      puanOrtalamasi: aliciOrtalama,
      degerlendirmeSayisi: aliciYorumlari.length,
      olumluYorum: olumlu,
      olumsuzYorum: olumsuz,
    },
  };
}

// ── Sunumlar ──────────────────────────────────────────────────────────

/** Bir kullanıcının kendi taleplerine gelen sunumlar. */
export async function gelenSunumlarGetir(
  kullanici: string,
): Promise<GelenSunum[]> {
  const [talepler, sunumlar] = await Promise.all([
    taleplerOku(),
    sunumlarOku(),
  ]);
  const kendiTalepler = new Set(
    talepler.filter((t) => t.sahibi === kullanici).map((t) => t.id),
  );
  return saticiMetrikleriniTazele(
    sunumlar.filter((s) => kendiTalepler.has(s.talepId)),
  );
}

/** Tek sunum kaydı. Bulunamazsa `undefined`. */
export async function sunumGetir(id: string): Promise<GelenSunum | undefined> {
  const hepsi = await sunumlarOku();
  const sunum = hepsi.find((s) => s.id === id);
  if (!sunum) return undefined;
  return (await saticiMetrikleriniTazele([sunum]))[0];
}

/**
 * Sunum kaydındaki satıcı metriklerini OKUMA ANINDA tazeler.
 *
 * `satis`, `zamanindaKargo` ve `puan` sunum gönderilirken kayda yazılıyor
 * ve bir daha güncellenmiyordu: satıcı aradan geçen sürede on satış daha
 * yapsa bile alıcı, karşılaştırma tablosunda hâlâ "0 tamamlanan satış"
 * görüyordu. Alıcı satıcı seçerken tam da bu sayılara bakıyor.
 *
 * Kural `paraDurumu` ile aynı (bkz. BACKEND.md → Para akışı): TÜRETİLEBİLEN
 * DEĞER KAYDA SAKLANMAZ, okurken hesaplanır. Eski kayıtlardaki donmuş
 * değerler de böylece zincire sızmaz.
 *
 * Ölçüm yoksa alan YAZILMAZ — arayüz "—" gösterir; "%0" yazmak henüz
 * kargolamamış satıcıyı sözünde durmamış gibi gösterirdi.
 *
 * SUNUM DÖNDÜREN HER YOL BUNDAN GEÇMELİ. `/api/sunumlar` GET bir süre
 * geçmiyordu: aynı sunum, sayfadan okununca güncel, uçtan okununca donmuş
 * metriklerle dönüyordu — aynı soruya iki farklı cevap.
 */
export async function saticiMetrikleriniTazele(
  sunumlar: GelenSunum[],
): Promise<GelenSunum[]> {
  const saticilar = [...new Set(sunumlar.map((s) => s.satici))];
  const metrikler = new Map(
    await Promise.all(
      saticilar.map(
        async (ad) => [ad, await kullaniciMetrikleriGetir(ad)] as const,
      ),
    ),
  );

  return sunumlar.map((s) => {
    const m = metrikler.get(s.satici);
    if (!m) return s;
    // Donmuş değerler düşürülür: ölçüm yoksa alan hiç olmamalı, yoksa
    // eski değer "—" yerine görünmeye devam ederdi.
    const kalan = { ...s };
    delete kalan.zamanindaKargo;
    delete kalan.yanitSaat;
    return {
      ...kalan,
      satis: m.tamamlananSatis,
      // Yıldız da donuyordu ve iki rolün ortalamasıydı; artık satıcılığına
      // verilen yorumlardan, okuma anında.
      puan: m.saticiPuan.toLocaleString("tr-TR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      degerlendirme: m.saticiDegerlendirme,
      ...(m.zamanindaKargo !== null
        ? { zamanindaKargo: m.zamanindaKargo }
        : {}),
      // `yanitSaat` uzun süre yazılmadı çünkü ölçülmüyordu; artık gerçekten
      // ölçülüyor (bkz. lib/olcum.ts) ve karşılaştırma tablosundaki
      // "Ort. yanıt süresi" satırı bundan besleniyor.
      ...(m.ortYanitSaat !== null ? { yanitSaat: m.ortYanitSaat } : {}),
    };
  });
}

/**
 * Satıcının bu talepte sonuçlanmamış sunumu var mı?
 * Kural depoda uygulanır (`acikSunumBul`); burası yalnızca okuma kapısı.
 */
export async function acikSunumumGetir(
  talepId: string,
  kullanici: string,
): Promise<GelenSunum | undefined> {
  return acikSunumBul(talepId, kullanici);
}

/** Belirli bir talebe gelen sunumlar — karşılaştırma ekranı bunu kullanır. */
export async function talebeGelenSunumlarGetir(
  talepId: string,
): Promise<GelenSunum[]> {
  const sunumlar = await sunumlarOku();
  return sunumlar.filter((s) => s.talepId === talepId);
}

/**
 * Bir kullanıcının satıcı olarak gönderdiği sunumlar (Profil > Sunumlarım).
 * Depodaki sunum kaydı, profil kartının beklediği görünüm şekline burada
 * çevrilir; durum etiketi sunumun akıbetinden ve siparişin adımından
 * türetilir, ayrıca saklanmaz.
 */
export async function gonderdigimSunumlarGetir(
  kullanici: string,
): Promise<Sunumum[]> {
  const [sunumlar, talepler, anlasmalar, degerlendirmeler] = await Promise.all([
    sunumlarOku(),
    taleplerOku(),
    anlasmalarOku(),
    degerlendirmelerOku(),
  ]);

  // Talep sahibinin ALICI puanı. Buradaki değer sabit kullanıcı kaydından
  // okunuyordu ve o kayıtta puan her zaman 0'dır: listede herkes "0,0"
  // görünüyordu. Rol ayrımı için bkz. lib/degerlendirme.ts → rolAyir.
  const aliciPuani = (ad: string) => {
    const hakkinda = degerlendirmeler.filter((d) => d.hakkinda === ad);
    const liste = rolAyir(hakkinda).alici;
    return { puan: puanOrtalamasi(liste), adet: liste.length };
  };

  return sunumlar
    .filter((s) => s.satici === kullanici)
    .map((s) => {
      const talep = talepler.find((t) => t.id === s.talepId);
      const sahibi = talep?.sahibi ?? "";
      const alici = getKullanici(sahibi);
      const anlasma = anlasmalar.find((a) => a.sunumId === s.id);
      const durum = anlasma ? anlasmaDurumu(anlasma) : undefined;

      const [st, stCls, not, grup]: [string, string, string, Sunumum["grup"]] =
        s.sonuc === "red"
          ? [
              "Reddedildi",
              "bg-danger-soft text-danger",
              "Alıcı bu sunumu reddetti; bu talebe yeniden sunum yapabilirsin.",
              "inceleme",
            ]
          : s.sonuc === "arsiv"
            ? [
                "Arşivde",
                "bg-subtle text-ink-500",
                "Alıcı bu talebi yeniden yayına aldı; sunumun önceki döneme ait. Talep hâlâ açıksa yeni sunum yapabilirsin.",
                "inceleme",
              ]
            : s.sonuc === "kapandi"
              ? [
                  "Talep kapandı",
                  "bg-subtle text-ink-500",
                  "Alıcı başka bir sunumu kabul etti. Bu sunum için yapabileceğin bir şey kalmadı; başka taleplere sunum yapabilirsin.",
                  "inceleme",
                ]
              : s.sonuc === "suresi-doldu"
                ? [
                    "Süresi doldu",
                    "bg-subtle text-ink-500",
                    "Alıcı 2 gün içinde yanıt vermedi; sunumun geçersiz oldu. Talep hâlâ açıksa yeniden sunum yapabilirsin.",
                    "inceleme",
                  ]
                : durum === "kargoda"
                  ? [
                      "Kargoda",
                      "bg-accent text-ink-900",
                      `${anlasma?.kargoFirma} · Takip no: ${anlasma?.takipNo}`,
                      "kargo",
                    ]
                  : durum === "kargo-bekleniyor"
                    ? [
                        "Kargona hazırlan",
                        "bg-accent text-ink-900",
                        `Ödeme alındı; ${anlasma?.kargoSaat} saat içinde kargoya ver.`,
                        "kargo",
                      ]
                    : durum === "odeme-bekleniyor"
                      ? [
                          "Anlaşıldı",
                          "bg-primary-soft text-primary-hover",
                          "Teklif kabul edildi; alıcının ödemesi bekleniyor.",
                          "sohbet",
                        ]
                      : [
                          "İncelemede",
                          "bg-subtle text-ink-500",
                          "Sunumun alıcıya iletildi; yanıt bekleniyor.",
                          "inceleme",
                        ];

      return {
        id: s.id,
        talepId: s.talepId,
        sahibi,
        harf: alici?.harf ?? "",
        puan: aliciPuani(sahibi).puan.toLocaleString("tr-TR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        degerlendirme: aliciPuani(sahibi).adet,
        // Talebin açılış zamanı damgadan türetilir; kartta okunur bir
        // ifadeye çevrilir. `talep.eklendi` okunuyordu ve o alan her
        // kayıtta 0 olduğu için tarih HER ZAMAN "Bugün" yazıyordu.
        tarih: talep === undefined ? "" : gunMetni(gecenGun(talep)),
        grup,
        st,
        stCls,
        // Pazarlık sohbette sürüyor; kart oraya götürür.
        aksiyon:
          s.sonuc === "red" ||
          s.sonuc === "suresi-doldu" ||
          s.sonuc === "arsiv" ||
          s.sonuc === "kapandi"
            ? null
            : {
                label: "Sohbete Geç",
                variant: "primary" as const,
                href: `/mesajlar?satici=${encodeURIComponent(kullanici)}`,
              },
        not,
        fotoAdlari: Array.from(
          { length: Math.max(0, s.fotolar) },
          (_, i) => `foto ${i + 1}`,
        ),
        sunum: s,
        sonuc: s.sonuc ?? "beklemede",
      };
    });
}

/**
 * Okunmamış mesaj sayısı — başlıktaki rozet bunu gösterir.
 *
 * Sayılan şey: kullanıcının taraf olduğu sohbetlerde KARŞI TARAFIN
 * gönderdiği ve kullanıcının sohbeti son açışından sonra gelen mesajlar.
 * Hiç açılmamış sohbet, içinde mesaj olmasa bile 1 sayılır: yeni gelen
 * sunumun kendisi okunmamış bir olaydır.
 */
export async function okunmamisMesajSayisi(kullanici: string): Promise<number> {
  const [sohbetler, mesajlar, okundu] = await Promise.all([
    sohbetlerGetir(kullanici),
    mesajlarOku(),
    okunduOku(kullanici),
  ]);

  let toplam = 0;
  for (const s of sohbetler) {
    const sonOkuma = okundu[s.id];

    // Karşı tarafın, son okumadan sonra yazdığı mesajlar. Sohbet hiç
    // açılmadıysa hepsi okunmamıştır.
    toplam += mesajlar.filter(
      (m) =>
        m.sohbetId === s.id &&
        m.gonderen !== kullanici &&
        (!sonOkuma || m.zaman > sonOkuma),
    ).length;

    // Sunumun kendisi de bir olay: alıcı sohbeti hiç açmadıysa okunmamış
    // sayılır. Satıcı için sayılmaz — sunumu zaten kendisi gönderdi.
    if (!sonOkuma && s.sunumId && s.alici === kullanici) toplam += 1;
  }
  return toplam;
}

/**
 * İlan yönetimi ekranının sayıları — hepsi GERÇEK kayıtlardan türetilir.
 *
 * Bu ekran bir dönem sabit rakamlar gösteriyordu ("1.284 görüntülenme",
 * "12 sunum", 14 günlük grafik, dönüşüm hunisi). Ölçülmeyen hiçbir şey
 * gösterilmiyor artık: görüntülenme sayacı olmadığı için o kart ve ona
 * dayanan grafik/huni kaldırıldı.
 */
export async function talepIstatistikleri(talepId: string): Promise<{
  sunum: number;
  takip: number;
  teklifli: number;
  aktifSohbet: number;
}> {
  const [sunumlar, takip, mesajlar] = await Promise.all([
    talebeGelenSunumlarGetir(talepId),
    favoriSayisi(talepId),
    mesajlarOku(),
  ]);

  // Sohbet kimliği `sunum-<sunumId>`; bu talebin sunumlarına ait olanlar.
  const sohbetler = new Set(sunumlar.map((s) => `sunum-${s.id}`));
  const ilgili = mesajlar.filter((m) => sohbetler.has(m.sohbetId));

  return {
    // Alıcı için "sunum" demek, hâlâ değerlendirilebilir sunum demek.
    sunum: sunumlar.filter((s) => sunumAcikMi(s)).length,
    takip,
    // Teklif, tutar taşıyan mesajdır (bkz. lib/depo.ts → Mesaj.tutar).
    teklifli: new Set(
      ilgili.filter((m) => typeof m.tutar === "number").map((m) => m.sohbetId),
    ).size,
    aktifSohbet: new Set(ilgili.map((m) => m.sohbetId)).size,
  };
}

/**
 * Bir sohbetin tarafları. Sohbet kimliği `sunum-<sunumId>` biçiminde;
 * taraflar sunumdan ve talebin sahibinden türetilir, ayrıca saklanmaz.
 * Sohbet yoksa `null`.
 *
 * Hem mesaj okuma/yazma hem "okundu" işaretleme aynı kuralı kullanmalı:
 * ikisi ayrı yerlerde uygulandığında biri güncellenip diğeri unutuluyordu.
 */
export async function sohbetTaraflari(
  sohbetId: string,
): Promise<string[] | null> {
  const sunumId = sohbetId.startsWith("sunum-") ? sohbetId.slice(6) : "";
  if (!sunumId) return null;
  const sunum = (await sunumlarOku()).find((s) => s.id === sunumId);
  if (!sunum) return null;
  const talep = (await taleplerOku()).find((t) => t.id === sunum.talepId);
  if (!talep) return null;
  return [sunum.satici, talep.sahibi];
}

/**
 * Bir hesabın IBAN aktarım talepleri.
 *
 * Sayfalar `lib/depo.ts`'i DOĞRUDAN çağırmaz (bkz. BACKEND.md); okuma
 * kapısı burasıdır.
 */
export async function aktarimlarimGetir(kullanici: string) {
  return aktarimlarOku(kullanici);
}

/** Bir hesabın e-postası doğrulanmış mı? Güven rozeti buna bakar. */
export async function epostaOnayliMi(kullanici: string): Promise<boolean> {
  return (await hesapEpostasiOku(kullanici))?.dogrulandi === true;
}

/**
 * Hesabın telefonu doğrulanmış mı?
 *
 * "Cep telefonu onaylı" rozeti bir dönem `Kullanici.telefonOnayli` alanına
 * bakıyordu; o alan hiçbir hesapta dolmadığı için rozet HİÇ render
 * edilmiyordu ve ölü bir arayüz dalı olarak kaldırılmıştı. Doğrulama akışı
 * kurulduğuna göre rozet de gerçek kayıttan beslenebilir
 * (bkz. app/api/telefon).
 */
export async function telefonOnayliMi(kullanici: string): Promise<boolean> {
  return (await hesapTelefonuOku(kullanici))?.dogrulandi === true;
}

// ── Siparişler ────────────────────────────────────────────────────────

/** Tüm siparişler. Zaman aşımı temizliği depo tarafında yapılır. */
export async function siparislerGetir(): Promise<Anlasma[]> {
  return anlasmalarOku();
}

/** Tek siparişin kaydı — sunum kimliğinden. Bulunamazsa `undefined`. */
export async function siparisGetir(
  sunumId: string,
): Promise<Anlasma | undefined> {
  return anlasmaGetir(sunumId);
}

/** Bir talepte hâlâ süren (tamamlanmamış, sonuçlanmamış) sipariş var mı? */
export async function surenSiparisTalepIdleri(): Promise<string[]> {
  const anlasmalar = await anlasmalarOku();
  return anlasmalar
    .filter((a) => !["tamamlandi", "sorunlu"].includes(anlasmaDurumu(a)))
    .map((a) => a.talepId);
}

// ── Oturum sahibinin bağlamı ──────────────────────────────────────────
// Bu iki fonksiyon eskiden `lib/oturum.ts` içindeydi ve sabit `talepler`
// dizisini okuyordu. Client bileşenlerden çağrıldıkları için o dizi tarayıcı
// paketine giriyordu; artık depodan okunuyor ve sayfalar sonucu prop olarak
// geçiyor (bkz. BACKEND.md → oturum sınırı).

/** Kullanıcının açtığı talepler. */
export async function oturumTalepleriGetir(
  kullanici: string,
): Promise<Talep[]> {
  return kullaniciTalepleriGetir(kullanici);
}

/**
 * Yönetim ve sunum ekranlarının çapası: kullanıcının ilk talebi.
 * Talebi yoksa `undefined` — çağıran taraf boş durum göstermelidir.
 */
export async function anaTalepIdGetir(
  kullanici: string,
): Promise<string | undefined> {
  return (await kullaniciTalepleriGetir(kullanici))[0]?.id;
}

// ── İşlemler, bildirimler, sohbetler ──────────────────────────────────

/** Kullanıcının taraf olduğu tamamlanmış işlemler — depodan okunur. */
export async function islemlerGetir(kullanici: string) {
  return islemlerOku(kullanici);
}

/** Tüm işlemler — işlem dökümü sayfası slug'dan kayda bunun üzerinden gider. */
export async function tumIslemlerGetir() {
  return islemlerOku();
}

/**
 * Kullanıcının sohbetleri.
 *
 * Her sunum, satıcı ile talep sahibi arasında bir pazarlık başlatır — sohbet
 * ayrıca oluşturulmaz, sunumdan türetilir. Tamamlanmış işlemlerden doğan
 * eski sohbetler de listeye eklenir.
 */
/** Tamamlanan alışverişin sohbeti listede ne kadar kalır. */
export const TAMAMLANAN_SOHBET_SURESI_MS = 30 * 24 * 60 * 60 * 1000;

export async function sohbetlerGetir(kullanici: string): Promise<Sohbet[]> {
  // Sohbetler gizlenmiş talepler için de sürer; burada tam liste okunur.
  const [talepler, sunumlar, anlasmalar, mesajlar] = await Promise.all([
    taleplerOku(),
    sunumlarOku(),
    anlasmalarOku(),
    mesajlarOku(),
  ]);

  // Sohbet başına SON mesaj. Liste önizlemesi ve saati bundan gelir;
  // eskiden ikisi de sabitti: her sohbet "Az önce" diyor ve önizleme
  // hep "Sunum gönderildi — X TL" olarak kalıyordu, aylık bir yazışmada
  // bile. Mesajlar zamana göre sıralı geldiği için son eleman yeterli.
  const sonMesaj = new Map<string, (typeof mesajlar)[number]>();
  for (const m of mesajlar) sonMesaj.set(m.sohbetId, m);

  // Biten alışverişin sohbeti bir ay daha durur; sonra listeden düşer.
  const simdi = Date.now();
  const bitmisSunumlar = new Map(
    anlasmalar
      .filter((a) => a.onayZamani)
      .map((a) => [a.sunumId, new Date(a.onayZamani!).getTime()]),
  );

  const sunumSohbetleri = sunumlar
    .map((s) => {
      const talep = talepler.find((t) => t.id === s.talepId);
      if (!talep) return null;
      // Alışverişi biteli bir ayı geçtiyse sohbet artık listelenmez.
      const bitis = bitmisSunumlar.get(s.id);
      if (bitis && simdi - bitis >= TAMAMLANAN_SOHBET_SURESI_MS) return null;
      const sohbetId = `sunum-${s.id}`;
      const son = sonMesaj.get(sohbetId);

      // Önizleme: son mesaj varsa o, yoksa sohbetin açılış olayı.
      const sonSatir = bitmisSunumlar.has(s.id)
        ? "Alışveriş tamamlandı ✓"
        : son
          ? typeof son.tutar === "number"
            ? `Teklif: ${fiyatText(son.tutar)}`
            : son.metin
          : `Sunum gönderildi — ${fiyatText(s.fiyatNum)}`;

      // Saat: son hareketin zamanı. Hiç mesaj yoksa sunumun gönderildiği an.
      const zaman = son?.zaman ?? s.olusturuldu;

      return {
        id: sohbetId,
        alici: talep.sahibi,
        satici: s.satici,
        talepId: talep.id,
        ilan: talep.baslik,
        son: sonSatir,
        saat: zaman ? gecenSureIso(zaman) : "az önce",
        // Sıralama için ham damga; arayüz `saat` metnini gösterir.
        sonHareket: zaman ?? "",
        acik: true,
        sunumId: s.id,
        sunumFoto: s.fotolar,
        sunumFiyat: s.fiyatNum,
      } as Sohbet;
    })
    .filter((s): s is Sohbet => s !== null)
    .filter((s) => s.alici === kullanici || s.satici === kullanici);

  // En son hareket eden sohbet üstte. Sıralama yoktu: liste sunum ekleme
  // sırasına göre geliyordu, yani konuşulan sohbet aşağıda kalabiliyordu.
  return sunumSohbetleri.sort((a, b) =>
    (b.sonHareket ?? "").localeCompare(a.sonHareket ?? ""),
  );
}
