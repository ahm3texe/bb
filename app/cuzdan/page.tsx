import type { Metadata } from "next";
import { CuzdanClient } from "@/components/CuzdanClient";
import { islemlerGetir } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mali Tablom",
  description:
    "Tamamlanan alım ve satışlarının tek tabloda dökümü — toplam harcaman, net kazancın ve net durumun.",
};

export default async function CuzdanPage() {
  const ben = await istekKullaniciAdi();
  const islemler = await islemlerGetir(ben);
  return <CuzdanClient islemler={islemler} oturumKullanici={ben} />;
}
