import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SunumDetayClient } from "@/components/SunumDetayClient";
import { sunumGetir, talepGetir, kullaniciGetir } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sunum Detayı",
  description:
    "Satıcının sunumunu tam ekran incele: fotoğraflar, video, satıcı güven bilgileri ve teklif iste seçeneği.",
};

/**
 * `?id=<sunumId>` ZORUNLU: o sunum depodan okunur ve satıcı bilgileriyle
 * birlikte gösterilir. Eskiden bağlantı hep sabit örnek sunuma gidiyordu;
 * hangi karta tıklanırsa tıklansın aynı içerik açılıyordu.
 *
 * ID'siz istek artık 404. Eskiden bu dal `varsayilanSunum` sabitini —
 * uydurma bir Beyblade takımını — kullanıcının GERÇEK talebinin üstüne
 * bindirip gösteriyordu; yani ekranın yarısı gerçek, yarısı kurgu
 * oluyordu. Sunum karşılaştırma ekranındaki "Sunumu aç" bağlantısı da
 * id'siz olduğu için gerçek sunumları karşılaştıran kullanıcı bu kurgu
 * ekrana düşüyordu.
 */
export default async function SunumDetayPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) notFound();

  const sunum = await sunumGetir(id);
  if (!sunum) notFound();

  const talep = await talepGetir(sunum.talepId);
  const alici = talep ? await kullaniciGetir(talep.sahibi) : undefined;
  // Sunumu satıcısı açtığında sayfa "kendi sunumum" kipinde açılır:
  // fiyat "Sunum fiyatın" olur, alıcıya dönük aksiyonlar gizlenir.
  const sahip = (await istekKullaniciAdi()) === sunum.satici;

  return (
    <SunumDetayClient
      sahip={sahip}
      sunum={sunum}
      talep={talep}
      talepId={sunum.talepId}
      satici={sunum.satici}
      saticiHarf={sunum.harf}
      saticiPuan={sunum.puan}
      fotoAdlari={Array.from(
        { length: Math.max(0, sunum.fotolar) },
        (_, i) => `foto ${i + 1}`,
      )}
      // "1 gün önce gönderdi" kodda sabitti; damga kayıtta duruyor.
      gonderildi={sunum.olusturuldu}
      talepSahibi={talep?.sahibi ?? ""}
      talepSahibiHarf={alici?.harf ?? ""}
      talepSahibiPuan={alici?.puan.toLocaleString("tr-TR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}
    />
  );
}
