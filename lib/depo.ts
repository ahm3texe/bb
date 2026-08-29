// NOT: node:fs içe aktarıldığı için bu modül yalnızca sunucuda çalışır;
// bir client bileşenden import edilirse Next derleme hatası verir.
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Talep } from "./data";
import { fiyatText } from "./data";
import { sunumAcikMi, MAX_ACIK_SUNUM } from "./gelen-sunumlar";
import {
  kargoSaatiCoz,
  aliciOnaySuresiDoldu,
  iadeKargoSuresiDoldu,
  siparisSuruyor,
  odemeSuresiDoldu,
  kargoSuresiDoldu,
  anlasmaDurumu,
  iadeAdimi,
  itirazKapandiMi,
} from "./anlasma";
import { sunumSuresiDolduMu } from "./gelen-sunumlar";
import { destekYetkisi } from "./roller";
import { harfFor } from "./sohbetler";
import { gorselleriSil } from "./dosya-temizlik";
import { kullanimDisiYollar } from "./gorsel";
import { islemOlustur } from "./islem-olustur";
import {
  kalanGun,
  YAYIN_SURESI_GUN,
  yenidenYayinlanabilirMi,
  talepGizliMi,
} from "./talep-durum";
import { kargoDurumuSorgula } from "./kargo-durum";
import { gonderiOlustur } from "./kargo-gonderi";
import type { GonderiYonu } from "./kargo-gonderi";
import { siparisKoduUret } from "./siparis-kodu";
import { getKullanici } from "./kullanicilar";
import type { Anlasma } from "./anlasma";
import type { Bildirim } from "./bildirimler";
import type { EpostaIsi } from "./eposta";
import type { SmsIsi } from "./sms";
import type { Degerlendirme } from "./degerlendirme";
import type { DestekKaydi } from "./destek";
import { destekNo } from "./destek";
import type { Islem } from "./islemler";
import { bakiyedekiTutar } from "./islemler";
import type { AktarimTalebi } from "./aktarim";
import { MIN_AKTARIM, cekilebilirTutar } from "./aktarim";
import { ibanMaskele } from "./iban";
import { EN_FAZLA_KART } from "./kart";
import type { KayitliKart } from "./kart";
import { EN_FAZLA_ADRES } from "./adres";
import type { KayitliAdres } from "./adres";
import type { TeslimatAdresi } from "./teslimat";
import type { Iptal, IptalSebep } from "./iptal";
import { KUSUR } from "./iptal";
import type { AlarmFiltre, AlarmKanallari } from "./alarm-eslesme";
import { EN_FAZLA_ALARM } from "./alarm-eslesme";
import { paraTutari } from "./para";
import type { GelenSunum } from "./gelen-sunumlar";

// ── Depo ──────────────────────────────────────────────────────────────
// BACKEND SINIRI (kalıcılık). Kullanıcıların açtığı talepler ve gönderdiği
// sunumlar burada tutulur. Sunucu tarafında çalıştığı için TÜM ziyaretçiler
// aynı veriyi görür — tarayıcı belleği değildir.
//
// Bugünkü uygulama: proje kökündeki `.veri/` klasöründe iki JSON dosyası.
// Bağımlılık gerektirmez, dev ve tek sunuculu dağıtımda doğru çalışır.
//
// SINIRLARI — üretime çıkmadan gerçek bir veritabanına geçilmelidir:
//  • Yazma işlemleri süreç içinde sıraya alınır; birden fazla sunucu
//    örneği (ör. Vercel'de birden çok lambda) aynı dosyaya yazarsa
//    kayıp güncelleme olur.
//  • Sorgu yok; her okuma dosyanın tamamını okur. Binlerce kayıtta yavaşlar.
//  • Vercel gibi dosya sistemi kalıcı olmayan ortamlarda veri her dağıtımda
//    sıfırlanır.
//
// Geçiş kolay olsun diye tüm okuma/yazma yalnızca bu dosyadan geçer:
// Postgres/Supabase'e taşınırken sadece aşağıdaki fonksiyonların gövdesi
// değişir, çağıran hiçbir yer değişmez.

const KOK = path.join(process.cwd(), ".veri");
const TALEP_DOSYA = path.join(KOK, "talepler.json");
const SUNUM_DOSYA = path.join(KOK, "sunumlar.json");
const MESAJ_DOSYA = path.join(KOK, "mesajlar.json");
const ANLASMA_DOSYA = path.join(KOK, "anlasmalar.json");
const BILDIRIM_DOSYA = path.join(KOK, "bildirimler.json");
const EPOSTA_DOSYA = path.join(KOK, "eposta-kuyrugu.json");
const DEGERLENDIRME_DOSYA = path.join(KOK, "degerlendirmeler.json");
const DESTEK_DOSYA = path.join(KOK, "destek.json");
const ISLEM_DOSYA = path.join(KOK, "islemler.json");
const AKTARIM_DOSYA = path.join(KOK, "aktarimlar.json");
const KART_DOSYA = path.join(KOK, "kartlar.json");
const FAVORI_DOSYA = path.join(KOK, "favoriler.json");
const ALARM_DOSYA = path.join(KOK, "alarmlar.json");
const OKUNDU_DOSYA = path.join(KOK, "okundu.json");
const ADRES_DOSYA = path.join(KOK, "adresler.json");
const TESLIMAT_DOSYA = path.join(KOK, "teslimat.json");
const IPTAL_DOSYA = path.join(KOK, "iptaller.json");
const KIMLIK_DOSYA = path.join(KOK, "kimlikler.json");
const IBAN_DOSYA = path.join(KOK, "ibanlar.json");
const EPOSTA_HESAP_DOSYA = path.join(KOK, "eposta-hesaplari.json");
const TELEFON_HESAP_DOSYA = path.join(KOK, "telefon-hesaplari.json");
const SMS_DOSYA = path.join(KOK, "sms-kuyrugu.json");
const TERCIH_DOSYA = path.join(KOK, "bildirim-tercihleri.json");
const PROFIL_DOSYA = path.join(KOK, "profiller.json");
const SIFIRLAMA_DOSYA = path.join(KOK, "sifre-sifirlama.json");

/** Aynı anda gelen yazmaları sıraya alır — dosya üzerinde yarış olmasın. */
let kuyruk: Promise<unknown> = Promise.resolve();
function sirala<T>(is: () => Promise<T>): Promise<T> {
  const sonuc = kuyruk.then(is, is);
  // Kuyruk hata yüzünden kırılmasın.
  kuyruk = sonuc.then(
    () => undefined,
    () => undefined,
  );
  return sonuc;
}

async function oku<T>(dosya: string): Promise<T[]> {
  try {
    const ham = await fs.readFile(dosya, "utf8");
    const veri = JSON.parse(ham);
    return Array.isArray(veri) ? (veri as T[]) : [];
  } catch {
    // Dosya yoksa ya da bozuksa boş kabul et — ilk çalıştırma normali budur.
    return [];
  }
}

async function yaz<T>(dosya: string, veri: T[]): Promise<void> {
  await fs.mkdir(KOK, { recursive: true });
  // Önce geçici dosyaya yazıp taşıyoruz: yazma yarıda kesilirse
  // asıl dosya bozulmadan kalır.
  const gecici = `${dosya}.tmp`;
  await fs.writeFile(gecici, JSON.stringify(veri, null, 2), "utf8");
  await fs.rename(gecici, dosya);
}

// ── Kimlik üretimi ────────────────────────────────────────────────────
// Kayıt kimlikleri eskiden `Date.now()` idi. Aynı milisaniyede oluşan iki
// kayıt aynı kimliği alıyordu: listede yinelenen React anahtarı, silme
// çağrısında yanlış kaydın bulunması ve bildirimlerin üst üste binmesi
// bundan geliyordu.

/** Çakışmayan sayısal kimlik (Bildirim.id). Süreç içinde monoton artar. */
let sonKimlik = 0;
export function kimlik(): number {
  const simdi = Date.now();
  sonKimlik = simdi > sonKimlik ? simdi : sonKimlik + 1;
  return sonKimlik;
}

/** Çakışmayan metin kimliği: `kart-…`, `adres-…` gibi öneklerle kullanılır. */
export function metinKimlik(onek: string): string {
  return `${onek}-${randomUUID()}`;
}

/** Favori kaydı — kim, hangi talebi işaretledi. */
type Favori = { kullanici: string; talepId: string; zaman: string };

// ── Talepler ──────────────────────────────────────────────────────────

export async function taleplerOku(): Promise<Talep[]> {
  return oku<Talep>(TALEP_DOSYA);
}

/**
 * Talebi kaydeder ve KESİNLEŞMİŞ kaydı döndürür.
 *
 * Kimlik burada, yazma kilidinin içinde üretilir. Eskiden çağıran taraf
 * `slugUret` ile kilidin DIŞINDA üretiyordu: aynı başlıkla aynı anda gelen
 * iki istek aynı slug'ı alıp iki talep aynı kimlikle kaydedilebiliyordu.
 * Sunum, anlaşma, teslimat ve favori kayıtlarının hepsi talep kimliğine
 * bağlı olduğu için bu, ilişkileri sessizce birbirine karıştırırdı —
 * `find(t => t.id === id)` her zaman ilkini döndürür.
 *
 * Çağıran taraf DÖNEN kaydı kullanmalı; gönderdiği `id` yok sayılır.
 */
export async function talepEkle(talep: Talep): Promise<Talep> {
  return sirala(async () => {
    const hepsi = await oku<Talep>(TALEP_DOSYA);
    const kayit: Talep = {
      ...talep,
      id: slugUret(
        talep.baslik,
        hepsi.map((t) => t.id),
      ),
    };
    await yaz(TALEP_DOSYA, [kayit, ...hepsi]);
    return kayit;
  });
}

/**
 * Talebi ve ona gelen tüm sunumları siler.
 * Sahiplik kontrolü çağıran tarafta değil BURADA yapılır ki hiçbir yol
 * atlanamasın; sahibi tutmuyorsa "yetkisiz" döner ve hiçbir şey silinmez.
 */
/**
 * Verilen yollardan HİÇBİR kaydın kullanmadıklarını döndürür.
 *
 * NEDEN VAR: `gorselleriSil` kendisine verilen her yolu diskten siliyordu,
 * dosyanın başka bir kayıtta geçip geçmediğine bakmadan. Yükleme kaydı
 * "bu dosyayı kim yükledi" bilgisini tutmadığı için de uçlar, gövdeden
 * gelen `gorseller` listesinde BAŞKASININ dosya yolunu kabul edebiliyordu
 * (`gorselleriSuz` yalnızca biçimi doğruluyor). İkisi birleşince şu
 * mümkündü:
 *
 *   1. Kötü niyetli kullanıcı hedefin ilanındaki görsel yolunu okur —
 *      yol herkese açık sayfanın HTML'inde duruyor,
 *   2. kendi yeni ilanını açarken o yolu `gorseller` alanına yazar,
 *   3. kendi ilanını siler,
 *   4. HEDEFİN ilanının kapak görseli diskten silinir.
 *
 * Aynı şey kazara da oluyordu: iki kayıt aynı dosyayı gösteriyorsa birini
 * silmek diğerinin görselini götürüyordu.
 *
 * Bu süzgeç, silmeyi "artık kimsenin işaret etmediği dosya" ile
 * sınırlar — saldırgan silse bile hedefin kaydı dosyayı tuttuğu için
 * dosya yerinde kalır.
 *
 * ÇAĞIRAN TARAF, kendi kaydını ÖNCE yazmalıdır (silinen kayıt artık
 * listede olmamalı); yoksa dosya "hâlâ kullanılıyor" görünür.
 */
async function kullanilmayanGorseller(yollar: string[]): Promise<string[]> {
  if (!yollar.length) return [];

  const [talepler, sunumlar, destekKayitlari] = await Promise.all([
    oku<Talep>(TALEP_DOSYA),
    oku<GelenSunum>(SUNUM_DOSYA),
    oku<DestekKaydi>(DESTEK_DOSYA),
  ]);

  const kullanimda = new Set<string>();
  for (const t of talepler)
    for (const g of t.gorseller ?? []) kullanimda.add(g);
  for (const s of sunumlar)
    for (const g of s.gorseller ?? []) kullanimda.add(g);
  for (const d of destekKayitlari)
    for (const e of d.ekler ?? []) kullanimda.add(e);

  return kullanimDisiYollar(yollar, kullanimda);
}

/**
 * Talebi YAYINDAN KALDIRIR. Kayıt silinmez, damgalanır.
 *
 * Eskiden iki ayrı dal vardı: alışverişe dönüşmüş talep arşivleniyor,
 * dönüşmemiş talep ise sunumları, sohbetleri, favorileri ve teslimat
 * adresiyle birlikte TAMAMEN siliniyordu. Sonuç, kullanıcının kendi
 * kaldırdığı talebin hiçbir yerde görünmemesiydi: "ben bu ilanı ne zaman
 * kaldırmıştım?" sorusunun cevabı yoktu ve o talebe sunum göndermiş
 * satıcının kaydı da sessizce yok oluyordu.
 *
 * Artık tek dal var — kaldırma damgası ve GEREKÇESİ yazılır:
 *
 *   • `alisveris`  — talep bir siparişe dönüştüğü için kalktı,
 *   • `kullanici`  — sahibi kendi isteğiyle kaldırdı.
 *
 * Gerekçe kullanıcıya gösterilir (bkz. ProfilClient → Yayından Kalkanlar);
 * "neden listede yok?" sorusu ekranda yanıtlanmalı.
 *
 * İlişkili kayıtlara DOKUNULMAZ: sunum, sohbet, sipariş ve favori
 * kayıtları taraflarda durmaya devam eder. Kaldırılan talep hâlâ var
 * olduğu için bu kayıtlar sahipsiz kalmaz.
 */
export async function talepYayindanKaldir(
  id: string,
  isteyen: string,
): Promise<"kaldirildi" | "bulunamadi" | "yetkisiz" | "itiraz-suruyor"> {
  return sirala(async () => {
    const talepler = await oku<Talep>(TALEP_DOSYA);
    const talep = talepler.find((t) => t.id === id);
    if (!talep) return "bulunamadi";
    if (talep.sahibi !== isteyen) return "yetkisiz";

    const anlasmalar = await oku<Anlasma>(ANLASMA_DOSYA);

    // Süren itiraz/iade varken talep hiçbir şekilde elden çıkarılamaz:
    // ürün geri gitmeden, satıcı teslim almadan ve para iade edilmeden
    // kaydın kaybolması iki tarafı da savunmasız bırakır.
    if (anlasmalar.some((a) => a.talepId === id && !itirazKapandiMi(a)))
      return "itiraz-suruyor";

    const sebep: Talep["kaldirmaSebebi"] = anlasmalar.some(
      (a) => a.talepId === id,
    )
      ? "alisveris"
      : "kullanici";

    await yaz(
      TALEP_DOSYA,
      talepler.map((t) =>
        t.id === id
          ? { ...t, silindi: new Date().toISOString(), kaldirmaSebebi: sebep }
          : t,
      ),
    );
    return "kaldirildi";
  });
}

/**
 * Yayından kalkmış talebi KALICI olarak siler — kayıt ve bağlı her şey gider.
 *
 * İki aşamalı silmenin ikinci adımı: önce `talepYayindanKaldir` ile talep
 * listelerden kalkar ve "Yayından Kalkanlar" bölümünde durur, kullanıcı
 * isterse oradan kalıcı olarak siler. Tek adımda silmek geri alınamaz bir
 * işlemi tek tıka indiriyordu.
 *
 * ALIŞVERİŞE DÖNÜŞMÜŞ TALEP SİLİNEMEZ. Silmek iki tarafın sohbetini,
 * sipariş kaydını ve para geçmişini birden yok ederdi; satıcının kaydı da
 * alıcının kararıyla ortadan kalkardı. Bu talepler "Yayından Kalkanlar"
 * bölümünde kalıcı olarak durur.
 */
export async function talepKaliciSil(
  id: string,
  isteyen: string,
): Promise<
  "silindi" | "bulunamadi" | "yetkisiz" | "yayinda" | "alisverise-donustu"
