import { NextResponse } from "next/server";
import { taleplerOku, talepEkle, teslimatYaz } from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { alarmlariTetikle } from "@/lib/alarm-tetikle";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { acikTalepler } from "@/lib/talep-durum";
import { gorselleriSuz } from "@/lib/gorsel";
import { paraTutari, MAX_FIYAT } from "@/lib/para";
import { tekSatir, cokSatir, BASLIK_SINIR, BASLIK_EN_AZ } from "@/lib/metin";
import type { Talep } from "@/lib/data";

// Depo dosya sistemine yazdığı için bu uç her zaman dinamik çalışmalı.
export const dynamic = "force-dynamic";

/**
 * Yayındaki talepler — en yeni önce.
 *
 * `acikTalepler` filtresi ŞART: ham depo okuması yumuşak silinmiş
 * (`silindi`), dondurulmuş ve kapanmış ilanları da döndürüyordu. Sunucu
 * tarafındaki `lib/veri.ts` bu filtreden geçiyordu, bu uç geçmiyordu —
 * yani kaldırılmış ilanlar herkese açık JSON olarak okunabiliyordu.
 */
export async function GET() {
  const talepler = acikTalepler(await taleplerOku());
  return NextResponse.json({ talepler });
}

export async function POST(istek: Request) {
  // Aynı hesap saatte en fazla 20 talep açabilir.
  const kullanici = await istekKullaniciAdi();
  const hiz = hizSinirla(`talep:${kullanici}`, 20, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      {
        hata: `Çok fazla talep açtın. ${Math.ceil(hiz.kalanSaniye / 60)} dakika sonra tekrar dene.`,
      },
      { status: 429 },
    );

  let govde: Record<string, unknown>;
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json(
      { hata: "Geçersiz istek gövdesi." },
      { status: 400 },
    );
  }

  const baslik = tekSatir(govde.baslik, BASLIK_SINIR);
  const aciklama = cokSatir(govde.aciklama, 500);
  const kategori = tekSatir(govde.kategori, 40);
  // Tutar tek yerden doğrulanır: kesir yuvarlanır, tip zorlaması reddedilir.
  const fiyatNum = paraTutari(govde.fiyatNum);
  // Yalnızca yükleme ucunun ürettiği yollar kabul edilir; gövdeden gelen
  // keyfi metin (dış adres, javascript:, ../) kayda giremez.
  const gorseller = gorselleriSuz(govde.gorseller, 6);

  // Sunucu tarafı doğrulama — istemcideki kontrole güvenilmez.
  const hatalar: string[] = [];
  if (baslik.length < BASLIK_EN_AZ)
    hatalar.push(`Başlık en az ${BASLIK_EN_AZ} karakter olmalı.`);
  if (aciklama.length < 30)
    hatalar.push("Talep notu en az 30 karakter olmalı.");
  if (!kategori) hatalar.push("Kategori seçilmeli.");
  if (fiyatNum === null)
    hatalar.push(
      `Geçerli bir fiyat girilmeli (en fazla ${MAX_FIYAT.toLocaleString("tr-TR")} TL).`,
    );
  if (gorseller.length === 0)
    hatalar.push("En az bir fotoğraf veya video eklenmeli.");
  /*
   * Defo yanıtı ZORUNLU (bkz. components/IlanAcForm.tsx → defoOk).
   * Alan boş bırakılabildiği sürece `defoKabul` `undefined` kalıyor ve
   * ekranların çoğu onu "Defosuz olmalı" diye okuyordu: alıcının hiç
   * vermediği yanıt satıcıya kesin bir şart olarak gösteriliyordu.
   * İstemcideki kontrole güvenilmez, kural burada da uygulanır.
   */
  if (typeof govde.defoKabul !== "boolean")
    hatalar.push("Üründe defo kabul edip etmediğin belirtilmeli.");

  if (hatalar.length) {
    return NextResponse.json({ hata: hatalar[0], hatalar }, { status: 400 });
  }

  const talep: Talep = {
    // Gerçek kimlik `talepEkle` içinde, yazma kilidinin altında üretilir;
    // burada üretmek aynı başlıkla gelen eşzamanlı iki isteğe aynı slug'ı
    // verebiliyordu. Bu değer yalnızca yer tutucudur.
    id: "",
    baslik,
    aciklama,
    kategori,
    // `hatalar` boşsa fiyat doğrulanmıştır (yukarıda erken dönülür).
    fiyatNum: fiyatNum!,
    tur: tekSatir(govde.tur, 40) || undefined,
    cesit: tekSatir(govde.cesit, 40) || undefined,
    marka: tekSatir(govde.marka, 40),
    model: tekSatir(govde.model, 40) || undefined,
    yil: tekSatir(govde.yil, 4) || undefined,
    renk: tekSatir(govde.renk, 30) || undefined,
    il: tekSatir(govde.il, 40),
    ilce: tekSatir(govde.ilce, 40),
    mahalle: tekSatir(govde.mahalle, 60) || undefined,
    durum: tekSatir(govde.durum, 80) || "Hepsi",
    durumlar: Array.isArray(govde.durumlar)
      ? govde.durumlar
          // Öğe başına uzunluk sınırı yoktu: 8 öğe sayılıyor ama her biri
          // megabaytlarca metin olabiliyordu.
          .map((d) => tekSatir(d, 40))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    sahibi: kullanici,
    olusturuldu: new Date().toISOString(),
    sunum: 0,
    gun: 30,
    eklendi: 0,
    acil: govde.acil === true || undefined,
    pazarlik: govde.pazarlik === true || undefined,
    muadilKabul: govde.muadilKabul === true || undefined,
    // Yukarıda doğrulandı: bu noktada boolean olduğu kesin.
    defoKabul: govde.defoKabul as boolean,
    gorseller,
  };

  // Kesinleşmiş kayıt: kimliği depo verdi.
  const kayit = await talepEkle(talep);

  // Tam adres talebin içinde DEĞİL, ayrı kayıtta saklanır: ilan sayfasında
  // yalnızca il/ilçe/mahalle görünür, kapı numarası anlaşma sonrası
  // satıcıya açılır (bkz. lib/teslimat.ts).
  await teslimatYaz({
    talepId: kayit.id,
    alici: kayit.sahibi,
    il: kayit.il,
    ilce: kayit.ilce,
    mahalle: kayit.mahalle ?? "",
    cadde: tekSatir(govde.cadde, 80),
    apartman: tekSatir(govde.apartman, 60),
    kat: tekSatir(govde.kat, 10),
    daire: tekSatir(govde.daire, 10),
    tarif: cokSatir(govde.konumTarifi, 160),
  }).catch(() => undefined);

  // Talep yayına girer girmez eşleşen alarmların sahiplerine haber gider.
  // Bildirim gönderimi talebin kaydını etkilememeli: hatası yutulur.
  const uyanAlarm = await alarmlariTetikle(kayit).catch(() => 0);

  return NextResponse.json({ talep: kayit, uyanAlarm }, { status: 201 });
}
