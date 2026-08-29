import type { Metadata } from "next";
import { ProfilClient } from "@/components/ProfilClient";
import { kullaniciMetrikleriGetir } from "@/lib/veri";
import {
  tumTaleplerGetir,
  gelenSunumlarGetir,
  gonderdigimSunumlarGetir,
  kullaniciProfilGetir,
  surenSiparisTalepIdleri,
} from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

// Profil verisi (talepler, gelen sunumlar, sunumlarım) her istekte tazelenir:
// yeni gönderilen sunum, önbellekten gelen eski sayfada görünmüyordu.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profilim",
  description:
    "melih.k profili — talepler, gönderilen sunumlar, takip edilenler ve değerlendirmeler tek yerde.",
};

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const ben = await istekKullaniciAdi();
  const [talepler, gelenSunumlar, sunumlarim, surenTalepler] = await Promise.all([
    tumTaleplerGetir(),
    gelenSunumlarGetir(ben),
    gonderdigimSunumlarGetir(ben),
    // Siparişi süren talepler yeniden yayına alınamaz; düğme onlarda çıkmaz.
    surenSiparisTalepIdleri(),
  ]);
  // Kullanıcının aldığı değerlendirmeler — profil kartındaki puan ve
  // "Değerlendirmeler" sekmesi bunlardan beslenir.
  const profil = await kullaniciProfilGetir(ben);
  // Düşen siparişlerin gerekçesi: sayı zaten görünüyordu ama nedeni
  // hiçbir yerde yazmıyordu (bkz. lib/iptal.ts → SEBEP_METNI).
  const { kusurlar } = await kullaniciMetrikleriGetir(ben);
  // key: ?tab= değişince panel state'i yeniden kurulur (kimlik kartındaki
  // "15 değerlendirme" bağlantısı aynı sayfadayken de paneli açar).
  return (
    <ProfilClient
      key={tab ?? "talepler"}
      baslangicTab={tab}
      oturumKullanici={ben}
      talepler={talepler}
      gelenSunumlar={gelenSunumlar}
      sunumlarim={sunumlarim}
      surenTalepler={surenTalepler}
      yorumlar={profil?.yorumlar ?? []}
      puan={profil?.puan ?? 0}
      degerlendirmeSayisi={profil?.degerlendirme ?? 0}
      metrik={profil?.aliciMetrik}
      kusurlar={kusurlar}
    />
  );
}
