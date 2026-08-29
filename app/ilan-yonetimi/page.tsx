import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IlanYonetimiClient } from "@/components/IlanYonetimiClient";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { oturumTalepleriGetir, talepIstatistikleri } from "@/lib/veri";

export const metadata: Metadata = {
  title: "İlan Yönetimi",
  description:
    "İlanına gelen sunumları, takip sayısını ve süresini izle; duraklat, yeniden yayına al ya da yayından kaldır.",
};

// Yönetilen ilan kullanıcının kendi talebi; her istekte taze okunur.
export const dynamic = "force-dynamic";

/**
 * `?id=<talepId>` ile hangi ilanın yönetileceği seçilir.
 *
 * Sayfa bir dönem HER ZAMAN kullanıcının ilk talebini açıyordu: birden
 * fazla ilanı olan kişi diğerlerini ne görebiliyor ne yönetebiliyordu ve
 * ilanı seçmenin bir yolu da yoktu. Daha kötüsü, ekranın başka yerlerinden
 * gelen "İlanım: <başlık>" ve "İlan Yönetimi'nden düzenle" bağlantıları da
 * id taşımadığı için tıklanan ilan ile açılan ilan farklı olabiliyordu.
 *
 * id verilmezse en yeni ilan açılır (depo en yeniyi başa koyar); bileşen
 * kullanıcının diğer ilanları arasında geçiş yapabileceği bir seçici gösterir.
 */
export default async function IlanYonetimiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const ben = await istekKullaniciAdi();
  const talepler = await oturumTalepleriGetir(ben);

  // Sahiplik: liste zaten yalnızca kullanıcının talepleri olduğu için
  // başkasının ilanı buradan yönetilemez — bulunamayan id 404 olur.
  const talep = id ? talepler.find((t) => t.id === id) : talepler[0];
  if (id && !talep) notFound();

  const istatistik = talep ? await talepIstatistikleri(talep.id) : undefined;

  return (
    <IlanYonetimiClient
      talep={talep}
      istatistik={istatistik}
      // Seçici yalnızca birden fazla ilan varsa görünür; sunucudan yalnızca
      // seçim için gereken iki alan iner.
      ilanlarim={talepler.map((t) => ({ id: t.id, baslik: t.baslik }))}
    />
  );
}
