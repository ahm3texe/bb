import { NextResponse } from "next/server";
import {
  alarmlarOku,
  alarmEkle,
  metinKimlik,
  hesapEpostasiOku,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { BOS_FILTRE, EN_FAZLA_ALARM } from "@/lib/alarm-eslesme";
import { mevcutTalepleriTara } from "@/lib/alarm-tetikle";
import type { AlarmFiltre } from "@/lib/alarm-eslesme";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ alarmlar: await alarmlarOku(await istekKullaniciAdi()) });
}

/** Yeni talep alarmı kurar. */
export async function POST(istek: Request) {
  let govde: Record<string, unknown>;
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const ad = tekSatir(govde.ad, 80);
  // Öğe SAYISI sınırlıydı ama öğe UZUNLUĞU değil: 12 tane sınırsız metin
  // yazılabiliyordu.
  const kriterler = Array.isArray(govde.kriterler)
    ? govde.kriterler
        .map((k) => tekSatir(k, 60))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  if (!ad)
    return NextResponse.json({ hata: "Alarma bir ad ver." }, { status: 400 });

  // Kanal seçimi: en az biri açık olmalı, yoksa alarm kimseye ulaşmaz.
  const kanalGovde = (govde.kanallar ?? {}) as Record<string, unknown>;
  const kanallar = {
    uygulama: kanalGovde.uygulama !== false,
    eposta: kanalGovde.eposta === true,
  };
  if (!kanallar.uygulama && !kanallar.eposta)
    return NextResponse.json(
      { hata: "En az bir bildirim kanalı seç." },
      { status: 400 },
    );

  // E-posta adresi İSTEMCİDEN ALINMAZ: hesabın kendi kaydından okunur.
  // Aksi halde başkasının adresine bildirim yönlendirilebilirdi.
  const kullanici = await istekKullaniciAdi();
  // Adresin DOĞRULANMIŞ olması şart: doğrulanmamış bir adrese kurulan alarm
  // sessizce hiçbir yere ulaşmayan bir kanalla çalışmış olurdu.
  const epostaKayit = await hesapEpostasiOku(kullanici);
  const eposta = epostaKayit?.dogrulandi ? epostaKayit.adres : "";
  if (kanallar.eposta && !eposta.includes("@"))
    return NextResponse.json(
      {
        hata:
          "E-posta bildirimi için önce Ayarlar > Bildirim tercihleri'nden adresini doğrulaman gerekiyor.",
      },
      { status: 400 },
    );

  const filtre: AlarmFiltre = { ...BOS_FILTRE, ...temizFiltre(govde.filtre) };

  // Ters fiyat aralığı hiçbir talebe uymaz: alarm sessizce ölü doğar ve
  // kullanıcı neden bildirim gelmediğini anlayamaz.
  if (
    filtre.minFiyat !== null &&
    filtre.maxFiyat !== null &&
    filtre.minFiyat > filtre.maxFiyat
  )
    return NextResponse.json(
      { hata: "En düşük fiyat, en yüksek fiyattan büyük olamaz." },
      { status: 400 },
    );

  const alarm = await alarmEkle({
    id: metinKimlik("alarm"),
    kullanici,
    ad,
    kriterler,
    filtre,
    aktif: true,
    // Ekranda görünen kanal etiketi. Diğer tüm metinler sınırlıyken bu
    // alan sınırsızdı.
    kanal: tekSatir(govde.kanal, 40) || "Uygulama",
    kanallar,
    eposta,
    eslesme: 0,
    son: null,
    zaman: new Date().toISOString(),
  });

  if (alarm === "sinir-doldu")
    return NextResponse.json(
      {
        hata: `En fazla ${EN_FAZLA_ALARM} alarm kurabilirsin. Yeni alarm için önce birini kaldır.`,
      },
      { status: 409 },
    );
  // Alarm kurulmadan önce yayınlanmış talepler de sahibine bildirilir.
  // Hatası alarmın kurulmasını engellememeli.
  const gecmisEslesme = await mevcutTalepleriTara(alarm).catch(() => 0);

  // Tarama sayacı ve son eşleşmeyi güncellediği için alarmın güncel hali
  // döndürülür; liste sayfa yenilenmeden doğru görünsün.
  const guncel =
    (await alarmlarOku(alarm.kullanici)).find((a) => a.id === alarm.id) ?? alarm;

  return NextResponse.json({ alarm: guncel, gecmisEslesme }, { status: 201 });
}

/** Gövdeden gelen filtreyi tip güvenli hale getirir. */
function temizFiltre(ham: unknown): Partial<AlarmFiltre> {
  if (!ham || typeof ham !== "object") return {};
  const g = ham as Record<string, unknown>;
  const yazi = (d: unknown, n = 60) => tekSatir(d, n);
  const dizi = (d: unknown, adet: number, uzunluk = 60) =>
    Array.isArray(d)
      ? d
          .map((x) => tekSatir(x, uzunluk))
          .filter(Boolean)
          .slice(0, adet)
      : [];
  const sayi = (d: unknown) =>
    typeof d === "number" && Number.isFinite(d) && d >= 0 ? d : null;

  return {
    kategori: yazi(g.kategori, 40),
    tur: yazi(g.tur, 40),
    cesit: yazi(g.cesit, 40),
    marka: yazi(g.marka, 40),
    model: yazi(g.model, 40),
    yil: yazi(g.yil, 30),
    renk: yazi(g.renk, 30),
    kelimeler: dizi(g.kelimeler, 30, 40),
    durumlar: dizi(g.durumlar, 8, 40),
    defolar: dizi(g.defolar, 2, 20),
    muadil: typeof g.muadil === "boolean" ? g.muadil : null,
    minFiyat: sayi(g.minFiyat),
    maxFiyat: sayi(g.maxFiyat),
    konumlar: Array.isArray(g.konumlar)
      ? g.konumlar
          .filter((k): k is Record<string, unknown> => !!k && typeof k === "object")
          .map((k) => ({ il: yazi(k.il, 40), ilce: yazi(k.ilce, 40) }))
          .filter((k) => k.il)
          .slice(0, 5)
      : [],
  };
}