> {
  return sirala(async () => {
    const talepler = await oku<Talep>(TALEP_DOSYA);
    const talep = talepler.find((t) => t.id === id);
    if (!talep) return "bulunamadi";
    if (talep.sahibi !== isteyen) return "yetkisiz";
    // Önce yayından kalkmış olmalı: kalıcı silme, listelerde duran bir
    // ilan için tek adımlık bir kaza olmamalı. Dondurma da bir yayından
    // çekmedir (bkz. ProfilClient → Yayından Kalkanlar), o yüzden ikisi de
    // sayılır.
    if (!talep.silindi && !talep.donduruldu) return "yayinda";

    const anlasmalar = await oku<Anlasma>(ANLASMA_DOSYA);
    if (anlasmalar.some((a) => a.talepId === id)) return "alisverise-donustu";

    await yaz(
      TALEP_DOSYA,
      talepler.filter((t) => t.id !== id),
    );

    // Talebe bağlı HER ŞEY gider; yoksa geride sahibi olmayan sunum ve
    // sohbet kalır ve bunlar hiçbir ekranda görünmediği için sessizce
    // birikir.
    const sunumlar = await oku<GelenSunum>(SUNUM_DOSYA);
    const silinenSunumlar = sunumlar.filter((s) => s.talepId === id);
    const silinenSunumIdler = silinenSunumlar.map((s) => s.id);

    // Sunum kayıtları ÖNCE düşer; dosya temizliği sonra yapılır ki
    // "bu dosyayı başka kayıt kullanıyor mu?" sorusu güncel liste
    // üzerinden yanıtlansın.
    await yaz(
      SUNUM_DOSYA,
      sunumlar.filter((s) => s.talepId !== id),
    );

    // Yüklenen dosyalar da gider — ama YALNIZCA artık hiçbir kaydın
    // işaret etmedikleri. Paylaşılan bir dosyayı silmek, başkasının
    // ilanının kapağını götürüyordu (bkz. kullanilmayanGorseller).
    await gorselleriSil(
      await kullanilmayanGorseller([
        ...(talep.gorseller ?? []),
        ...silinenSunumlar.flatMap((s) => s.gorseller ?? []),
      ]),
    );

    // Sohbet kimliği `sunum-<sunumId>` biçiminde.
    const mesajlar = await oku<Mesaj>(MESAJ_DOSYA);
    await yaz(
      MESAJ_DOSYA,
      mesajlar.filter(
        (m) => !silinenSunumIdler.some((sid) => m.sohbetId === `sunum-${sid}`),
      ),
    );

    // Favoriler de talebe bağlı: olmayan bir ilana işaret eden kayıt
    // "Favorilerim (1)" yazdırıyor ama hiçbir kart göstermiyordu.
    const favoriler = await oku<Favori>(FAVORI_DOSYA);
    await yaz(
      FAVORI_DOSYA,
      favoriler.filter((f) => f.talepId !== id),
    );

    // Teslimat adresi de gider. Bu kayıt kapı numarası, kat ve daire
    // taşıyor; ilanı olmayan bir adres kaydının diskte kalması, adresi
    // talepten ayrı tutma gerekçesinin kendisiyle çelişirdi.
    const teslimatlar = await oku<TeslimatAdresi>(TESLIMAT_DOSYA);
    await yaz(
      TESLIMAT_DOSYA,
      teslimatlar.filter((t) => t.talepId !== id),
    );

    return "silindi";
  });
}

// ── Sunumlar ──────────────────────────────────────────────────────────

export async function sunumlarOku(): Promise<GelenSunum[]> {
  // Yanıtsız kalan sunumlar okuma anında düşürülür (bkz. lib/gelen-sunumlar).
  // Okuma da aynı kuyruk adımında yapılır: temizlikten sonra kilidi bırakıp
  // okumak, araya giren bir yazmanın yarısını görme ihtimali bırakıyordu.
  const { dusenler, liste } = await sirala(async () => {
    const dusenler = await yanitsizSunumlariDusur();
    return { dusenler, liste: await oku<GelenSunum>(SUNUM_DOSYA) };
  });
  // Bildirim kilit bırakıldıktan SONRA: `bildirimEkle` de kuyruğa girer.
  await sunumSuresiBildirimleri(dusenler);
  return liste;
}

/**
 * Satıcının bu talepte sonuçlanmamış bir sunumu var mı?
 * Yalnızca reddedilen sunum yolu açar; beklemedeki ya da kabul edilen
 * sunum ikinci bir sunumu engeller.
 */
export async function acikSunumBul(
  talepId: string,
  satici: string,
): Promise<GelenSunum | undefined> {
  await sunumSuresiBildirimleri(await sirala(yanitsizSunumlariDusur));
  const hepsi = await oku<GelenSunum>(SUNUM_DOSYA);
  return hepsi.find(
    (s) => s.talepId === talepId && s.satici === satici && sunumAcikMi(s),
  );
}

/**
 * Sunumu kaydeder. "Tek açık sunum" kuralı BURADA uygulanır ki hiçbir
 * çağrı yolu atlayamasın; kontrol yazma kuyruğunun içinde yapıldığı için
 * aynı anda gelen iki istek de ikinci kaydı oluşturamaz.
 */
export async function sunumEkle(
  sunum: GelenSunum,
): Promise<
  | GelenSunum
  | "acik-sunum-var"
  | "talep-kapali"
  | "talep-alinmiyor"
  | "sunum-siniri"
> {
  await odemeSuresiBildirimleri(await sirala(suresiDolanlariDusur));
  await sunumSuresiBildirimleri(await sirala(yanitsizSunumlariDusur));
  return sirala(async () => {
    // Önce talebin kendisi. Bu kontrol kişisel kuraldan önce gelir ki
    // kullanıcı doğru gerekçeyi görsün.
    const talepler = await oku<Talep>(TALEP_DOSYA);
    const talep = talepler.find((t) => t.id === sunum.talepId);
    if (talep?.kapandi) return "talep-kapali" as const;
    // Yalnızca `kapandi` bakılıyordu: DONDURULMUŞ ya da yumuşak SİLİNMİŞ
    // talebe sunum gönderilebiliyordu. İkisinde de talep yayında değil —
    // satıcı görünmeyen bir ilana emek harcamış oluyordu.
    if (talep && talepGizliMi(talep)) return "talep-alinmiyor" as const;

    const hepsi = await oku<GelenSunum>(SUNUM_DOSYA);
    const acik = hepsi.find(
      (s) =>
        s.talepId === sunum.talepId &&
        s.satici === sunum.satici &&
        sunumAcikMi(s),
    );
    if (acik) return "acik-sunum-var" as const;

    // Talep başına açık sunum tavanı. Uçta `talep.sunum` sayacına bakılarak
    // kontrol ediliyordu ama o okuma kilidin dışındaydı: aynı anda gelen
    // istekler tavanı birlikte aşabiliyordu. Sayaç yerine gerçek kayıtlar
    // sayılıyor — sayaç kendisi de türetilmiş bir değer.
    const acikSayisi = hepsi.filter(
      (s) => s.talepId === sunum.talepId && sunumAcikMi(s),
    ).length;
    if (acikSayisi >= MAX_ACIK_SUNUM) return "sunum-siniri" as const;

    await yaz(SUNUM_DOSYA, [sunum, ...hepsi]);
    await sunumSayisiTazele(sunum.talepId);
    return sunum;
  });
}

/**
 * Talebin sunum sayacını gerçek kayıtlardan yeniden hesaplar.
 *
 * Sayaç önce yalnızca ARTIYORDU: reddedilen ya da süresi dolup iptal
 * olan sunumlar düşülmediği için kart "3 sunum" derken ortada tek
 * geçerli sunum kalabiliyordu. Sayılan şey açık sunumlar — kapanmış
 * olanlar alıcı için bir seçenek değil.
 */
async function sunumSayisiTazele(talepId: string): Promise<void> {
  const sunumlar = await oku<GelenSunum>(SUNUM_DOSYA);
  const acik = sunumlar.filter(
    (s) => s.talepId === talepId && sunumAcikMi(s),
  ).length;

  const talepler = await oku<Talep>(TALEP_DOSYA);
  const i = talepler.findIndex((t) => t.id === talepId);
  if (i === -1 || talepler[i].sunum === acik) return;
  talepler[i] = { ...talepler[i], sunum: acik };
  await yaz(TALEP_DOSYA, talepler);
}

/**
 * Talebin içeriğini günceller. Yalnızca sahibi ve yalnızca yayındayken;
 * anlaşmaya dönüşmüş ya da silinmiş talep düzenlenemez.
 *
 * Yalnızca beyaz listedeki alanlar yazılır: sahiplik, sunum sayacı,
 * kapanış damgası gibi alanlar istemciden gelemez.
 */
export async function talepGuncelle(
  id: string,
  isteyen: string,
  veri: Partial<Talep>,
): Promise<Talep | "bulunamadi" | "yetkisiz" | "duzenlenemez"> {
  return sirala(async () => {
    const hepsi = await oku<Talep>(TALEP_DOSYA);
    const i = hepsi.findIndex((t) => t.id === id);
    if (i === -1) return "bulunamadi" as const;
    if (hepsi[i].sahibi !== isteyen) return "yetkisiz" as const;
    if (hepsi[i].kapandi || hepsi[i].silindi) return "duzenlenemez" as const;

    const anlasmalar = await oku<Anlasma>(ANLASMA_DOSYA);
    if (anlasmalar.some((a) => a.talepId === id))
      return "duzenlenemez" as const;

    // Görsel listesi değiştiyse, listeden DÜŞEN dosyalar diskten de gitmeli.
    // Bu adım eksikti: düzenlemede `gorseller` alanı doğrudan eziliyordu ve
    // eski dosyalar hiçbir kaydın işaret etmediği hâlde diskte kalıyordu.
    const eskiGorseller = hepsi[i].gorseller ?? [];
    const yeniGorseller = veri.gorseller;

    hepsi[i] = {
      ...hepsi[i],
      ...veri,
      id: hepsi[i].id,
      sahibi: hepsi[i].sahibi,
    };
    await yaz(TALEP_DOSYA, hepsi);

    if (yeniGorseller) {
      const kalan = new Set(yeniGorseller);
      // Kayıt yukarıda güncellendi; süzgeç güncel liste üzerinden çalışır.
      await gorselleriSil(
        await kullanilmayanGorseller(
          eskiGorseller.filter((g) => !kalan.has(g)),
        ),
      );
    }

    return hepsi[i];
  });
}

/**
 * Talebi dondurur ya da yeniden yayına alır. Yalnızca sahibi yapabilir.
 * Yeniden yayında süre baştan işler: talep 30 gün daha açık kalır.
 */
export async function talepYayinDurumu(
  id: string,
  isteyen: string,
  islem: "dondur" | "yayinla",
): Promise<
  Talep | "bulunamadi" | "yetkisiz" | "kapali" | "zaten-yayinda" | "silinmis"
> {
  return sirala(async () => {
    const hepsi = await oku<Talep>(TALEP_DOSYA);
    const i = hepsi.findIndex((t) => t.id === id);
    if (i === -1) return "bulunamadi" as const;
    if (hepsi[i].sahibi !== isteyen) return "yetkisiz" as const;

    // ZATEN YAYINDAKİ talep yeniden yayınlanamaz.
    //
    // Bu kural yalnızca arayüzde vardı (`yenidenYayinlanabilirMi`, bkz.
    // IlanDetay) — uçta yoktu. Sahibi doğrudan çağırdığında iki şey birden
    // oluyordu: ilanın yaşı sıfırlanıp 30 gün daha uzuyor (sonsuz öne
    // taşıma) ve o ilana gelmiş TÜM bekleyen sunumlar arşive düşüyordu.
    // Kural artık burada; hiçbir yol atlayamaz.
    if (islem === "yayinla") {
      // Silinen talep geri açılmaz; yalnızca kayıt olarak durur.
      if (hepsi[i].silindi) return "silinmis" as const;
      if (!yenidenYayinlanabilirMi(hepsi[i])) return "zaten-yayinda" as const;
    }

    // Kapanmış talep ancak süreç bittiyse yeniden açılabilir: ödeme,
    // kargo ya da onay bekleyen bir sipariş varken talep yayına dönemez.
    if (hepsi[i].kapandi) {
      const anlasmalar = await oku<Anlasma>(ANLASMA_DOSYA);
      const suren = anlasmalar.some(
        (a) =>
          a.talepId === hepsi[i].id &&
          !["tamamlandi", "sorunlu"].includes(anlasmaDurumu(a)),
      );
      if (suren) return "kapali" as const;
    }

    if (islem === "dondur") {
      // Dondurma bir duraklatmadır: kalan gün saklanır.
      hepsi[i] = {
        ...hepsi[i],
        donduruldu: new Date().toISOString(),
        dondurmaKalanGun: kalanGun(hepsi[i]),
      };
    } else {
      // Geri açarken: dondurmadan geliyorsa kalan süre devam eder,
      // süresi dolduysa ya da satış bittiyse sayaç 30 günden başlar.
      const kalan = hepsi[i].donduruldu
        ? (hepsi[i].dondurmaKalanGun ?? YAYIN_SURESI_GUN)
        : YAYIN_SURESI_GUN;
      hepsi[i] = {
        ...hepsi[i],
        donduruldu: undefined,
        dondurmaKalanGun: undefined,
        // Kapanmış talep yeniden yayına alınırken kapanış da kalkar.
        kapandi: undefined,
        olusturuldu: new Date().toISOString(),
        eklendi: 0,
        // Kalan süre `gun` alanında taşınır; süre hesabı buradan okur.
        gun: Math.max(1, kalan),
      };
    }
    await yaz(TALEP_DOSYA, hepsi);

    // Yeni yayın dönemi temiz başlar: önceki dönemin sunumları arşivlenir.
    // Kayıtları duruyor (satıcının "Sunumlarım" listesinde görünür) ama
    // yeni döneme karışmaz; eski satıcı da yeniden sunum yapabilir.
    if (islem === "yayinla") {
      const sunumlar = await oku<GelenSunum>(SUNUM_DOSYA);
      const guncel = sunumlar.map((s) =>
        s.talepId === id && sunumAcikMi(s)
          ? { ...s, sonuc: "arsiv" as const }
          : s,
      );
      await yaz(SUNUM_DOSYA, guncel);
    }

    return hepsi[i];
  });
}

/**
 * Talebi kapatır — sonuçlanan ilk sunum talebi kapatır, sonrakiler
 * kapanış zamanını değiştirmez. Kuyruk içinden çağrılır.
 */
async function talebiKapat(talepId: string): Promise<void> {
  const talepler = await oku<Talep>(TALEP_DOSYA);
  const i = talepler.findIndex((t) => t.id === talepId);
  if (i === -1 || talepler[i].kapandi) return;
  talepler[i] = { ...talepler[i], kapandi: new Date().toISOString() };
  await yaz(TALEP_DOSYA, talepler);
}

/**
 * Sunumu kabul eder ya da reddeder. Kararı YALNIZCA talebi açan alıcı
 * verebilir; kontrol burada yapılır ki hiçbir uç atlayamasın.
 */
/**
 * Satıcı kendi sunumunu geri çeker. Yalnızca alıcı henüz karar vermemişken
 * mümkündür: kabul edilmiş sunum siparişe dönüşmüştür, tek taraflı iptal
 * edilemez.
 */
export async function sunumGeriCek(
  id: string,
  isteyen: string,
): Promise<GelenSunum | "bulunamadi" | "yetkisiz" | "geri-cekilemez"> {
  return sirala(async () => {
    const hepsi = await oku<GelenSunum>(SUNUM_DOSYA);
    const i = hepsi.findIndex((s) => s.id === id);
    if (i === -1) return "bulunamadi" as const;
    if (hepsi[i].satici !== isteyen) return "yetkisiz" as const;
    if ((hepsi[i].sonuc ?? "beklemede") !== "beklemede")
      return "geri-cekilemez" as const;

    hepsi[i] = { ...hepsi[i], sonuc: "iptal" };
    await yaz(SUNUM_DOSYA, hepsi);
    await sunumSayisiTazele(hepsi[i].talepId);
    return hepsi[i];
  });
}

/**
 * Alıcı bir sunumu REDDEDER.
 *
 * Kabul buradan geçmez. Kabul etmek, tanımı gereği sipariş açmaktır ve bunu
 * yapan tek yer `anlasmaOlustur`'dur: tutarı sohbetten türetir, talebi
 * kapatır, diğer sunumları düşürür ve siparişi oluşturur.
 *
 * Bu fonksiyon bir dönem "kabul" de kabul ediyordu ve o dalda sunumu kabul
 * edilmiş yapıp talebi kapatıyor, ama SİPARİŞ AÇMIYORDU: ilan kapalı, sunum
 * kabul edilmiş görünüyor, ortada ödenecek/kargolanacak bir şey yok. Arayüz
 * bu yolu hiç kullanmıyordu ama uç açıktı. Aynı işi yapan iki yoldan eksik
 * olanı kapatıldı.
 */
