// ── Alarm tetikleme ───────────────────────────────────────────────────
// Yeni talep yayınlandığında bütün aktif alarmlar taranır; eşleşen her
// alarm sahibine seçtiği kanaldan haber gider:
//   • "Uygulama" → zil/bildirimler sayfasına düşen bildirim
//   • "E-posta"  → hesabındaki adrese posta (bkz. lib/eposta.ts)

import {
  tumAlarmlarOku,
  alarmEslesmeYaz,
  bildirimEkle,
  taleplerOku,
  kimlik,
  type Alarm,
} from "./depo";
import { talepEslesiyorMu } from "./alarm-eslesme";
import { acikTalepler } from "./talep-durum";
import { epostaGonder } from "./eposta";
import type { Talep } from "./data";

const fiyatYaz = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

/**
 * Talebi alarmlarla eşleştirir ve bildirimleri yollar.
 * Talep sahibinin kendi alarmı tetiklenmez.
 * Hata durumunda talebin kaydı bozulmasın diye çağıran taraf bunu
 * bekletmeden çağırabilir; içeride tek tek hata yutulur.
 */
export async function alarmlariTetikle(talep: Talep): Promise<number> {
  let sayac = 0;
  const alarmlar = await tumAlarmlarOku();

  for (const alarm of alarmlar) {
    if (!alarm.aktif) continue;
    if (alarm.kullanici === talep.sahibi) continue;
    if (!alarm.filtre || !talepEslesiyorMu(alarm.filtre, talep)) continue;

    const href = `/ilan/${talep.id}`;
    try {
      await alarmEslesmeYaz(alarm.id, {
        baslik: talep.baslik,
        fiyat: fiyatYaz(talep.fiyatNum),
        zaman: "az önce",
        href,
      });
      if (alarm.kanallar?.uygulama !== false) await uygulamaBildirimi(alarm, talep, href);
      if (alarm.kanallar?.eposta) await alarmEpostasi(alarm, talep, href);
      sayac += 1;
    } catch {
      // Tek bir alarmın hatası diğerlerini durdurmasın.
    }
  }
  return sayac;
}

async function uygulamaBildirimi(alarm: Alarm, talep: Talep, href: string) {
  await bildirimEkle({
    id: kimlik(),
    kime: alarm.kullanici,
    grup: "Bugün",
    tip: "sistem",
    harf: "🔔",
    avatar: "bg-accent text-ink-900",
    text: `Alarmına uyan yeni talep: ${talep.baslik}`,
    sub: `${alarm.ad} · ${fiyatYaz(talep.fiyatNum)} · ${talep.ilce}, ${talep.il}`,
    zaman: "az önce",
    href,
    yeni: true,
  });
}

async function alarmEpostasi(alarm: Alarm, talep: Talep, href: string) {
  await epostaGonder({
    kime: alarm.eposta ?? "",
    konu: `Alarmına uyan yeni talep: ${talep.baslik}`,
    govde: [
      `"${alarm.ad}" alarmın için yeni bir talep yayınlandı.`,
      "",
      `Talep: ${talep.baslik}`,
      `Bütçe: ${fiyatYaz(talep.fiyatNum)}`,
      `Konum: ${talep.ilce}, ${talep.il}`,
      `Kriterler: ${alarm.kriterler.join(" · ")}`,
      "",
      `Talebi gör: ${href}`,
    ].join("\n"),
  });
}


/** Yeni kurulan alarmın ilk taramasında ayrı ayrı bildirilecek talep sayısı. */
const ILK_TARAMA_BILDIRIM = 10;

/**
 * Alarm kurulduğu anda yayındaki talepleri tarar: alarm daha önce
 * kurulmadığı için kaçırılmış fırsatlar da sahibine ulaşsın.
 *
 * En yeni eşleşmeler için tek tek bildirim gider (üst sınır
 * ILK_TARAMA_BILDIRIM), fazlası tek özet bildirimde toplanır; e-posta ise
 * her hâlükârda tek bir özet posta olarak yollanır — kutu dolmasın.
 */
export async function mevcutTalepleriTara(alarm: Alarm): Promise<number> {
  if (!alarm.aktif || !alarm.filtre) return 0;

  // `acikTalepler` süzgeci ŞART: ham depo okuması silinmiş, dondurulmuş ve
  // kapanmış ilanları da döndürüyor. Süzgeç uygulanmadığında yeni kurulan
  // alarm, yayından kalkmış ilanların başlığını ve fiyatını sahibine
  // bildiriyor ve bildirimdeki /ilan/<id> bağlantısı ölü çıkıyordu.
  // Diğer tüm okuma yolları zaten bu süzgeçten geçiyor.
  const talepler = acikTalepler(await taleplerOku()).filter(
    (t) => t.sahibi !== alarm.kullanici && talepEslesiyorMu(alarm.filtre, t),
  );
  if (talepler.length === 0) return 0;

  // taleplerOku en yeni talebi başa koyar; ilk sıradakiler en tazeler.
  const ilkler = talepler.slice(0, ILK_TARAMA_BILDIRIM);
  const kalan = talepler.length - ilkler.length;

  await alarmEslesmeYaz(
    alarm.id,
    {
      baslik: talepler[0].baslik,
      fiyat: fiyatYaz(talepler[0].fiyatNum),
      zaman: "yayında",
      href: `/ilan/${talepler[0].id}`,
    },
    talepler.length,
  );

  if (alarm.kanallar?.uygulama !== false) {
    for (const talep of ilkler)
      await uygulamaBildirimi(alarm, talep, `/ilan/${talep.id}`);
    if (kalan > 0)
      await bildirimEkle({
        id: kimlik(),
        kime: alarm.kullanici,
        grup: "Bugün",
        tip: "sistem",
        harf: "🔔",
        avatar: "bg-accent text-ink-900",
        text: `Alarmına uyan ${kalan} talep daha yayında`,
        sub: `${alarm.ad} · hepsini keşfet sayfasında gör`,
        zaman: "az önce",
        href: "/kesfet",
        yeni: true,
      });
  }

  if (alarm.kanallar?.eposta)
    await epostaGonder({
      kime: alarm.eposta ?? "",
      konu: `"${alarm.ad}" alarmına uyan ${talepler.length} talep zaten yayında`,
      govde: [
        `Alarmını kurdun ve kriterlerine uyan ${talepler.length} talep şu an yayında:`,
        "",
        ...ilkler.map(
          (t) =>
            `• ${t.baslik} — ${fiyatYaz(t.fiyatNum)} — ${t.ilce}, ${t.il} (/ilan/${t.id})`,
        ),
        ...(kalan > 0 ? ["", `…ve ${kalan} talep daha.`] : []),
      ].join("\n"),
    });

  return talepler.length;
}
