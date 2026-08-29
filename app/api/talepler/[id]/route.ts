import { NextResponse } from "next/server";
import {
  talepYayindanKaldir,
  talepKaliciSil,
  talepGuncelle,
} from "@/lib/depo";
import type { Talep } from "@/lib/data";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { gorselleriSuz } from "@/lib/gorsel";
import { paraTutari, MAX_FIYAT } from "@/lib/para";
import {
  tekSatir,
  cokSatir,
  BASLIK_SINIR,
  BASLIK_EN_AZ,
} from "@/lib/metin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Talebi yayından kaldırır. Yalnızca ilan sahibi kaldırabilir — sahiplik
 * kontrolü depoda yapılır, yani bu uç atlanarak başka bir yoldan da ihlal
 * edilemez. Kayıt SİLİNMEZ; kaldırma damgası ve gerekçesi yazılır.
 */
/** Talebin içeriğini günceller — düzenleme formu buraya yazar. */
export async function PATCH(istek: Request, { params }: Params) {
  const { id } = await params;

  // Düzenleme de yazma: POST'ta saatlik sınır varken burada yoktu ve her
  // güncelleme talepler dosyasının tamamını yeniden yazıyor.
  const isteyen = await istekKullaniciAdi();
  const hiz = hizSinirla(`talep-duzenle:${isteyen}`, 60, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla düzenleme yaptın. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;

  // Tanımsız ile boş metni ayırmak gerekiyor: alan gönderilmediyse
  // dokunulmamalı, boş gönderildiyse temizlenmeli.
  const metin = (d: unknown, n: number) =>
    d === undefined ? undefined : tekSatir(d, n);
  const metinCok = (d: unknown, n: number) =>
    d === undefined ? undefined : cokSatir(d, n);
  // Öğe başına uzunluk sınırı da olmalı: sayı sınırlıyken her öğe
  // sınırsız uzunlukta olabiliyordu.
  const dizi = (d: unknown, n: number, uzunluk = 40) =>
    Array.isArray(d)
      ? d
          .map((x) => tekSatir(x, uzunluk))
          .filter(Boolean)
          .slice(0, n)
      : undefined;

  // Beyaz liste: yalnızca kullanıcının değiştirebileceği alanlar.
  const veri: Partial<Talep> = {};
  const ata = <K extends keyof Talep>(k: K, v: Talep[K] | undefined) => {
    if (v !== undefined) veri[k] = v;
  };
  // ALT SINIR BURADA DA UYGULANIR. POST başlığı en az BASLIK_EN_AZ
  // karakter isterken düzenleme yolunda hiçbir kontrol yoktu: yayındaki
  // bir ilanın başlığı tek harfe indirilebiliyordu ve kart, arama sonucu,
  // sohbet başlığı, paylaşım kartı — hepsi o harfi gösteriyordu.
  const yeniBaslik = metin(g.baslik, BASLIK_SINIR);
  if (yeniBaslik !== undefined && yeniBaslik.length < BASLIK_EN_AZ)
    return NextResponse.json(
      { hata: `Başlık en az ${BASLIK_EN_AZ} karakter olmalı.` },
      { status: 400 },
    );
  ata("baslik", yeniBaslik);
  ata("aciklama", metinCok(g.aciklama, 500));
  ata("kategori", metin(g.kategori, 40));
  ata("tur", metin(g.tur, 40));
  ata("cesit", metin(g.cesit, 40));
  ata("marka", metin(g.marka, 40));
  ata("model", metin(g.model, 40));
  // Sınır POST ile aynı olmalı: orada 4, burada 30 idi.
  ata("yil", metin(g.yil, 4));
  ata("renk", metin(g.renk, 30));
  ata("il", metin(g.il, 40));
  ata("ilce", metin(g.ilce, 40));
  ata("mahalle", metin(g.mahalle, 60));
  ata("durum", metin(g.durum, 80));
  ata("durumlar", dizi(g.durumlar, 8));
  // Görseller POST ile aynı süzgeçten geçer: düzenleme yoluyla keyfi bir
  // adres kayda giremez.
  if (Array.isArray(g.gorseller)) veri.gorseller = gorselleriSuz(g.gorseller, 6);
  // POST ile aynı doğrulama: üst bant burada da uygulanmalıydı, yalnızca
  // yuvarlama vardı.
  const yeniFiyat = paraTutari(g.fiyatNum);
  if (g.fiyatNum !== undefined && yeniFiyat === null)
    return NextResponse.json(
      {
        hata: `Geçerli bir fiyat girilmeli (en fazla ${MAX_FIYAT.toLocaleString("tr-TR")} TL).`,
      },
      { status: 400 },
    );
  if (yeniFiyat !== null) veri.fiyatNum = yeniFiyat;
  if (typeof g.acil === "boolean") veri.acil = g.acil || undefined;
  if (typeof g.pazarlik === "boolean") veri.pazarlik = g.pazarlik || undefined;
  if (typeof g.muadilKabul === "boolean") veri.muadilKabul = g.muadilKabul;
  if (typeof g.defoKabul === "boolean") veri.defoKabul = g.defoKabul;

  const sonuc = await talepGuncelle(id, isteyen, veri);
  if (sonuc === "bulunamadi")
    return NextResponse.json({ hata: "Talep bulunamadı." }, { status: 404 });
  if (sonuc === "yetkisiz")
    return NextResponse.json(
      { hata: "Bu talebi yalnızca sahibi düzenleyebilir." },
      { status: 403 },
    );
  if (sonuc === "duzenlenemez")
    return NextResponse.json(
      {
        hata:
          "Alışverişe dönüşmüş, kapanmış ya da yayından kaldırılmış talep düzenlenemez.",
      },
      { status: 409 },
    );
  return NextResponse.json({ talep: sonuc });
}

export async function DELETE(istek: Request, { params }: Params) {
  const { id } = await params;
  const ben = await istekKullaniciAdi();

  /**
   * `?kalici=1` → kaydı tamamen siler. İki aşamalı silmenin ikinci adımı:
   * talep önce yayından kalkar, kullanıcı isterse "Yayından Kalkanlar"
   * bölümünden kalıcı olarak siler. Geri alınamaz bir işlem tek tıkla
   * yapılmamalı.
   */
  if (new URL(istek.url).searchParams.get("kalici") === "1") {
    const kalici = await talepKaliciSil(id, ben);
    if (kalici === "bulunamadi")
      return NextResponse.json({ hata: "Talep bulunamadı." }, { status: 404 });
    if (kalici === "yetkisiz")
      return NextResponse.json(
        { hata: "Bu ilanı yalnızca sahibi silebilir." },
        { status: 403 },
      );
    if (kalici === "yayinda")
      return NextResponse.json(
        { hata: "Önce talebi yayından kaldırman gerekiyor." },
        { status: 409 },
      );
    if (kalici === "alisverise-donustu")
      return NextResponse.json(
        {
          hata:
            "Bu talep bir alışverişe dönüştü; kaydı kalıcı olarak silinemez. Sipariş ve sohbet geçmişi iki tarafta da durmalı.",
        },
        { status: 409 },
      );
    return NextResponse.json({ silindi: id });
  }

  const sonuc = await talepYayindanKaldir(id, ben);

  if (sonuc === "bulunamadi") {
    return NextResponse.json({ hata: "Talep bulunamadı." }, { status: 404 });
  }
  if (sonuc === "itiraz-suruyor") {
    return NextResponse.json(
      {
        hata:
          "Bu talepte itiraz süreci sürüyor. İtiraz süreci tamamlanmadan bu talep yayından kaldırılamaz.",
      },
      { status: 409 },
    );
  }
  if (sonuc === "yetkisiz") {
    return NextResponse.json(
      { hata: "Bu ilanı yalnızca sahibi kaldırabilir." },
      { status: 403 },
    );
  }
  // Talep kayıt olarak durur, yalnızca yayından kalkar — bu yüzden yanıt da
  // "silindi" demiyor (bkz. lib/depo.ts → talepYayindanKaldir).
  return NextResponse.json({ kaldirildi: id });
}