export async function sunumSonucla(
  sunumId: string,
  isteyen: string,
  sonuc: "red",
): Promise<"guncellendi" | "bulunamadi" | "yetkisiz" | "zaten-sonuclandi"> {
  return sirala(async () => {
    const sunumlar = await oku<GelenSunum>(SUNUM_DOSYA);
    const i = sunumlar.findIndex((s) => s.id === sunumId);
    if (i === -1) return "bulunamadi";

    const talepler = await oku<Talep>(TALEP_DOSYA);
    const talep = talepler.find((t) => t.id === sunumlar[i].talepId);
    if (!talep || talep.sahibi !== isteyen) return "yetkisiz";

    // Karar bir kez verilir. Bu kontrol yoksa kabul edilip siparişe
    // dönüşmüş bir sunum sonradan "red" yapılabiliyordu: ortada açık bir
    // sipariş varken sunum reddedilmiş görünüyor, iki kayıt çelişiyordu.
    if ((sunumlar[i].sonuc ?? "beklemede") !== "beklemede")
      return "zaten-sonuclandi";

    sunumlar[i] = { ...sunumlar[i], sonuc };
    await yaz(SUNUM_DOSYA, sunumlar);
    // Ret pazarlığı kapatmaz: alıcı hâlâ ürün arıyordur ve satıcı aynı
    // talebe yeniden sunum yapabilir. Talebi yalnızca kabul (yani sipariş
    // açılması) bitirir.
    // Reddedilen sunum artık açık değil; sayaç da düşmeli.
    await sunumSayisiTazele(sunumlar[i].talepId);
    return "guncellendi";
  });
}

// ── Mesajlar ──────────────────────────────────────────────────────────

/** Sohbette yazılan tek bir mesaj. Teklifler de mesaj olarak saklanır. */
export type Mesaj = {
  id: string;
  /** Hangi sohbete ait — `sunum-<sunumId>` biçiminde. */
  sohbetId: string;
  gonderen: string;
  /** Düz metin mesajı; teklifte boş olabilir. */
  metin: string;
  /** Teklif mesajıysa tutar (TL). */
  tutar?: number;
  /** ISO zaman damgası. */
  zaman: string;
};

export async function mesajlarOku(sohbetId?: string): Promise<Mesaj[]> {
  const hepsi = await oku<Mesaj>(MESAJ_DOSYA);
  const sirali = hepsi.sort((a, b) => a.zaman.localeCompare(b.zaman));
  return sohbetId ? sirali.filter((m) => m.sohbetId === sohbetId) : sirali;
}

export async function mesajEkle(mesaj: Mesaj): Promise<Mesaj> {
  return sirala(async () => {
    const hepsi = await oku<Mesaj>(MESAJ_DOSYA);
    await yaz(MESAJ_DOSYA, [...hepsi, mesaj]);
    return mesaj;
  });
}

// ── Anlaşmalar (sipariş akışı) ────────────────────────────────────────
// Teklif kabul edildiği anda pazarlık kapanır, sipariş açılır. Ödeme ve
// kargo adımlarının yetki kuralları — kim ödeyebilir, kim takip numarası
// girebilir — burada uygulanır ki hiçbir uç atlayamasın.

/**
 * Süresi dolmuş (kabul edilip bir saat içinde ödenmemiş) anlaşmaları
 * düşürür ve talebi yeniden sunuma açar.
 *
 * Zamanlanmış bir iş yok; temizlik anlaşmalara HER dokunuşta yapılıyor.
 * Böylece kural, arka planda çalışan bir servise bağlı kalmadan her
 * okuma ve yazmada aynı sonucu veriyor.
 */
/**
 * Alıcının 2 gün içinde yanıtlamadığı sunumları düşürür.
 * Kuyruk içinden çağrılır; sunum okumalarının başında çalışır ki hem
 * satıcı hem alıcı aynı gerçeği görsün.
 */
/**
 * Alıcının yanıtsız bıraktığı sunumları düşürür ve DÜŞENLERİ DÖNDÜRÜR.
 *
 * Dönüş değeri bildirimler için: satıcının sunumu sessizce "süresi doldu"
 * oluyordu, haber ancak Profilim'e girip bakarsa alınıyordu. Bildirim
 * burada gönderilemez — bu iş yazma kuyruğunun içinde çalışıyor,
 * `bildirimEkle` de kuyruğa girdiği için kilitlenirdi (aynı desen:
 * `otomatikOnaylar`). Çağıran taraf kuyruk dışında `sunumSuresiBildirimleri`
 * ile halleder.
 */
async function yanitsizSunumlariDusur(): Promise<GelenSunum[]> {
  const hepsi = await oku<GelenSunum>(SUNUM_DOSYA);
  const dolanlar = hepsi.filter((s) => sunumSuresiDolduMu(s));
  if (!dolanlar.length) return [];

  await yaz(
    SUNUM_DOSYA,
    hepsi.map((s) =>
      dolanlar.some((d) => d.id === s.id)
        ? { ...s, sonuc: "suresi-doldu" as const }
        : s,
    ),
  );

  // Düşen sunumlar talebin sunum sayacından da çıkar.
  for (const talepId of new Set(dolanlar.map((d) => d.talepId))) {
    await sunumSayisiTazele(talepId);
  }
  return dolanlar;
}

/** Süresi dolan sunumlar için satıcıya bildirim. Kuyruk DIŞINDA çağrılır. */
async function sunumSuresiBildirimleri(dusenler: GelenSunum[]): Promise<void> {
  for (const s of dusenler) {
    await bildirimEkle({
      id: kimlik(),
      kime: s.satici,
      grup: "Bugün",
      tip: "sistem",
      harf: "BB",
      avatar: "bg-subtle text-ink-500",
      text: "Sunumun yanıtsız kaldı ve süresi doldu.",
      sub: "Alıcı süresinde karar vermedi; talep hâlâ açıksa yeniden sunum yapabilirsin.",
      zaman: "az önce",
      href: "/profil?tab=sunumlar",
      yeni: true,
    }).catch(() => undefined);
  }
}

async function suresiDolanlariDusur(): Promise<Anlasma[]> {
  const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
  const dolanlar = hepsi.filter((a) => odemeSuresiDoldu(a));
  if (!dolanlar.length) return [];

  await yaz(
    ANLASMA_DOSYA,
    hepsi.filter((a) => !dolanlar.some((d) => d.sunumId === a.sunumId)),
  );

  // Kabul geçersiz sayılır: sunum "iptal" olur, satıcı gerekirse yeniden
  // sunum yapabilir.
  const sunumlar = await oku<GelenSunum>(SUNUM_DOSYA);
  await yaz(
    SUNUM_DOSYA,
    sunumlar.map((s) =>
      dolanlar.some((d) => d.sunumId === s.id)
        ? { ...s, sonuc: "iptal" as const }
        : s,
    ),
  );

  // Talep yeniden herkese açılır.
  const talepler = await oku<Talep>(TALEP_DOSYA);
  await yaz(
    TALEP_DOSYA,
    talepler.map((t) =>
      dolanlar.some((d) => d.talepId === t.id)
        ? { ...t, kapandi: undefined }
        : t,
    ),
  );

  // İptal olan sunumlar artık açık değil; sayaçlar düşsün.
  for (const talepId of new Set(dolanlar.map((d) => d.talepId))) {
    await sunumSayisiTazele(talepId);
  }

  // Kusur kaydı kuyruk dışında yazılır (bkz. anlasmalariTazele).
  return dolanlar;
}

/**
 * Satıcının kargo süresini kaçırdığı siparişleri iptal eder ve iptal edilen
 * kayıtları döndürür.
 *
 * Yardım sayfasındaki taahhüt buydu ama karşılığı yoktu: süre dolduğunda
 * yalnızca sayaç sıfırlanıyor, sipariş sonsuza kadar "kargo bekleniyor"da
 * kalıyordu. Ödeme süresi için `suresiDolanlariDusur` ne yapıyorsa burada da
 * aynısı yapılır — anlaşma düşer, sunum "iptal" olur, talep yeniden sunuma
 * açılır. Alıcının ödemesi havuzda tutulduğu için anlaşmanın düşmesi
 * iadenin kendisidir; gerçek ödeme sağlayıcısı bağlandığında iade çağrısı
 * da buraya gelir.
 *
 * Bildirim BURADA gönderilmez: bu iş yazma kuyruğunun içinde çalışıyor,
 * `bildirimEkle` de kuyruğa girdiği için kilitlenirdi. Çağıran taraf
 * döndürülen listeyi alıp kuyruk dışında haber verir.
 */
async function kargoGecikenleriDusur(): Promise<Anlasma[]> {
  const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
  const gecikenler = hepsi.filter((a) => kargoSuresiDoldu(a));
  if (!gecikenler.length) return [];

  await yaz(
    ANLASMA_DOSYA,
    hepsi.filter((a) => !gecikenler.some((g) => g.sunumId === a.sunumId)),
  );

  const sunumlar = await oku<GelenSunum>(SUNUM_DOSYA);
  await yaz(
    SUNUM_DOSYA,
    sunumlar.map((s) =>
      gecikenler.some((g) => g.sunumId === s.id)
        ? { ...s, sonuc: "iptal" as const }
        : s,
    ),
  );

  const talepler = await oku<Talep>(TALEP_DOSYA);
  await yaz(
    TALEP_DOSYA,
    talepler.map((t) =>
      gecikenler.some((g) => g.talepId === t.id)
        ? { ...t, kapandi: undefined }
        : t,
    ),
  );

  for (const talepId of new Set(gecikenler.map((g) => g.talepId))) {
    await sunumSayisiTazele(talepId);
  }

  return gecikenler;
}

/**
 * Satıcı lehine kapanan bir alışverişin para kaydını oluşturur.
 *
 * İtiraz "satıcı haklı" ile bittiğinde ürün alıcıda kalır ve bedelini o
 * öder — yani alışveriş tamamlanmıştır. Bu kayıt eksikti: para kaydı
 * yalnızca alıcının onay verdiği yoldan oluşuyordu, dolayısıyla satıcı
 * haklı çıksa bile parası ne alıcıya dönüyor ne kendi bakiyesine geçiyordu;
 * havuzda asılı kalıyordu.
 *
 * `islemEkle` sipariş başına tek kayda izin verdiği için tekrar çağrılması
 * zararsızdır. Kuyruk DIŞINDAN çağrılmalı.
 */
export async function saticiLehineOdemeKaydet(
  a: Anlasma,
  zamanIso: string,
): Promise<void> {
  const [sunumlar, talepler] = await Promise.all([
    oku<GelenSunum>(SUNUM_DOSYA),
    oku<Talep>(TALEP_DOSYA),
  ]);
  const sunum = sunumlar.find((s) => s.id === a.sunumId);
  if (!sunum) return;
  const talep = talepler.find((t) => t.id === a.talepId);
  await islemEkle(islemOlustur(a, sunum, talep, zamanIso)).catch(
    () => undefined,
  );
}

/**
 * "Alıcı haklı" kararına rağmen ürünü süresinde iade kargosuna vermeyen
 * siparişleri satıcı lehine kapatır ve kapatılanları döndürür.
 *
 * Süre hesaplanıp ekranda gösteriliyordu ama sonucu yoktu: alıcı ürünü
 * göndermezse hem ürün hem para onda kalıyor, satıcının yapabileceği bir
 * şey olmuyordu. Üstelik itiraz kapanmadığı için ilan da kalıcı olarak
 * kilitleniyordu — ne silinebiliyor ne yeni siparişe dönebiliyordu.
 *
 * Para kaydı ve bildirimler kuyruk dışında yapılır (bkz. otomatikOnaylar).
 */
async function iadeKargosuGecikenler(): Promise<Anlasma[]> {
  const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
  const gecikenler = hepsi.filter((a) => iadeKargoSuresiDoldu(a));
  if (!gecikenler.length) return [];

  const simdi = new Date().toISOString();
  const kapananlar = gecikenler.map((a) => ({
    ...a,
    iade: { ...(a.iade ?? {}), kargoSuresiAsildi: simdi },
  }));

  await yaz(
    ANLASMA_DOSYA,
    hepsi.map((a) => kapananlar.find((k) => k.sunumId === a.sunumId) ?? a),
  );
  return kapananlar;
}

/** İade kargosu gelmediği için kapanan siparişlerin para ve bildirim işi. */
async function iadeGecikmeSonrasi(kapananlar: Anlasma[]): Promise<void> {
  for (const a of kapananlar) {
    const zaman = a.iade?.kargoSuresiAsildi ?? new Date().toISOString();
    await saticiLehineOdemeKaydet(a, zaman);

    for (const kime of [a.alici, a.satici]) {
      await bildirimEkle({
        id: kimlik(),
        kime,
        grup: "Bugün",
        tip: "sistem",
        harf: "BB",
        avatar: "bg-danger-soft text-danger",
        text: "İtiraz süreci kapandı: iade kargosu gönderilmedi.",
        sub:
          kime === a.alici
            ? "Ürünü süresinde iade kargosuna vermediğin için süreç satıcı lehine kapandı; ödeme satıcıya aktarıldı."
            : "Alıcı ürünü süresinde geri göndermedi; süreç lehine kapandı ve ödemen hesabına aktarılmak üzere işleme alındı.",
        zaman: "az önce",
        href: "/mesajlar",
        yeni: true,
      }).catch(() => undefined);
    }
  }
}

/**
 * 24 saatlik yanıt süresi dolan siparişleri OTOMATİK ONAYLAR ve onaylananları
 * döndürür.
 *
 * Neden gerekli: para, alıcı onaylayana kadar havuzda tutuluyor. Alıcı hiç
 * yanıt vermezse satıcı ne parasını ne ürününü alır ve sipariş süresiz asılı
 * kalır. Kargo firmasının teslim bildiriminden 24 saat sonra alışveriş
 * tamamlanmış sayılır.
 *
 * İşlem kaydı ve bildirimler BURADA yazılmaz: bu iş yazma kuyruğunun içinde
 * çalışıyor, `islemEkle` ve `bildirimEkle` de kuyruğa girdiği için
 * kilitlenirdi. Çağıran taraf döndürülen listeyle ikisini de kuyruk dışında
 * halleder.
 */
async function otomatikOnaylar(): Promise<Anlasma[]> {
  const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
  const dolanlar = hepsi.filter((a) => aliciOnaySuresiDoldu(a));
  if (!dolanlar.length) return [];

  const simdi = new Date().toISOString();
  const onaylananlar = dolanlar.map((a) => ({
    ...a,
    onay: "evet" as const,
    onayZamani: simdi,
    /** Onayın alıcıdan değil süre aşımından geldiğinin damgası. */
    otomatikOnay: true as const,
  }));

  await yaz(
    ANLASMA_DOSYA,
    hepsi.map((a) => onaylananlar.find((o) => o.sunumId === a.sunumId) ?? a),
  );
  return onaylananlar;
}

/**
 * Otomatik onaylanan siparişleri işleme çevirir ve iki tarafa bildirir.
 * Kuyruk dışında çağrılır (bkz. otomatikOnaylar).
 */
async function otomatikOnaySonrasi(onaylananlar: Anlasma[]): Promise<void> {
  if (!onaylananlar.length) return;
  const [sunumlar, talepler] = await Promise.all([
    oku<GelenSunum>(SUNUM_DOSYA),
    oku<Talep>(TALEP_DOSYA),
  ]);

  for (const a of onaylananlar) {
    // Para kaydı: onay yolundakiyle aynı işlem kaydı oluşur.
    const sunum = sunumlar.find((s) => s.id === a.sunumId);
    if (sunum) {
      const talep = talepler.find((t) => t.id === a.talepId);
      await islemEkle(islemOlustur(a, sunum, talep)).catch(() => undefined);
    }

    for (const kime of [a.alici, a.satici]) {
      await bildirimEkle({
        id: kimlik(),
        kime,
        grup: "Bugün",
        tip: "sistem",
        harf: "BB",
        avatar: "bg-accent-soft text-accent-ink",
        text: "Alışveriş otomatik onaylandı.",
        sub:
          kime === a.alici
            ? "Teslimden sonraki 24 saat içinde yanıt gelmediği için sipariş tamamlandı ve ödeme satıcıya aktarıldı."
            : "Alıcı süresinde yanıt vermedi; sipariş tamamlandı ve ödemen hesabına aktarılmak üzere işleme alındı.",
        zaman: "az önce",
        href: "/mesajlar",
        yeni: true,
      }).catch(() => undefined);
    }
  }
}

/**
 * Ödeme süresi dolduğu için düşen anlaşmaları iki tarafa da bildirir.
 *
 * Bu bildirim HİÇ YOKTU: anlaşma sessizce siliniyor, sunum "iptal" oluyor
 * ve talep yeniden yayına açılıyordu. Satıcı sohbette "Anlaşıldı ✓" görüp
 * ödeme bekliyor, bir süre sonra kayıt ortadan kayboluyor ve nedenini
 * söyleyen hiçbir şey olmuyordu. Kargo gecikmesi yolu (`gecikmeBildirimleri`)
 * aynı desende zaten bildiriyordu; iki yol artık aynı davranıyor.
 */
