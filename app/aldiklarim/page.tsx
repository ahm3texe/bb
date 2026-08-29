import type { Metadata } from "next";
import { AlimSatimListesi } from "@/components/AlimSatimListesi";
import { islemlerGetir } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

// Kayıtlar kullanıcı akışında oluşur; her istekte taze okunur.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aldıklarım",
  description:
    "Tamamlanan alımların — ödemesi yapılmış ve teslimatı onaylanmış siparişler, toplam harcamanla birlikte.",
};

export default async function AldiklarimPage() {
  const ben = await istekKullaniciAdi();
  const islemler = await islemlerGetir(ben);
  return (
    <AlimSatimListesi tur="alim" islemler={islemler} oturumKullanici={ben} />
  );
}