async function odemeSuresiBildirimleri(iptaller: Anlasma[]): Promise<void> {
  for (const a of iptaller) {
    for (const kime of [a.alici, a.satici]) {
      await bildirimEkle({
        id: kimlik(),
        kime,
        grup: "Bugün",
        tip: "sistem",
        harf: "BB",
        avatar: "bg-danger-soft text-danger",
        text: "Anlaşma düştü: ödeme süresi doldu.",
        sub:
          kime === a.alici
            ? "Kabul edilen teklifin ödemesi süresinde yapılmadı; talebin yeniden yayında."
            : "Alıcı süresinde ödemedi; sunumun düştü. Talep hâlâ açıksa yeniden sunum yapabilirsin.",
        zaman: "az önce",
        href: "/mesajlar",
        yeni: true,
      }).catch(() => undefined);
    }
  }
}

/**
 * Sohbete gelen mesajı karşı tarafa bildirir.
 *
 * BU BİLDİRİM HİÇ YOKTU: Ayarlar'da "Mesajlar" satırı duruyor, tercih
 * sunucuya kaydediliyor ama mesaj geldiğinde ne bildirim yazılıyor ne de o
 * tercih okunuyordu. Zil hiç çalmıyordu.
 *
 * Teklif taşıyan mesaj ayrı tür: para konuşan bir mesaj akışın parçasıdır,
 * kapatılamaz (bkz. KAPATILAMAZ).
 *
 * SEL BASKINI KORUMASI: her bildirim e-posta kuyruğuna da giriyor. Aynı
 * sohbet için OKUNMAMIŞ bir mesaj bildirimi dururken ikincisi yazılmaz —
 * arka arkaya on mesaj atan kullanıcı karşı tarafa on e-posta göndermez.
 * Teklif bildirimi bu kısıttan muaftır; tutar değişimi kaçırılmamalı.
 */
export async function mesajBildirimiGonder(opts: {
  kime: string;
  gonderen: string;
  sohbetId: string;
  metin: string;
  tutar?: number;
}): Promise<void> {
  const href = `/mesajlar?sohbet=${encodeURIComponent(opts.sohbetId)}`;
  const teklif = typeof opts.tutar === "number";

  if (!teklif) {
    const hepsi = await oku<Bildirim>(BILDIRIM_DOSYA);
    const bekleyen = hepsi.some(
      (b) =>
        b.kime === opts.kime && b.tip === "mesaj" && b.yeni && b.href === href,
    );
    if (bekleyen) return;
  }

  await bildirimEkle({
    id: kimlik(),
    kime: opts.kime,
    grup: "Bugün",
    tip: teklif ? "teklif" : "mesaj",
    harf: harfFor(opts.gonderen),
    avatar: teklif
      ? "bg-primary-soft text-primary-hover"
      : "bg-subtle text-ink-700",
    text: teklif
      ? `${opts.gonderen} teklif verdi: ${fiyatText(opts.tutar!)}`
      : `${opts.gonderen} sana mesaj gönderdi.`,
    sub: opts.metin.slice(0, 120) || "Sohbetten yanıtla.",
    zaman: "az önce",
    href,
    yeni: true,
  }).catch(() => undefined);
}

/** Kargo süresi kaçırıldığı için düşen siparişleri iki tarafa da bildirir. */
async function gecikmeBildirimleri(iptaller: Anlasma[]): Promise<void> {
  for (const a of iptaller) {
    for (const kime of [a.alici, a.satici]) {
      await bildirimEkle({
        id: kimlik(),
        kime,
        grup: "Bugün",
        tip: "sistem",
        harf: "BB",
        avatar: "bg-danger-soft text-danger",
        text: "Sipariş iptal edildi: kargo süresi aşıldı.",
        sub:
          kime === a.alici
            ? "Satıcı süresinde kargoya vermedi; ödemen iade edildi ve talebin yeniden yayında."
            : `Vaat ettiğin ${a.kargoSaat} saatlik kargo süresi doldu; sipariş iptal edildi.`,
        zaman: "az önce",
        href: "/mesajlar",
        yeni: true,
      }).catch(() => undefined);
    }
  }
}

/**
 * Yolda görünen gönderilerin durumunu firmaya sorar; teslim edilmişse
 * kaydeder. Firma için canlı sorgulama tanımlı değilse hiçbir şey yapmaz —
 * o firmalarda teslim bilgisi webhook'tan gelir.
 */
async function teslimleriTazele(): Promise<Anlasma[]> {
  const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
  const yoldakiler = hepsi.filter((a) => a.kargoZamani && !a.teslimZamani);
  if (!yoldakiler.length) return [];

  const durumlar = await Promise.all(
    yoldakiler.map((a) =>
      kargoDurumuSorgula(a.kargoFirma ?? "", a.takipNo ?? ""),
    ),
  );
  const teslimEdilenler = yoldakiler.filter(
    (_, i) => durumlar[i] === "teslim-edildi",
  );
  if (!teslimEdilenler.length) return [];

  const simdi = new Date().toISOString();
  const guncel = hepsi.map((a) =>
    teslimEdilenler.some((t) => t.sunumId === a.sunumId)
      ? { ...a, teslimZamani: simdi }
      : a,
  );
  await yaz(ANLASMA_DOSYA, guncel);
  // Bildirim kuyruk dışında gönderilir; damgalı hâlleri döndürüyoruz.
  return guncel.filter((a) =>
    teslimEdilenler.some((t) => t.sunumId === a.sunumId),
  );
}

/**
 * "Kargon teslim edildi" bildirimi — TESLİMİN İKİ YOLU İÇİN DE.
 *
 * Bu metin yalnızca webhook ucunda yazılıydı; teslim bilgisi firmadan
 * SORGULAMAYLA geldiğinde alıcıya hiçbir şey söylenmiyordu. Oysa damga
 * 24 saatlik otomatik onay sayacını başlatıyor: alıcı haberi olmadan
 * süreye giriyor, süre dolunca para satıcıya aktarılıyordu. Metin ortak
 * bir yerde durursa iki yol da aynı şeyi söyler.
 */
export async function teslimBildirimiGonder(a: Anlasma): Promise<void> {
  await bildirimEkle({
    id: kimlik(),
    kime: a.alici,
    grup: "Bugün",
    tip: "kargo",
    harf: harfFor(a.satici),
    avatar: "bg-accent-soft text-accent-ink",
    text: "Kargon teslim edildi.",
    sub: "Ürün anlatıldığı gibi mi? Sohbetten yanıtla.",
    zaman: "Az önce",
    href: "/mesajlar",
    yeni: true,
  }).catch(() => undefined);
}

/**
 * İtiraz/iade sürecinde bir adımı işler. Sıra dışı çağrılar reddedilir:
 * ürün kargolanmadan satıcı teslim onayı veremez, teslim onayı gelmeden
 * para iadesi işlenemez.
 */
export async function iadeAdimiIsle(
  sunumId: string,
  isteyen: string,
  islem:
    | { adim: "karar"; karar: "alici-hakli" | "satici-hakli" }
    // "kargo" adımı BURADA DEĞİL: iade gönderisini de sistem oluşturur ve
    // satıcının adresi alıcıya gösterilmez (bkz. gonderiHazirla).
    | { adim: "kargo-teslim" }
    | { adim: "satici-onay"; onay: "evet" | "hayir"; aciklama?: string }
    | { adim: "ikinci-karar"; karar: "iade" | "ret" }
    | { adim: "teslim" }
    | { adim: "odeme" },
): Promise<Anlasma | "bulunamadi" | "yetkisiz" | "sira-disi" | "itiraz-yok"> {
  return sirala(async () => {
    const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
    const i = hepsi.findIndex((a) => a.sunumId === sunumId);
    if (i === -1) return "bulunamadi" as const;

    const a = hepsi[i];
    if (a.onay !== "hayir") return "itiraz-yok" as const;

    const adim = iadeAdimi(a);
    const iade = { ...(a.iade ?? {}) };
    const simdi = new Date().toISOString();

    if (islem.adim === "karar") {
      // Kararı yalnızca destek ekibi verir (bkz. lib/roller.ts).
      if (!destekYetkisi(isteyen)) return "yetkisiz" as const;
      if (adim !== "inceleme") return "sira-disi" as const;
      iade.karar = islem.karar;
      iade.kararZamani = simdi;
    } else if (islem.adim === "kargo-teslim") {
      // Kargo firmasının teslim bildirimi — taraflar çağırmaz.
      if (adim !== "iade-kargoda") return "sira-disi" as const;
      iade.kargoTeslimZamani = simdi;
    } else if (islem.adim === "satici-onay") {
      if (isteyen !== a.satici) return "yetkisiz" as const;
      if (adim !== "satici-onayi-bekleniyor") return "sira-disi" as const;
      iade.saticiOnay = islem.onay;
      iade.saticiOnayZamani = simdi;
      if (islem.onay === "hayir") iade.karsiItiraz = islem.aciklama ?? "";
    } else if (islem.adim === "ikinci-karar") {
      // Karşı itirazı destek ekibi sonuçlandırır.
      if (!destekYetkisi(isteyen)) return "yetkisiz" as const;
      if (adim !== "karsi-itiraz") return "sira-disi" as const;
      iade.ikinciKarar = islem.karar;
      iade.ikinciKararZamani = simdi;
    } else if (islem.adim === "teslim") {
      // Eski akış (tek adımlı teslim onayı) — geriye dönük uyumluluk.
      if (isteyen !== a.satici) return "yetkisiz" as const;
      if (adim !== "satici-onayi-bekleniyor") return "sira-disi" as const;
      iade.saticiOnay = "evet";
      iade.saticiOnayZamani = simdi;
    } else {
      // Para iadesi havuzdan yapılır: yalnızca destek/sistem işler.
      if (!destekYetkisi(isteyen)) return "yetkisiz" as const;
      if (adim !== "para-iadesi-bekleniyor") return "sira-disi" as const;
      iade.iadeZamani = simdi;
    }

    hepsi[i] = { ...a, iade };
    await yaz(ANLASMA_DOSYA, hepsi);
    return hepsi[i];
  });
}

/**
 * Zaman aşımı temizliğinin tamamı. Anlaşmalara her dokunuşta çalışır;
 * zamanlanmış bir işe bağlı kalmadan kural her okumada aynı sonucu verir.
 * Kargo gecikmesi bildirimleri kuyruk dışında gönderilir.
 */
/**
 * Sipariş kodu olmayan kayıtlara kod atar.
 *
 * Kod, alan eklenmeden önce açılmış siparişlerde yok; kodsuz bir sipariş
 * için gönderi oluşturulamaz, yani satıcı ürünü hiç kargolayamaz. Ayrı
 * bir göç betiği yerine temizleyici olması bilinçli: `anlasmalariTazele`
 * ile aynı desen — maliyet çağrılara dağılır, arka planda çalışan bir
 * servise bağımlılık doğmaz ve iş idempotenttir.
 */
async function siparisKodlariniTamamla(): Promise<void> {
  const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
  if (hepsi.every((a) => a.siparisKodu)) return;

  const kullanilan = hepsi.map((a) => a.siparisKodu ?? "").filter(Boolean);
  const guncel = hepsi.map((a) => {
    if (a.siparisKodu) return a;
    const kod = siparisKoduUret(kullanilan);
    kullanilan.push(kod);
    return { ...a, siparisKodu: kod };
  });
  await yaz(ANLASMA_DOSYA, guncel);
}

async function anlasmalariTazele(): Promise<void> {
  await sirala(siparisKodlariniTamamla);
  const odenmeyenler = await sirala(suresiDolanlariDusur);
  const gecikenler = await sirala(kargoGecikenleriDusur);
  // Teslim bilgisi ÖNCE tazelenir: 24 saatlik onay sayacı `teslimZamani`'den
  // işlediği için, sayacın başlaması bu adıma bağlı.
  const teslimEdilenler = await sirala(teslimleriTazele);
  const otomatikler = await sirala(otomatikOnaylar);
  const iadeGecikenler = await sirala(iadeKargosuGecikenler);
  if (odenmeyenler.length) await odemeSuresiBildirimleri(odenmeyenler);
  for (const a of teslimEdilenler) await teslimBildirimiGonder(a);
  if (gecikenler.length) await gecikmeBildirimleri(gecikenler);
  if (otomatikler.length) await otomatikOnaySonrasi(otomatikler);
  if (iadeGecikenler.length) await iadeGecikmeSonrasi(iadeGecikenler);

  // Kusur kayıtları — kuyruk dışında, `iptalKaydet` sipariş başına tek
  // kayda izin verdiği için tekrar çalışması zararsız.
  for (const a of odenmeyenler) await iptalKaydet(a, "odeme-yapilmadi");
  for (const a of gecikenler) await iptalKaydet(a, "kargolanmadi");
  for (const a of iadeGecikenler) await iptalKaydet(a, "iade-edilmedi");
}

export async function anlasmalarOku(): Promise<Anlasma[]> {
  await anlasmalariTazele();
  return oku<Anlasma>(ANLASMA_DOSYA);
}

export async function anlasmaGetir(
  sunumId: string,
): Promise<Anlasma | undefined> {
  await anlasmalariTazele();
  const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
  return hepsi.find((a) => a.sunumId === sunumId);
}

/**
 * Anlaşılan tutarı SOHBETTEN okur.
 *
 * Kabul eden tarafın beyanına güvenilmez: tutar bir dönem doğrudan istek
 * gövdesinden alınıyordu, yani 77.777 TL'lik bir sunum `{tutar: 1}` ile
 * siparişe çevrilebiliyordu. Tutar, komisyon → bakiye → IBAN aktarımı
 * zincirinin başı olduğu için kayıttan türetilmeli.
 *
 * Kural: **karşı tarafın son teklifi.** Kendi teklifini kabul eden biri
 * fiyatı tek taraflı belirlemiş olurdu; bu yüzden `isteyen`in kendi
 * gönderdiği teklifler sayılmaz. Hiç teklif konuşulmamışsa sunumun ilan
 * fiyatı geçerlidir — o da satıcının kendi beyanıdır, alıcı onu görerek
 * kabul eder.
 */
async function anlasilanTutar(
  sunum: GelenSunum,
  isteyen: string,
): Promise<number> {
  const mesajlar = await oku<Mesaj>(MESAJ_DOSYA);
  const sohbetId = `sunum-${sunum.id}`;
  const karsiTeklifler = mesajlar
    .filter(
      (m) =>
        m.sohbetId === sohbetId &&
        m.gonderen !== isteyen &&
        typeof m.tutar === "number" &&
        m.tutar > 0,
    )
    .sort((a, b) => a.zaman.localeCompare(b.zaman));

  const son = karsiTeklifler.at(-1);
  const ham = son?.tutar ?? sunum.fiyatNum;

  // Uçlar artık kesirli tutar kabul etmiyor ama BURASI paranın karara
  // bağlandığı yer; kayıttan okuduğuna da körü körüne güvenmemeli. Eski
  // kayıtlarda kesirli değerler var ve onlar komisyon → bakiye → IBAN
  // zincirine sızıyordu (3333.3333 TL ekranda "3.333,333 TL" görünüyordu).
  return paraTutari(ham) ?? Math.max(1, Math.round(ham) || 1);
}

/**
 * Teklifi kabul eder: sunumu "kabul" olarak işaretler ve siparişi açar.
 * Kabulü iki taraf da verebilir (satıcı, alıcının karşı teklifini kabul
 * edebilir); ama sohbetin tarafı olmayan biri veremez.
 *
 * Tutar PARAMETRE DEĞİLDİR — sohbetten türetilir (bkz. anlasilanTutar).
 */
export async function anlasmaOlustur(
  sunumId: string,
  isteyen: string,
): Promise<
  Anlasma | "bulunamadi" | "yetkisiz" | "zaten-var" | "talepte-suren-siparis"
> {
  return sirala(async () => {
    const sunumlar = await oku<GelenSunum>(SUNUM_DOSYA);
    const i = sunumlar.findIndex((s) => s.id === sunumId);
    if (i === -1) return "bulunamadi" as const;
    const sunum = sunumlar[i];

    const talepler = await oku<Talep>(TALEP_DOSYA);
    const talep = talepler.find((t) => t.id === sunum.talepId);
    if (!talep) return "bulunamadi" as const;
    if (isteyen !== talep.sahibi && isteyen !== sunum.satici)
      return "yetkisiz" as const;

    const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
    if (hepsi.some((a) => a.sunumId === sunumId)) return "zaten-var" as const;

    // Bir ilana bir sipariş. Kontrol yalnızca sunum başına yapılıyordu, yani
    // alıcı aynı talebe gelen iki farklı sunumu birden kabul edip iki sipariş
    // açabiliyordu. Biten siparişler engellemez: talep yeniden yayına
    // alınmışsa yeni bir alışverişe dönüşebilmeli.
    if (hepsi.some((a) => a.talepId === sunum.talepId && siparisSuruyor(a)))
      return "talepte-suren-siparis" as const;

    const tutar = await anlasilanTutar(sunum, isteyen);

    const anlasma: Anlasma = {
      sunumId,
      talepId: sunum.talepId,
      alici: talep.sahibi,
      satici: sunum.satici,
      tutar,
      // Sipariş kodu kilidin İÇİNDE ve mevcutlara bakılarak üretilir.
      // Çakışmanın bedeli burada kozmetik değil: iki sipariş aynı kodu
      // alırsa kargo görevlisinin ekranına yanlış adres gelir.
      siparisKodu: siparisKoduUret(
        hepsi.map((a) => a.siparisKodu ?? "").filter(Boolean),
      ),
      kabulEden: isteyen,
      kabulZamani: new Date().toISOString(),
      // Sayacın uzunluğu satıcının kendi vaadidir; sonradan değişemez.
      kargoSaat: kargoSaatiCoz(sunum.teslim ?? ""),
      // Kargo firması da öyle: sunumda beyan edildiyse gönderi o firmada
      // oluşturulur. Alıcı sunumu seçerken hangi firmayla geleceğini
      // biliyordu; satıcının sonradan başka bir firmaya kayması, alıcının
      // karar verdiği koşulu tek taraflı değiştirmek olurdu.
      kargoFirma: sunum.kargoFirma,
    };
    await yaz(ANLASMA_DOSYA, [...hepsi, anlasma]);

    // Kabul edilen sunum dışındakiler de KAPANIR.
    //
    // Eskiden dokunulmuyordu: ilan kapandığı hâlde diğer satıcılar iki gün
    // daha "beklemede" görüyor, ürünlerini kenarda tutuyorlardı. İki gün
    // sonra da yanlış gerekçe düşüyordu ("alıcı 2 gün içinde yanıt vermedi")
    // — oysa alıcı yanıt vermişti, başkasını seçmişti.
    //
    // "red" değil ayrı bir durum: reddedilmek, alıcının o sunuma bakıp hayır
    // demesidir; burada tercih başkasına gitti.
    sunumlar[i] = { ...sunum, sonuc: "kabul" };
    for (let j = 0; j < sunumlar.length; j++) {
      if (j === i) continue;
      if (sunumlar[j].talepId !== sunum.talepId) continue;
      if (!sunumAcikMi(sunumlar[j])) continue;
      sunumlar[j] = { ...sunumlar[j], sonuc: "kapandi" };
    }
    await yaz(SUNUM_DOSYA, sunumlar);
    await talebiKapat(sunum.talepId);
    return anlasma;
  });
}

/**
 * Ödemeyi kaydeder — sayaç bu andan itibaren işler.
 * PROTOTİP: gerçek sistemde bu fonksiyonu ödeme sağlayıcısının webhook'u
 * çağırmalı; alıcının tarayıcısından gelen istek ödeme kanıtı değildir.
 */
export async function odemeIsaretle(
  sunumId: string,
  isteyen: string,
): Promise<
  Anlasma | "bulunamadi" | "yetkisiz" | "zaten-odendi" | "sure-doldu"
> {
  // Süresi dolmuş kayıtlar önce düşsün; ödeme yolu da temizlik yapan
  // noktalardan biri (kuyruk dışında çağrılır, kilitlenmesin). Burada
  // düşen bir anlaşma varsa taraflar da haberdar edilir — temizliğin
  // hangi kapıdan geçtiği kullanıcıyı ilgilendirmiyor.
  await odemeSuresiBildirimleri(await sirala(suresiDolanlariDusur));
  return sirala(async () => {
    const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
    const i = hepsi.findIndex((a) => a.sunumId === sunumId);
    if (i === -1) return "bulunamadi" as const;
    // Ödemeyi yalnızca alıcı yapar.
    if (hepsi[i].alici !== isteyen) return "yetkisiz" as const;
    if (hepsi[i].odemeZamani) return "zaten-odendi" as const;
    // Bir saatlik pencere kapandıysa ödeme kabul edilmez; kayıt zaten
    // bir sonraki temizlikte düşecek.
    if (odemeSuresiDoldu(hepsi[i])) return "sure-doldu" as const;

    hepsi[i] = { ...hepsi[i], odemeZamani: new Date().toISOString() };
    await yaz(ANLASMA_DOSYA, hepsi);
    return hepsi[i];
  });
}

/**
 * Kargo firmasında GÖNDERİ OLUŞTURUR ve kaydı anlaşmaya yazar.
 *
 * `kargoBilgisiKaydet` bunun yerini aldı. Eski işleyiş şuydu: satıcı
 * ekranda alıcının tam adresini görüyor, ürünü kendisi kargoluyor ve
 * takip numarasını ELLE giriyordu. İki sorun birden vardı — alıcının
 * kapı numarası karşı tarafın tarayıcısına iniyordu ve takip numarası
 * doğrulanmamış bir beyandı (satıcı uydurma bir numara girebilirdi).
 *
 * Artık adresi yalnızca sunucu görür ve yalnızca kargo firmasına verir;
 * satıcının eline geçen tek şey sipariş kodudur. Takip numarası da
 * firmadan gelir (bkz. lib/kargo-gonderi.ts).
 *
 * Fonksiyon iki yönü de yürütür: `"gidis"` satıcı→alıcı, `"iade"`
 * alıcı→satıcı. İkisi de aynı kuralı uygular, yalnızca yetki ve adres
 * kaynağı ters döner.
 */
export async function gonderiHazirla(
  sunumId: string,
  isteyen: string,
  firma: string,
  yon: GonderiYonu,
  /** Sağlayıcı bağlı değilken gönderenin elle girdiği takip numarası. */
  elleTakipNo?: string,
): Promise<
  | Anlasma
  | "bulunamadi"
  | "yetkisiz"
  | "odeme-bekleniyor"
  | "sira-disi"
  | "zaten-var"
  | "adres-yok"
  | "kod-yok"
  | "saglayici-yok"
  | "saglayici-hatasi"
> {
  // 1) OKUMA VE YETKİ. Adres burada okunur ve BU FONKSİYONDAN ÇIKMAZ:
  //    yalnızca sağlayıcıya verilir, dönen kayda yazılmaz.
  const hazirlik = await sirala(async () => {
    const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
    const a = hepsi.find((x) => x.sunumId === sunumId);
    if (!a) return "bulunamadi" as const;
    if (!a.siparisKodu) return "kod-yok" as const;

    if (yon === "gidis") {
      if (a.satici !== isteyen) return "yetkisiz" as const;
      if (!a.odemeZamani) return "odeme-bekleniyor" as const;
      if (a.gonderi) return "zaten-var" as const;
      const adres = (await oku<TeslimatAdresi>(TESLIMAT_DOSYA)).find(
        (t) => t.talepId === a.talepId,
      );
      if (!adres) return "adres-yok" as const;
      return {
        istek: {
          siparisKodu: a.siparisKodu,
          yon,
          aliciAdi: getKullanici(a.alici)?.ad ?? a.alici,
          adres,
        },
        // Sunumda beyan edilen firma — varsa seçim değiştirilemez.
        bagliFirma: a.kargoFirma ?? "",
      };
    }

    // İade yönü: gönderen ALICI, hedef satıcının kayıtlı adresi.
    if (a.alici !== isteyen) return "yetkisiz" as const;
    if (iadeAdimi(a) !== "iade-kargosu-bekleniyor") return "sira-disi" as const;
    if (a.iade?.gonderi) return "zaten-var" as const;
    const kendi = (await oku<KayitliAdres>(ADRES_DOSYA)).filter(
      (x) => x.kullanici === a.satici,
    );
    const secili = kendi.find((x) => x.varsayilan) ?? kendi[0];
    if (!secili) return "adres-yok" as const;
    return {
      istek: {
        siparisKodu: a.siparisKodu,
        yon,
        aliciAdi: getKullanici(a.satici)?.ad ?? a.satici,
        adres: {
          talepId: a.talepId,
          alici: a.satici,
          il: secili.il,
          ilce: secili.ilce,
          mahalle: secili.mahalle,
          cadde: secili.cadde,
          apartman: secili.apartman ?? "",
          kat: secili.kat ?? "",
          daire: secili.daire ?? "",
          tarif: secili.tarif,
        },
      },
      // İade yönünde sunumdaki firma BAĞLAMAZ: o söz gidiş gönderisi için
      // verildi ve iadeyi gönderen taraf da farklı (alıcı).
      bagliFirma: "",
    };
  });
  if (typeof hazirlik === "string") return hazirlik;

  // 2) SAĞLAYICI ÇAĞRISI — kilidin DIŞINDA. Ağ çağrısı yazma kuyruğunu
  //    bekletmemeli; kuyruk tek şeritli olduğu için yavaş bir firma
  //    yanıtı bütün depoyu durdururdu.
  // Sunumda firma beyan edilmişse O BAĞLAYICIDIR; gövdeden gelen ad yok
  // sayılır. Aksi hâlde satıcı, alıcının gördüğü sunumdaki sözü sipariş
  // açıldıktan sonra tek taraflı değiştirebilirdi.
  const gonderi = await gonderiOlustur(
    hazirlik.bagliFirma || firma,
    hazirlik.istek,
    elleTakipNo,
  );
  if (typeof gonderi === "string") return gonderi;

  // 3) YAZMA — koşullar kilidin içinde YENİDEN doğrulanır. Arada geçen
  //    sürede sipariş düşmüş ya da başka bir gönderi oluşmuş olabilir.
  return sirala(async () => {
    const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
    const i = hepsi.findIndex((x) => x.sunumId === sunumId);
    if (i === -1) return "bulunamadi" as const;
    const a = hepsi[i];

    if (yon === "gidis") {
      if (a.satici !== isteyen) return "yetkisiz" as const;
      if (!a.odemeZamani) return "odeme-bekleniyor" as const;
      if (a.gonderi) return "zaten-var" as const;
      hepsi[i] = {
        ...a,
        gonderi,
        kargoFirma: gonderi.firma,
        // Takip numarası artık satıcının beyanı değil: firmanın döndüğü
        // gönderi numarası hem gönderiyi hem takibi tanımlar.
        takipNo: gonderi.gonderiNo,
        kargoZamani: gonderi.olusturuldu,
      };
    } else {
      if (a.alici !== isteyen) return "yetkisiz" as const;
      if (iadeAdimi(a) !== "iade-kargosu-bekleniyor")
        return "sira-disi" as const;
      if (a.iade?.gonderi) return "zaten-var" as const;
      hepsi[i] = {
        ...a,
        iade: {
          ...(a.iade ?? {}),
          gonderi,
          kargoFirma: gonderi.firma,
          takipNo: gonderi.gonderiNo,
          kargoZamani: gonderi.olusturuldu,
        },
      };
    }

    await yaz(ANLASMA_DOSYA, hepsi);
    return hepsi[i];
  });
}

/**
 * Kargonun teslim edildiğini kaydeder. Bilgi firmadan gelir: ya firma
 * webhook'u bu yolu çağırır ya da periyodik sorgulama teslim görür.
 * Aynı gönderi iki kez bildirilirse ilk zaman korunur.
 */
export async function teslimIsaretle(
  sunumId: string,
): Promise<
  | { durum: "isaretlendi"; anlasma: Anlasma }
  | { durum: "zaten-teslim"; anlasma: Anlasma }
  | "bulunamadi"
  | "kargoda-degil"
> {
  return sirala(async () => {
    const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
    const i = hepsi.findIndex((a) => a.sunumId === sunumId);
    if (i === -1) return "bulunamadi" as const;
    // Kargoya verilmemiş gönderi teslim edilmiş olamaz.
    if (!hepsi[i].kargoZamani) return "kargoda-degil" as const;

    // İLK ZAMAN KORUNUR ama çağıran taraf bunu BİLMELİ. Eskiden bu dal da
    // başarı gibi dönüyordu; uç ise her çağrıda alıcıya yeni bir "kargon
    // teslim edildi" bildirimi yazıyordu. Kargo firmasının webhook'u
    // yeniden denediğinde (ki normaldir) bildirim listesi doluyor ve her
    // biri e-posta kuyruğuna da giriyordu.
    if (hepsi[i].teslimZamani)
      return { durum: "zaten-teslim" as const, anlasma: hepsi[i] };

    hepsi[i] = { ...hepsi[i], teslimZamani: new Date().toISOString() };
    await yaz(ANLASMA_DOSYA, hepsi);
    return { durum: "isaretlendi" as const, anlasma: hepsi[i] };
  });
}

// ALICININ "ÜRÜNÜ TESLİM ALDIM" ADIMI KALDIRILDI.
//
// Burada `aliciTeslimIsaretle` vardı: kargo firması teslimi bildirdikten
// sonra alıcıdan ayrıca bir onay isteniyor, "ürün anlatıldığı gibi mi?"
// sorusu ancak ondan sonra açılıyordu. Adım hem gereksizdi (teslim
// bilgisi taşıyıcıdan geliyor) hem de kötüye kullanılabiliyordu: ürünü
// almış bir alıcı "almadım" diyerek süreci 24 saat bekletebiliyordu.
//
// Fonksiyonun ikinci bir işi daha vardı — firma bildirmediyse teslim
// damgasını alıcının beyanından basmak. O yol da kapandı; teslim damgası
// artık YALNIZCA taşıyıcıdan gelir (bkz. teslimIsaretle ve
// /api/anlasmalar/<sunumId>/teslim).

/**
 * Alıcının teslim sonrası yanıtını kaydeder ("ürün anlatıldığı gibi mi?").
 *
 * Yanıtı YALNIZCA alıcı verir ve yalnızca teslim damgası düştükten sonra.
 * Eskiden araya bir adım daha giriyordu ("ürünü teslim aldım"); o adım
 * kaldırıldı, artık teslim bilgisi gelir gelmez soru açılır.
 */
export async function onayKaydet(
  sunumId: string,
  isteyen: string,
  onay: "evet" | "hayir",
): Promise<
  Anlasma | "bulunamadi" | "yetkisiz" | "teslim-edilmedi" | "zaten-yanitlandi"
> {
  return sirala(async () => {
    const hepsi = await oku<Anlasma>(ANLASMA_DOSYA);
    const i = hepsi.findIndex((a) => a.sunumId === sunumId);
    if (i === -1) return "bulunamadi" as const;
    if (hepsi[i].alici !== isteyen) return "yetkisiz" as const;
    if (!hepsi[i].teslimZamani) return "teslim-edilmedi" as const;
    if (hepsi[i].onay) return "zaten-yanitlandi" as const;

    hepsi[i] = {
      ...hepsi[i],
      onay,
      onayZamani: new Date().toISOString(),
    };
    await yaz(ANLASMA_DOSYA, hepsi);
    return hepsi[i];
  });
}

// ── Düşen siparişler ──────────────────────────────────────────────────
// Kabul edilip sonuçlanmayan siparişlerin kusur kaydı. Sipariş kaydı
// silinse bile bu iz kalır; Kullanıcı Kalitesi'ndeki iptal sinyali
// buradan beslenir (bkz. lib/iptal.ts).

export async function iptallerOku(): Promise<Iptal[]> {
  return oku<Iptal>(IPTAL_DOSYA);
}

/**
 * İptali kaydeder. Sipariş başına TEK kayıt: aynı sipariş için ikinci çağrı
 * hiçbir şey yapmaz, böylece temizleyiciler her okumada tekrar çalışsa da
 * sayaç şişmez. Kuyruk DIŞINDAN çağrılmalı.
 */
export async function iptalKaydet(
  a: Pick<Anlasma, "sunumId" | "talepId" | "alici" | "satici">,
  sebep: IptalSebep,
): Promise<void> {
  await sirala(async () => {
    const hepsi = await oku<Iptal>(IPTAL_DOSYA);
    if (hepsi.some((i) => i.sunumId === a.sunumId)) return;
    const kayit: Iptal = {
      sunumId: a.sunumId,
      talepId: a.talepId,
      alici: a.alici,
      satici: a.satici,
      kusur: KUSUR[sebep],
      sebep,
      zaman: new Date().toISOString(),
    };
    await yaz(IPTAL_DOSYA, [kayit, ...hepsi]);
  });
}

// ── Bildirimler ───────────────────────────────────────────────────────

export async function bildirimlerOku(kime?: string): Promise<Bildirim[]> {
  const hepsi = await oku<Bildirim>(BILDIRIM_DOSYA);
  return kime ? hepsi.filter((b) => b.kime === kime) : hepsi;
}

/**
 * Bildirimi siler.
 *
 * Sahiplik kontrolü çağıran tarafta değil BURADA yapılır ki hiçbir yol
 * atlanamasın — kart, adres ve alarm silmedeki desenle aynı. Başkasının
 * bildirimini silmek "yetkisiz" döner ve hiçbir şey silinmez.
 */
export async function bildirimSil(
  id: number,
  isteyen: string,
): Promise<"silindi" | "bulunamadi" | "yetkisiz"> {
  return sirala(async () => {
    const hepsi = await oku<Bildirim>(BILDIRIM_DOSYA);
    const bildirim = hepsi.find((b) => b.id === id);
    if (!bildirim) return "bulunamadi";
    if (bildirim.kime !== isteyen) return "yetkisiz";

    await yaz(
      BILDIRIM_DOSYA,
      hepsi.filter((b) => b.id !== id),
    );
    return "silindi";
  });
}

/**
 * Bildirimi okundu işaretler.
 *
 * "OKUNDU" DİYE BİR KAYIT YOKTU: `yeni` alanı oluşturulurken `true`
 * yazılıyor ve hiçbir yerde `false` olmuyordu. Sonuç, ziller ve sayfa
 * arasında ikiye ayrılmış bir yalan oluyordu — bildirim sayfasındaki
 * "Tümünü okundu işaretle" yalnızca bileşenin `useState`'ini değiştiriyor,
 * sayfa yenilenince her şey yeniden okunmamış görünüyor, başlıktaki zil
 * rozeti ise HİÇ sıfırlanmıyordu.
 *
 * Sahiplik kontrolü `bildirimSil` ile aynı yerde: kilidin içinde.
 */
export async function bildirimOkundu(
  id: number,
  isteyen: string,
): Promise<"okundu" | "bulunamadi" | "yetkisiz"> {
  return sirala(async () => {
    const hepsi = await oku<Bildirim>(BILDIRIM_DOSYA);
    const bildirim = hepsi.find((b) => b.id === id);
    if (!bildirim) return "bulunamadi";
    if (bildirim.kime !== isteyen) return "yetkisiz";
    // Zaten okunmuşsa dosyayı yeniden yazma: JSON depoda her yazma tüm
    // dosyayı baştan yazmak demek, listeye her tıklamada bir tur olurdu.
    if (!bildirim.yeni) return "okundu";

    await yaz(
      BILDIRIM_DOSYA,
      hepsi.map((b) => (b.id === id ? { ...b, yeni: false } : b)),
    );
    return "okundu";
  });
}

/** Hesabın okunmamış TÜM bildirimlerini okundu işaretler; sayısını döndürür. */
export async function bildirimlerTumunuOku(isteyen: string): Promise<number> {
  return sirala(async () => {
    const hepsi = await oku<Bildirim>(BILDIRIM_DOSYA);
    const okunacak = hepsi.filter((b) => b.kime === isteyen && b.yeni);
    if (!okunacak.length) return 0;

    await yaz(
      BILDIRIM_DOSYA,
      hepsi.map((b) =>
        b.kime === isteyen && b.yeni ? { ...b, yeni: false } : b,
      ),
    );
    return okunacak.length;
  });
}

/** Hesabın TÜM bildirimlerini siler. Kaç tane silindiğini döndürür. */
export async function bildirimlerTemizle(isteyen: string): Promise<number> {
  return sirala(async () => {
    const hepsi = await oku<Bildirim>(BILDIRIM_DOSYA);
    const kalan = hepsi.filter((b) => b.kime !== isteyen);
    const silinen = hepsi.length - kalan.length;
    if (silinen) await yaz(BILDIRIM_DOSYA, kalan);
    return silinen;
  });
}

export async function bildirimEkle(bildirim: Bildirim): Promise<Bildirim> {
  // TERCİHLER GERÇEKTEN SORULUR. Eskiden sorulmuyordu: kullanıcı "yeni
  // sunum bildirimi istemiyorum" dese de bildirim yine çıkıyordu.
  // Kapatılamaz türler (teklif, kargo, sistem) akışın parçası olduğu için
  // ayara bakılmaz.
  const tercih = await tercihlerOku(bildirim.kime);
  if (!KAPATILAMAZ.has(bildirim.tip)) {
    /*
     * Her tür KENDİ tercihine bakar. Eskiden "sunum" dışındaki her şey
     * `tercih.kampanya`ya düşüyordu; `tercih.mesaj` diye kaydedilen ayarı
     * ise hiçbir kod okumuyordu — Ayarlar'daki "Mesajlar" satırı ne açınca
     * ne kapatınca bir şey değiştiriyordu.
     */
    const acik =
      bildirim.tip === "sunum"
        ? tercih.sunum
        : bildirim.tip === "mesaj"
          ? tercih.mesaj
          : tercih.kampanya;
    if (!acik) return bildirim;
  }

  // Zaman damgası tek yerde basılır: çağıran taraflar "az önce" yazmayı
  // unutsa bile sayaç doğru işler (bkz. lib/bildirimler.ts → gecenSure).
  const kayit: Bildirim = {
    ...bildirim,
    olusturuldu: bildirim.olusturuldu ?? new Date().toISOString(),
  };
  const sonuc = await sirala(async () => {
    const hepsi = await oku<Bildirim>(BILDIRIM_DOSYA);
    await yaz(BILDIRIM_DOSYA, [kayit, ...hepsi]);
    return kayit;
  });

  // Her uygulama bildirimi aynı zamanda e-postaya düşer: kullanıcı siteye
  // girmeden de haberdar olsun. Kuyruğa doğrudan yazılır — `lib/eposta.ts`
  // bu modülü kullandığı için oradan çağırmak dairesel bağımlılık olurdu.
  //
  // Yalnızca DOĞRULANMIŞ adrese yazılır: `hesapEpostasi` doğrulama akışı
  // bağlanana kadar `<kullanıcı>@eposta.com` biçiminde uydurma bir adres
  // üretiyor. Bunlar kuyruğa girip gerçek servis bağlandığı gün topluca
  // geri dönerse gönderen itibarı yanar.
  const epostaKayit = await hesapEpostasiOku(kayit.kime);
  const adres =
    tercih.eposta && epostaKayit?.dogrulandi ? epostaKayit.adres : "";
  if (adres.includes("@")) {
    void epostaKuyrukEkle({
      id: `eposta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kime: adres,
      konu: kayit.text.slice(0, 160),
      govde: [kayit.text, kayit.sub, "", `Bulbana: ${kayit.href}`]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2000),
      zaman: new Date().toISOString(),
      durum: "kuyrukta",
    }).catch(() => undefined);
  }

  return sonuc;
}

// ── IBAN aktarım talepleri ────────────────────────────────────────────

export async function aktarimlarOku(
  kullanici?: string,
): Promise<AktarimTalebi[]> {
  const hepsi = await oku<AktarimTalebi>(AKTARIM_DOSYA);
  const sirali = hepsi.sort((a, b) => b.zaman.localeCompare(a.zaman));
  return kullanici ? sirali.filter((a) => a.kullanici === kullanici) : sirali;
}

/**
 * Aktarım talebi açar. Bakiye kontrolü BURADA, yazma kuyruğunun içinde
 * yapılır.
 *
 * Eskiden çekilebilir tutar uçta, kilidin dışında hesaplanıyordu: aynı anda
 * gelen iki istek de aynı bakiyeyi görüp ikisi de geçiyor, aynı para iki kez
 * talep edilebiliyordu. Kontrolü kuyruğa aldığımız için ikinci istek artık
 * birincinin yazdığı kaydı görür.
 *
 * `istenen` verilmezse çekilebilir bakiyenin tamamı istenmiş sayılır.
 */
export async function aktarimTalebiOlustur(
  kullanici: string,
  istenen: number | null,
): Promise<
  | AktarimTalebi
  | { hata: "az-tutar"; enAz: number }
  | { hata: "yetersiz-bakiye"; cekilebilir: number }
  | { hata: "iban-yok" }
> {
  return sirala(async () => {
    // HEDEF İSTEMCİDEN GELMEZ. Bir dönem `ibanMaske` istek gövdesinden
    // alınıyordu ve cüzdan ekranı gövdeyi boş gönderdiği için her aktarım
    // talebi hedefsiz kaydediliyordu — muhasebe parayı nereye
    // göndereceğini bilmiyordu. Paranın gideceği yer, tutar gibi,
    // beyana bırakılamaz.
    const ibanKayit = await oku<KayitliIban>(IBAN_DOSYA).then((h) =>
      h.find((i) => i.kullanici === kullanici),
    );
    if (!ibanKayit) return { hata: "iban-yok" } as const;
    const hepsi = await oku<AktarimTalebi>(AKTARIM_DOSYA);
    const kendi = hepsi.filter((a) => a.kullanici === kullanici);
    const islemler = await oku<Islem>(ISLEM_DOSYA);
    const cekilebilir = cekilebilirTutar(
      bakiyedekiTutar(islemler, kullanici),
      kendi,
    );

    const tutar = istenen ?? cekilebilir;
    if (tutar < MIN_AKTARIM)
      return { hata: "az-tutar", enAz: MIN_AKTARIM } as const;
    if (tutar > cekilebilir)
      return { hata: "yetersiz-bakiye", cekilebilir } as const;

    const kayit: AktarimTalebi = {
      id: metinKimlik("aktarim"),
      kullanici,
      tutar,
      ibanMaske: ibanMaskele(ibanKayit.iban),
      durum: "islemde",
      zaman: new Date().toISOString(),
    };
    await yaz(AKTARIM_DOSYA, [kayit, ...hepsi]);
    return kayit;
  });
}

/** Muhasebe/destek tarafı aktarımı sonuçlandırır. */
export async function aktarimSonucla(
  id: string,
  durum: "tamamlandi" | "reddedildi",
  not?: string,
): Promise<AktarimTalebi | "bulunamadi"> {
  return sirala(async () => {
    const hepsi = await oku<AktarimTalebi>(AKTARIM_DOSYA);
    const i = hepsi.findIndex((a) => a.id === id);
    if (i === -1) return "bulunamadi" as const;
    hepsi[i] = {
      ...hepsi[i],
      durum,
      sonucZamani: new Date().toISOString(),
      not,
    };
    await yaz(AKTARIM_DOSYA, hepsi);

    // İŞLEM KAYITLARINA DOKUNULMAZ. Burada bir dönem `paraDurumu` alanı
    // "IBAN'a aktarıldı" olarak damgalanıyordu; aynı parayı hem o damga
    // (`bakiyedekiTutar` üzerinden) hem de bu aktarım kaydı
    // (`cekilebilirTutar` üzerinden) düşüyor, satıcının bakiyesinin bir
    // kısmı kalıcı olarak çekilemez hale geliyordu. Etiket artık aktarım
    // defterinden türetiliyor (bkz. lib/islemler.ts → paraDurumlari).
    return hepsi[i];
  });
}

// ── Tamamlanmış işlemler ──────────────────────────────────────────────
// Alıcı ürünü onayladığı anda alışveriş "işlem" olur: Aldıklarım,
// Sattıklarım, Cüzdan ve Mali Tablom bu kayıtlardan beslenir.

export async function islemlerOku(kullanici?: string): Promise<Islem[]> {
  const hepsi = await oku<Islem>(ISLEM_DOSYA);
  const sirali = hepsi.sort((a, b) => b.tarihIso.localeCompare(a.tarihIso));
  return kullanici
    ? sirali.filter((i) => i.alici === kullanici || i.satici === kullanici)
    : sirali;
}

/** Aynı sipariş iki kez işleme dönüşmez. */
export async function islemEkle(islem: Islem): Promise<Islem | "zaten-var"> {
  return sirala(async () => {
    const hepsi = await oku<Islem>(ISLEM_DOSYA);
    if (hepsi.some((i) => i.id === islem.id)) return "zaten-var" as const;
    await yaz(ISLEM_DOSYA, [islem, ...hepsi]);
    return islem;
  });
}

// ── Destek kayıtları ──────────────────────────────────────────────────

export async function destekKayitlariOku(
  kullanici?: string,
): Promise<DestekKaydi[]> {
  const hepsi = await oku<DestekKaydi>(DESTEK_DOSYA);
  const sirali = hepsi.sort((a, b) => b.zaman.localeCompare(a.zaman));
  return kullanici ? sirali.filter((d) => d.acan === kullanici) : sirali;
}

/**
 * Destek kaydını ekler ve KESİNLEŞMİŞ kaydı döndürür.
 *
 * Numara burada, yazma kilidinin içinde üretilir: çağıran tarafta üretmek
 * eşzamanlı iki kaydın aynı numarayı almasına yol açabilirdi. Çağıran taraf
 * dönen kaydı kullanmalı.
 */
export async function destekKaydiEkle(
  kayit: DestekKaydi,
): Promise<DestekKaydi> {
  return sirala(async () => {
    const hepsi = await oku<DestekKaydi>(DESTEK_DOSYA);
    const kesin: DestekKaydi = {
      ...kayit,
      no: destekNo(hepsi.map((k) => k.no)),
    };
    await yaz(DESTEK_DOSYA, [kesin, ...hepsi]);
    return kesin;
  });
}

/**
 * Destek kaydının durumunu değiştirir — yalnızca destek ekibi çağırır.
 *
 * Kullanıcı formdan kayıt açtığında ekran "yanıtı e-postana göndereceğiz"
 * diyordu ama kaydı OKUYAN bir ekran yoktu: kayıt `.veri/destek.json`'a
 * yazılıyor, durumu sonsuza dek "İncelemede" kalıyordu. Moderasyon
 * panelindeki itiraz ve aktarım kuyruklarında da aynı hata çıkmıştı
 * (bkz. BACKEND.md → Moderasyon paneli).
 *
 * Kayıt bulunamazsa `undefined` döner; durum aynıysa yazma yapılmaz.
 */
export async function destekKaydiDurumGuncelle(
  no: string,
  durum: DestekKaydi["durum"],
): Promise<DestekKaydi | undefined> {
  return sirala(async () => {
    const hepsi = await oku<DestekKaydi>(DESTEK_DOSYA);
    const kayit = hepsi.find((k) => k.no === no);
    if (!kayit) return undefined;
    if (kayit.durum === durum) return kayit;

    const guncel: DestekKaydi = { ...kayit, durum };
    await yaz(
      DESTEK_DOSYA,
      hepsi.map((k) => (k.no === no ? guncel : k)),
    );
    return guncel;
  });
}

// ── Değerlendirmeler ──────────────────────────────────────────────────
// Alışveriş bitince iki taraf birbirini puanlar; kayıtlar profillerde
// herkese açık görünür.

export async function degerlendirmelerOku(): Promise<Degerlendirme[]> {
  return oku<Degerlendirme>(DEGERLENDIRME_DOSYA);
}

/** Bir kullanıcı hakkında yazılanlar — en yeni önce. */
export async function degerlendirmelerFor(
  kullanici: string,
): Promise<Degerlendirme[]> {
  const hepsi = await oku<Degerlendirme>(DEGERLENDIRME_DOSYA);
  return hepsi
    .filter((d) => d.hakkinda === kullanici)
    .sort((a, b) => b.zaman.localeCompare(a.zaman));
}

/** Aynı alışverişe aynı kişi ikinci kez puan veremez. */
export async function degerlendirmeEkle(
  d: Degerlendirme,
): Promise<Degerlendirme | "zaten-var"> {
  return sirala(async () => {
    const hepsi = await oku<Degerlendirme>(DEGERLENDIRME_DOSYA);
    if (hepsi.some((x) => x.sunumId === d.sunumId && x.yazan === d.yazan))
      return "zaten-var" as const;
    await yaz(DEGERLENDIRME_DOSYA, [d, ...hepsi]);
    return d;
  });
}

// ── E-posta kuyruğu ───────────────────────────────────────────────────
// Gerçek gönderim bağlanana kadar postalar burada birikir (bkz. lib/eposta.ts).

export async function epostaKuyrukOku(): Promise<EpostaIsi[]> {
  return oku<EpostaIsi>(EPOSTA_DOSYA);
}

/** Kuyrukta tutulan en fazla posta sayısı. */
export const EPOSTA_KUYRUK_TAVANI = 500;

export async function epostaKuyrukEkle(is: EpostaIsi): Promise<EpostaIsi> {
  return sirala(async () => {
    const hepsi = await oku<EpostaIsi>(EPOSTA_DOSYA);
    // Tavan aşılırsa EN ESKİ kayıtlar düşer. Gerçek gönderim bağlanana
    // kadar bu sessiz bir veri kaybıdır; kuyruğu `/api/eposta-kuyrugu`
    // üzerinden izleyin (bkz. BACKEND.md).
    await yaz(EPOSTA_DOSYA, [is, ...hepsi].slice(0, EPOSTA_KUYRUK_TAVANI));
    return is;
  });
}

// ── SMS kuyruğu ───────────────────────────────────────────────────────
// E-posta kuyruğuyla aynı desen: sağlayıcı bağlanana kadar mesajlar burada
// bekler ve destek ekibi `/api/sms-kuyrugu` üzerinden okur. Kuyruğu
// görünür kılmak şart — biriken ve kimsenin bakmadığı bir kuyruk, sessizce
// kaybolan doğrulama kodları demektir (bkz. BACKEND.md → E-posta kuyruğu).

export async function smsKuyrukOku(): Promise<SmsIsi[]> {
  return oku<SmsIsi>(SMS_DOSYA);
}

/** Kuyrukta tutulan en fazla mesaj sayısı. */
export const SMS_KUYRUK_TAVANI = 500;

export async function smsKuyrukEkle(is: SmsIsi): Promise<SmsIsi> {
  return sirala(async () => {
    const hepsi = await oku<SmsIsi>(SMS_DOSYA);
    // Tavan aşılırsa EN ESKİ kayıtlar düşer.
    await yaz(SMS_DOSYA, [is, ...hepsi].slice(0, SMS_KUYRUK_TAVANI));
    return is;
  });
}

// ── Kayıtlı kartlar ───────────────────────────────────────────────────
// Yalnızca maskeli bilgi saklanır; tam numara ve CVV hiçbir zaman buraya
// gelmez (bkz. lib/kart.ts).

export async function kartlarOku(kullanici: string): Promise<KayitliKart[]> {
  const hepsi = await oku<KayitliKart>(KART_DOSYA);
  return hepsi.filter((k) => k.kullanici === kullanici);
}

export async function kartEkle(
  kart: KayitliKart,
): Promise<KayitliKart | "sinir-doldu"> {
  return sirala(async () => {
    const hepsi = await oku<KayitliKart>(KART_DOSYA);
    const kendi = hepsi.filter((k) => k.kullanici === kart.kullanici);
    // Sınır burada uygulanır ki hiçbir çağrı yolu atlayamasın.
    if (kendi.length >= EN_FAZLA_KART) return "sinir-doldu" as const;
    // İlk kart doğal olarak varsayılandır; yeni varsayılan öncekini düşürür.
    const varsayilan = kart.varsayilan || kendi.length === 0;
    const yeni = { ...kart, varsayilan };
    await yaz(KART_DOSYA, [
      ...hepsi.map((k) =>
        varsayilan && k.kullanici === kart.kullanici
          ? { ...k, varsayilan: false }
          : k,
      ),
      yeni,
    ]);
    return yeni;
  });
}

/** Kartı siler. Sahiplik kontrolü burada yapılır. */
export async function kartSil(
  id: string,
  isteyen: string,
): Promise<"silindi" | "bulunamadi" | "yetkisiz"> {
  return sirala(async () => {
    const hepsi = await oku<KayitliKart>(KART_DOSYA);
    const kart = hepsi.find((k) => k.id === id);
    if (!kart) return "bulunamadi";
    if (kart.kullanici !== isteyen) return "yetkisiz";

    const kalan = hepsi.filter((k) => k.id !== id);
    // Varsayılan kart silindiyse sıradaki kart varsayılan olur.
    const kendi = kalan.filter((k) => k.kullanici === isteyen);
    if (kart.varsayilan && kendi.length) {
      const ilk = kendi[0];
      const i = kalan.indexOf(ilk);
      kalan[i] = { ...ilk, varsayilan: true };
    }
    await yaz(KART_DOSYA, kalan);
    return "silindi";
  });
}

export async function kartVarsayilanYap(
  id: string,
  isteyen: string,
): Promise<"guncellendi" | "bulunamadi" | "yetkisiz"> {
  return sirala(async () => {
    const hepsi = await oku<KayitliKart>(KART_DOSYA);
    const kart = hepsi.find((k) => k.id === id);
    if (!kart) return "bulunamadi";
    if (kart.kullanici !== isteyen) return "yetkisiz";

    await yaz(
      KART_DOSYA,
      hepsi.map((k) =>
        k.kullanici === isteyen ? { ...k, varsayilan: k.id === id } : k,
      ),
    );
    return "guncellendi";
  });
}

// ── Favoriler ─────────────────────────────────────────────────────────
// Kalp butonu önce yalnızca ekranda kalıyordu: sayfa yenilenince
// kayboluyor, "Favorilerim" sekmesi hep boş görünüyordu.

export async function favorilerOku(kullanici: string): Promise<string[]> {
  const hepsi = await oku<Favori>(FAVORI_DOSYA);
  return hepsi.filter((f) => f.kullanici === kullanici).map((f) => f.talepId);
}

/** Bir talebi kaç kişi takip ediyor (favorilemiş)? */
export async function favoriSayisi(talepId: string): Promise<number> {
  const hepsi = await oku<Favori>(FAVORI_DOSYA);
  return hepsi.filter((f) => f.talepId === talepId).length;
}

/** Favoriyi ekler/kaldırır; yeni duruma göre `true` (favoride) döner. */
export async function favoriDegistir(
  kullanici: string,
  talepId: string,
): Promise<boolean | "talep-yok"> {
  return sirala(async () => {
    // Talebin varlığı doğrulanmıyordu: uydurma bir kimlikle sınırsız favori
    // kaydı yazılabiliyor, "Favorilerim" sayacı hiçbir karta karşılık
    // gelmeyen sayılar gösterebiliyordu.
    const talepler = await oku<Talep>(TALEP_DOSYA);
    if (!talepler.some((t) => t.id === talepId)) return "talep-yok" as const;

    const hepsi = await oku<Favori>(FAVORI_DOSYA);
    const varMi = hepsi.some(
      (f) => f.kullanici === kullanici && f.talepId === talepId,
    );
    if (varMi) {
      await yaz(
        FAVORI_DOSYA,
        hepsi.filter(
          (f) => !(f.kullanici === kullanici && f.talepId === talepId),
        ),
      );
      return false;
    }
    await yaz(FAVORI_DOSYA, [
      ...hepsi,
      { kullanici, talepId, zaman: new Date().toISOString() },
    ]);
    return true;
  });
}

// ── Talep alarmları ───────────────────────────────────────────────────
// Alarm da yalnızca ekranda duruyordu; kurulan alarm hiçbir yere
// yazılmadığı için ne saklanıyor ne de eşleşme aranabiliyordu.

export type Alarm = {
  id: string;
  kullanici: string;
  ad: string;
  /** Ekranda görünen kriter etiketleri. */
  kriterler: string[];
  /** Eşleşme aramasında kullanılan yapısal kriterler. */
  filtre: AlarmFiltre;
  aktif: boolean;
  /** Ekranda görünen kanal metni ("Uygulama + E-posta"). */
  kanal: string;
  kanallar: AlarmKanallari;
  /** Alarm kurulurken hesaptaki e-posta — bildirim buraya gider. */
  eposta: string;
  /** O ana kadar yakalanan talep sayısı. */
  eslesme: number;
  /** Son eşleşen talep — listede kart altında görünür. */
  son: { baslik: string; fiyat: string; zaman: string; href: string } | null;
  zaman: string;
};

/** Tüm kullanıcıların alarmları — eşleşme taraması için. */
export async function tumAlarmlarOku(): Promise<Alarm[]> {
  return oku<Alarm>(ALARM_DOSYA);
}

/**
 * Eşleşme yakalayan alarmın sayacını ve son eşleşmesini günceller.
 * `artis` verilmezse sayaç bir artar (tek talep düştü).
 */
export async function alarmEslesmeYaz(
  id: string,
  son: NonNullable<Alarm["son"]>,
  artis = 1,
): Promise<void> {
  await sirala(async () => {
    const hepsi = await oku<Alarm>(ALARM_DOSYA);
    const i = hepsi.findIndex((a) => a.id === id);
    if (i === -1) return;
    hepsi[i] = { ...hepsi[i], eslesme: (hepsi[i].eslesme ?? 0) + artis, son };
    await yaz(ALARM_DOSYA, hepsi);
  });
}

export async function alarmlarOku(kullanici: string): Promise<Alarm[]> {
  const hepsi = await oku<Alarm>(ALARM_DOSYA);
  return hepsi.filter((a) => a.kullanici === kullanici);
}

export async function alarmEkle(alarm: Alarm): Promise<Alarm | "sinir-doldu"> {
  return sirala(async () => {
    const hepsi = await oku<Alarm>(ALARM_DOSYA);
    // Sınır burada uygulanır ki hiçbir çağrı yolu atlayamasın — kart ve
    // adres tarafındaki desenle aynı.
    const kendi = hepsi.filter((a) => a.kullanici === alarm.kullanici);
    if (kendi.length >= EN_FAZLA_ALARM) return "sinir-doldu" as const;
    await yaz(ALARM_DOSYA, [alarm, ...hepsi]);
    return alarm;
  });
}

/** Alarmı siler ya da aç/kapa yapar. Sahiplik burada kontrol edilir. */
export async function alarmGuncelle(
  id: string,
  isteyen: string,
  islem: { sil: true } | { aktif: boolean },
): Promise<"guncellendi" | "bulunamadi" | "yetkisiz"> {
  return sirala(async () => {
    const hepsi = await oku<Alarm>(ALARM_DOSYA);
    const i = hepsi.findIndex((a) => a.id === id);
    if (i === -1) return "bulunamadi";
    if (hepsi[i].kullanici !== isteyen) return "yetkisiz";

    if ("sil" in islem) {
      await yaz(
        ALARM_DOSYA,
        hepsi.filter((a) => a.id !== id),
      );
      return "guncellendi";
    }
    hepsi[i] = { ...hepsi[i], aktif: islem.aktif };
    await yaz(ALARM_DOSYA, hepsi);
    return "guncellendi";
  });
}

// ── Teslimat adresleri ────────────────────────────────────────────────
// Talebe bağlı tam adres. Talep kaydından ayrı tutulur ki herkese açık
// uçlardan sızmasın (bkz. lib/teslimat.ts).

export async function teslimatOku(
  talepId: string,
): Promise<TeslimatAdresi | undefined> {
  const hepsi = await oku<TeslimatAdresi>(TESLIMAT_DOSYA);
  return hepsi.find((t) => t.talepId === talepId);
}

export async function teslimatYaz(adres: TeslimatAdresi): Promise<void> {
  await sirala(async () => {
    const hepsi = await oku<TeslimatAdresi>(TESLIMAT_DOSYA);
    await yaz(TESLIMAT_DOSYA, [
      adres,
      ...hepsi.filter((t) => t.talepId !== adres.talepId),
    ]);
  });
}

// ── Adresler ──────────────────────────────────────────────────────────
// Kartlarla aynı desen: hesaba bağlı, sahiplik kontrolü burada.

export async function adreslerOku(kullanici: string): Promise<KayitliAdres[]> {
  const hepsi = await oku<KayitliAdres>(ADRES_DOSYA);
  return hepsi.filter((a) => a.kullanici === kullanici);
}

export async function adresEkle(
  adres: KayitliAdres,
): Promise<KayitliAdres | "sinir-doldu"> {
  return sirala(async () => {
    const hepsi = await oku<KayitliAdres>(ADRES_DOSYA);
    const kendi = hepsi.filter((a) => a.kullanici === adres.kullanici);
    if (kendi.length >= EN_FAZLA_ADRES) return "sinir-doldu" as const;

    // İlk adres doğal olarak varsayılandır; yeni varsayılan öncekini düşürür.
    const varsayilan = adres.varsayilan || kendi.length === 0;
    const yeni = { ...adres, varsayilan };
    await yaz(ADRES_DOSYA, [
      ...hepsi.map((a) =>
        varsayilan && a.kullanici === adres.kullanici
          ? { ...a, varsayilan: false }
          : a,
      ),
      yeni,
    ]);
    return yeni;
  });
}

export async function adresGuncelle(
  id: string,
  isteyen: string,
  veri: Partial<Omit<KayitliAdres, "id" | "kullanici">>,
): Promise<KayitliAdres | "bulunamadi" | "yetkisiz"> {
  return sirala(async () => {
    const hepsi = await oku<KayitliAdres>(ADRES_DOSYA);
    const i = hepsi.findIndex((a) => a.id === id);
    if (i === -1) return "bulunamadi" as const;
    if (hepsi[i].kullanici !== isteyen) return "yetkisiz" as const;

    const varsayilanOldu = veri.varsayilan === true;
    hepsi[i] = { ...hepsi[i], ...veri };
    await yaz(
      ADRES_DOSYA,
      hepsi.map((a, j) =>
        varsayilanOldu && a.kullanici === isteyen && j !== i
          ? { ...a, varsayilan: false }
          : a,
      ),
    );
    return hepsi[i];
  });
}

export async function adresSil(
  id: string,
  isteyen: string,
): Promise<"silindi" | "bulunamadi" | "yetkisiz"> {
  return sirala(async () => {
    const hepsi = await oku<KayitliAdres>(ADRES_DOSYA);
    const adres = hepsi.find((a) => a.id === id);
    if (!adres) return "bulunamadi";
    if (adres.kullanici !== isteyen) return "yetkisiz";

    const kalan = hepsi.filter((a) => a.id !== id);
    // Varsayılan silindiyse sıradaki varsayılan olur.
    const kendi = kalan.filter((a) => a.kullanici === isteyen);
    if (adres.varsayilan && kendi.length) {
      const j = kalan.indexOf(kendi[0]);
      kalan[j] = { ...kendi[0], varsayilan: true };
    }
    await yaz(ADRES_DOSYA, kalan);
    return "silindi";
  });
}

// ── Okundu bilgisi ────────────────────────────────────────────────────
// Mesaj rozetinin gerçek sayıyı gösterebilmesi için "bu sohbeti en son
// ne zaman açtım" bilgisi gerekiyor. Mesajın kendisine "okundu" damgası
// basmıyoruz: aynı mesajı iki taraf ayrı ayrı okur, damga kişiye özel.

type Okundu = { kullanici: string; sohbetId: string; zaman: string };

/** Kullanıcının sohbet başına son okuma zamanları. */
export async function okunduOku(
  kullanici: string,
): Promise<Record<string, string>> {
  const hepsi = await oku<Okundu>(OKUNDU_DOSYA);
  const harita: Record<string, string> = {};
  for (const o of hepsi)
    if (o.kullanici === kullanici) harita[o.sohbetId] = o.zaman;
  return harita;
}

/** Sohbeti okundu işaretler (şu an). */
export async function okunduYaz(
  kullanici: string,
  sohbetId: string,
): Promise<void> {
  return sirala(async () => {
    const hepsi = await oku<Okundu>(OKUNDU_DOSYA);
    const zaman = new Date().toISOString();
    const i = hepsi.findIndex(
      (o) => o.kullanici === kullanici && o.sohbetId === sohbetId,
    );
    if (i === -1) hepsi.push({ kullanici, sohbetId, zaman });
    else hepsi[i] = { ...hepsi[i], zaman };
    await yaz(OKUNDU_DOSYA, hepsi);
  });
}

// ── Parola sıfırlama ────────────────────────────────────────────────
// Parolasını unutan kullanıcının hesabına dönebilmesi için tek kullanımlık
// kod. Kod yalnızca hesabın DOĞRULANMIŞ e-posta adresine gider.

export type SifirlamaKaydi = {
  kullanici: string;
  token: string;
  zaman: string;
};

/** Kodun geçerlilik süresi — kısa tutulur, e-posta kutusu ele geçebilir. */
export const SIFIRLAMA_SURESI_MS = 60 * 60 * 1000;

/** Hesap için tek kullanımlık sıfırlama kodu üretir (öncekini geçersiz kılar). */
export async function sifirlamaKoduYaz(kullanici: string): Promise<string> {
  return sirala(async () => {
    const hepsi = await oku<SifirlamaKaydi>(SIFIRLAMA_DOSYA);
    const kayit: SifirlamaKaydi = {
      kullanici,
      token: randomUUID(),
      zaman: new Date().toISOString(),
    };
    await yaz(SIFIRLAMA_DOSYA, [
      kayit,
      // Aynı hesabın eski kodu geçersiz olur: iki kod aynı anda yaşamamalı.
      ...hepsi.filter((k) => k.kullanici !== kullanici),
    ]);
    return kayit.token;
  });
}

/**
 * Kodu doğrular ve TÜKETİR.
 *
 * Tek kullanımlık: doğrulandığı anda silinir, böylece aynı kodla ikinci kez
 * parola değiştirilemez.
 */
export async function sifirlamaKoduTuket(
  kullanici: string,
  token: string,
): Promise<"gecerli" | "gecersiz" | "suresi-doldu"> {
  return sirala(async () => {
    const hepsi = await oku<SifirlamaKaydi>(SIFIRLAMA_DOSYA);
    const i = hepsi.findIndex(
      (k) => k.kullanici === kullanici && k.token === token,
    );
    if (i === -1) return "gecersiz" as const;

    const basladi = new Date(hepsi[i].zaman).getTime();
    const suresiDoldu = Date.now() - basladi >= SIFIRLAMA_SURESI_MS;

    // Süresi dolmuş kod da tüketilir: kayıt geride birikmesin.
    hepsi.splice(i, 1);
    await yaz(SIFIRLAMA_DOSYA, hepsi);
    return suresiDoldu ? ("suresi-doldu" as const) : ("gecerli" as const);
  });
}

// ── Hesap profili ───────────────────────────────────────────────────
// Ad, soyad, telefon, doğum tarihi ve "Hakkında" metni.
//
// SUNUCUDA TUTULUR. Bir dönem yalnızca tarayıcının `localStorage`'ındaydı:
// başka cihazdan girince kayboluyordu ve — daha önemlisi — herkese açık
// profildeki "Hakkında" metni `lib/kullanicilar.ts`'teki sabit kayıttan
// geliyordu. Yani kullanıcının yazdığı biyografi YALNIZCA KENDİSİNE
// görünüyordu.

export type HesapProfilKaydi = {
  kullanici: string;
  ad: string;
  soyad: string;
  telefon: string;
  dogumTarihi: string;
  bio: string;
  guncellendi: string;
};

export async function profilOku(
  kullanici: string,
): Promise<HesapProfilKaydi | undefined> {
  const hepsi = await oku<HesapProfilKaydi>(PROFIL_DOSYA);
  return hepsi.find((p) => p.kullanici === kullanici);
}

export async function profilYaz(
  kullanici: string,
  veri: Omit<HesapProfilKaydi, "kullanici" | "guncellendi">,
): Promise<HesapProfilKaydi> {
  return sirala(async () => {
    const hepsi = await oku<HesapProfilKaydi>(PROFIL_DOSYA);
    const kayit: HesapProfilKaydi = {
      kullanici,
      ...veri,
      guncellendi: new Date().toISOString(),
    };
    await yaz(PROFIL_DOSYA, [
      kayit,
      ...hepsi.filter((p) => p.kullanici !== kullanici),
    ]);
    return kayit;
  });
}

// ── Bildirim tercihleri ─────────────────────────────────────────────
// Hangi olayda bildirim çıksın?
//
// Bu ayarlar bir dönem yalnızca Ayarlar ekranının `useState`'inde duruyordu:
// sayfa yenilenince sıfırlanıyorlardı ve — daha önemlisi — onlara BAKAN
// hiçbir kod yoktu. `bildirimEkle` tercihleri hiç sormuyordu, yani anahtar
// açık da olsa kapalı da olsa aynı bildirim çıkıyordu.

export type BildirimTercihleri = {
  kullanici: string;
  /** Taleplerine sunum geldiğinde. */
  sunum: boolean;
  /** Sohbetlere gelen yeni mesajlar. */
  mesaj: boolean;
  /** Yeni özellikler ve duyurular. */
  kampanya: boolean;
  /** Uygulama bildirimi ayrıca e-postaya da düşsün mü? */
  eposta: boolean;
  guncellendi: string;
};

/**
 * Kapatılamayan bildirim türleri.
 *
 * Teklif ve kargo bildirimleri paranın ve ürünün yerini söyler; sipariş
 * akışının işlemesi bunlara bağlı. "Sistem" bildirimleri de öyle — itiraz
 * kararı, otomatik onay, iptal. Bunlar ayar değil, akışın parçası.
 */
export const KAPATILAMAZ = new Set(["teklif", "kargo", "sistem"]);

const VARSAYILAN_TERCIH = {
  sunum: true,
  mesaj: true,
  kampanya: false,
  eposta: true,
} as const;

export async function tercihlerOku(
  kullanici: string,
): Promise<BildirimTercihleri> {
  const hepsi = await oku<BildirimTercihleri>(TERCIH_DOSYA);
  const kayit = hepsi.find((t) => t.kullanici === kullanici);
  return (
    kayit ?? {
      kullanici,
      ...VARSAYILAN_TERCIH,
      guncellendi: new Date().toISOString(),
    }
  );
}

export async function tercihlerYaz(
  kullanici: string,
  veri: Partial<Omit<BildirimTercihleri, "kullanici" | "guncellendi">>,
): Promise<BildirimTercihleri> {
  return sirala(async () => {
    const hepsi = await oku<BildirimTercihleri>(TERCIH_DOSYA);
    const mevcut = hepsi.find((t) => t.kullanici === kullanici);
    const kayit: BildirimTercihleri = {
      kullanici,
      ...VARSAYILAN_TERCIH,
      ...mevcut,
      ...veri,
      guncellendi: new Date().toISOString(),
    };
    await yaz(TERCIH_DOSYA, [
      kayit,
      ...hepsi.filter((t) => t.kullanici !== kullanici),
    ]);
    return kayit;
  });
}

// ── Hesabın e-posta adresi ───────────────────────────────────────────
// Bildirimlerin ve alarm postalarının gideceği adres.
//
// NEDEN AYRI BİR KAYIT: `hesapEpostasi()` bir dönem adresi kullanıcı
// adından UYDURUYORDU (`melih.k@eposta.com`). Gerçek olmayan adreslere
// posta çıkmasın diye önüne bir "doğrulanmış mı?" kapısı konmuştu — ama
// hiçbir hesapta doğrulama alanı dolmadığı için kapı HER ZAMAN kapalıydı.
// Sonuç: e-posta bildirimi diye bir özellik vardı ve hiç çalışmıyordu.
//
// Artık adres kullanıcıdan alınıyor, doğrulanana kadar posta çıkmıyor.

export type HesapEpostasi = {
  kullanici: string;
  adres: string;
  dogrulandi: boolean;
  /** Doğrulama bağlantısındaki tek kullanımlık kod. Doğrulanınca silinir. */
  token?: string;
  tokenZamani?: string;
  guncellendi: string;
};

/** Doğrulama kodunun geçerlilik süresi. */
export const EPOSTA_TOKEN_SURESI_MS = 24 * 60 * 60 * 1000;

export async function hesapEpostasiOku(
  kullanici: string,
): Promise<HesapEpostasi | undefined> {
  const hepsi = await oku<HesapEpostasi>(EPOSTA_HESAP_DOSYA);
  return hepsi.find((e) => e.kullanici === kullanici);
}

/** Adresi kaydeder ve DOĞRULANMAMIŞ yapar; doğrulama kodunu döndürür. */
export async function hesapEpostasiYaz(
  kullanici: string,
  adres: string,
): Promise<HesapEpostasi> {
  return sirala(async () => {
    const hepsi = await oku<HesapEpostasi>(EPOSTA_HESAP_DOSYA);
    const kayit: HesapEpostasi = {
      kullanici,
      adres,
      // Adres her değiştiğinde doğrulama sıfırlanır: kullanıcı doğrulanmış
      // bir adresi başkasınınkiyle değiştirip rozeti taşıyamamalı.
      dogrulandi: false,
      token: randomUUID(),
      tokenZamani: new Date().toISOString(),
      guncellendi: new Date().toISOString(),
    };
    await yaz(EPOSTA_HESAP_DOSYA, [
      kayit,
      ...hepsi.filter((e) => e.kullanici !== kullanici),
    ]);
    return kayit;
  });
}

/** Doğrulama kodunu işler. */
export async function hesapEpostasiDogrula(
  kullanici: string,
  token: string,
): Promise<"dogrulandi" | "gecersiz" | "suresi-doldu"> {
  return sirala(async () => {
    const hepsi = await oku<HesapEpostasi>(EPOSTA_HESAP_DOSYA);
    const i = hepsi.findIndex((e) => e.kullanici === kullanici);
    if (i === -1 || !hepsi[i].token || hepsi[i].token !== token)
      return "gecersiz" as const;

    const basladi = new Date(hepsi[i].tokenZamani ?? 0).getTime();
    if (Date.now() - basladi >= EPOSTA_TOKEN_SURESI_MS)
      return "suresi-doldu" as const;

    // Kod tek kullanımlık: doğrulandıktan sonra kayıttan silinir.
    hepsi[i] = {
      ...hepsi[i],
      dogrulandi: true,
      token: undefined,
      tokenZamani: undefined,
      guncellendi: new Date().toISOString(),
    };
    await yaz(EPOSTA_HESAP_DOSYA, hepsi);
    return "dogrulandi" as const;
  });
}

// ── Hesabın doğrulanmış telefonu ─────────────────────────────────────
//
// NEDEN PROFİLDE DEĞİL: telefon bir dönem `profiller.json` içindeydi ve
// hiç doğrulanmıyordu — kullanıcı istediği numarayı yazıp kaydedebiliyor,
// `telefonOnayli` rozeti de bu yüzden hiçbir zaman render edilmiyordu.
// E-posta için verilen kararın aynısı geçerli: doğrulama gerektiren
// iletişim bilgisi profilden AYRI tutulur, yoksa "hangi numara geçerli?"
// sorusu belirsizleşir (bkz. HesapEpostasi).
//
// Adres kayıtlarındaki telefon BAŞKA bir şeydir: o teslimat için kargo
// firmasına verilir ve doğrulama istemez.

export type HesapTelefonu = {
  kullanici: string;
  /** Sade biçim: +905551234567 (bkz. lib/telefon.ts). */
  numara: string;
  dogrulandi: boolean;
  /** SMS ile gönderilen 6 haneli tek kullanımlık kod. Doğrulanınca silinir. */
  token?: string;
  tokenZamani?: string;
  guncellendi: string;
};

/**
 * Doğrulama kodunun geçerlilik süresi.
 *
 * E-postadakinden (24 saat) KISA: SMS anında ulaşır ve kod yalnızca 6
 * haneli, yani uzun ömür tahmin penceresini gereksiz yere büyütür.
 */
export const TELEFON_TOKEN_SURESI_MS = 15 * 60 * 1000;

export async function hesapTelefonuOku(
  kullanici: string,
): Promise<HesapTelefonu | undefined> {
  const hepsi = await oku<HesapTelefonu>(TELEFON_HESAP_DOSYA);
  return hepsi.find((t) => t.kullanici === kullanici);
}

/** Numarayı kaydeder ve DOĞRULANMAMIŞ yapar; doğrulama kodunu döndürür. */
export async function hesapTelefonuYaz(
  kullanici: string,
  numara: string,
  token: string,
): Promise<HesapTelefonu> {
  return sirala(async () => {
    const hepsi = await oku<HesapTelefonu>(TELEFON_HESAP_DOSYA);
    const kayit: HesapTelefonu = {
      kullanici,
      numara,
      // Numara her değiştiğinde doğrulama sıfırlanır: doğrulanmış bir
      // numarayı başkasınınkiyle değiştirip rozeti taşımak mümkün olmamalı.
      dogrulandi: false,
      token,
      tokenZamani: new Date().toISOString(),
      guncellendi: new Date().toISOString(),
    };
    await yaz(TELEFON_HESAP_DOSYA, [
      kayit,
      ...hepsi.filter((t) => t.kullanici !== kullanici),
    ]);
    return kayit;
  });
}

/** Doğrulama kodunu işler. */
export async function hesapTelefonuDogrula(
  kullanici: string,
  token: string,
): Promise<"dogrulandi" | "gecersiz" | "suresi-doldu"> {
  return sirala(async () => {
    const hepsi = await oku<HesapTelefonu>(TELEFON_HESAP_DOSYA);
    const i = hepsi.findIndex((t) => t.kullanici === kullanici);
    if (i === -1 || !hepsi[i].token || hepsi[i].token !== token)
      return "gecersiz" as const;

    const basladi = new Date(hepsi[i].tokenZamani ?? 0).getTime();
    if (Date.now() - basladi >= TELEFON_TOKEN_SURESI_MS)
      return "suresi-doldu" as const;

    // Kod tek kullanımlık: doğrulandıktan sonra kayıttan silinir.
    hepsi[i] = {
      ...hepsi[i],
      dogrulandi: true,
      token: undefined,
      tokenZamani: undefined,
      guncellendi: new Date().toISOString(),
    };
    await yaz(TELEFON_HESAP_DOSYA, hepsi);
    return "dogrulandi" as const;
  });
}

/** Numarayı ve doğrulamasını tamamen siler. */
export async function hesapTelefonuSil(kullanici: string): Promise<void> {
  return sirala(async () => {
    const hepsi = await oku<HesapTelefonu>(TELEFON_HESAP_DOSYA);
    const kalan = hepsi.filter((t) => t.kullanici !== kullanici);
    if (kalan.length !== hepsi.length) await yaz(TELEFON_HESAP_DOSYA, kalan);
  });
}

// ── Aktarım hesabı (IBAN) ────────────────────────────────────────────
// Satış gelirinin gideceği banka hesabı.
//
// SUNUCUDA TUTULUR. Bir dönem yalnızca Ayarlar ekranının `useState`'inde
// duruyordu: sayfa yenilenince kayboluyordu ve aktarım talebi hedefsiz
// açılıyordu — muhasebe parayı nereye göndereceğini bilmiyordu.
//
// İstemciye yalnızca MASKELİ hâli gösterilir; tam numara sunucudan çıkmaz.

export type KayitliIban = {
  kullanici: string;
  /** Sadeleştirilmiş tam IBAN (TR + 24 hane). */
  iban: string;
  /** Hesap sahibinin adı soyadı — banka eşleşmesi için. */
  sahip: string;
  guncellendi: string;
};

export async function ibanOku(
  kullanici: string,
): Promise<KayitliIban | undefined> {
  const hepsi = await oku<KayitliIban>(IBAN_DOSYA);
  return hepsi.find((i) => i.kullanici === kullanici);
}

export async function ibanYaz(
  kullanici: string,
  iban: string,
  sahip: string,
): Promise<KayitliIban> {
  return sirala(async () => {
    const hepsi = await oku<KayitliIban>(IBAN_DOSYA);
    const kayit: KayitliIban = {
      kullanici,
      iban,
      sahip,
      guncellendi: new Date().toISOString(),
    };
    await yaz(IBAN_DOSYA, [
      kayit,
      ...hepsi.filter((i) => i.kullanici !== kullanici),
    ]);
    return kayit;
  });
}

// ── Giriş bilgileri ───────────────────────────────────────────────────
// Parola hash'leri kullanıcı kaydından AYRI tutulur. `lib/kullanicilar.ts`
// profil ekranlarına gidiyor ve client bileşenlere prop olarak geçiyor;
// parola türevinin o yolun yanına bile uğramaması gerekir.

/** Bir hesabın giriş bilgisi. Parolanın kendisi DEĞİL, scrypt türevi. */
export type Kimlik = {
  kullanici: string;
  /** `lib/parola.ts` biçimindeki kayıt. */
  parolaHash: string;
  guncellendi: string;
};

/** Hesabın giriş kaydı — yoksa `undefined`. */
export async function kimlikOku(
  kullanici: string,
): Promise<Kimlik | undefined> {
  const hepsi = await oku<Kimlik>(KIMLIK_DOSYA);
  return hepsi.find((k) => k.kullanici === kullanici);
}

/** Hesabın parolasını belirler ya da değiştirir. */
export async function kimlikYaz(
  kullanici: string,
  parolaHash: string,
): Promise<void> {
  await sirala(async () => {
    const hepsi = await oku<Kimlik>(KIMLIK_DOSYA);
    const kayit: Kimlik = {
      kullanici,
      parolaHash,
      guncellendi: new Date().toISOString(),
    };
    await yaz(KIMLIK_DOSYA, [
      kayit,
      ...hepsi.filter((k) => k.kullanici !== kullanici),
    ]);
  });
}

/** Başlıktan URL'de kullanılabilir bir kimlik üretir; çakışırsa sonuna sayı ekler. */
export function slugUret(baslik: string, mevcut: string[]): string {
  const harita: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
  };
  const temel =
    baslik
      .toLocaleLowerCase("tr")
      .replace(/[çğıöşü]/g, (c) => harita[c] ?? c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "talep";

  if (!mevcut.includes(temel)) return temel;
  let n = 2;
  while (mevcut.includes(`${temel}-${n}`)) n++;
  return `${temel}-${n}`;
}
