import type { Metadata } from "next";
import { AlimSatimListesi } from "@/components/AlimSatimListesi";
import { islemlerGetir, aktarimlarimGetir } from "@/lib/veri";
import { aktarilanTutar } from "@/lib/aktarim";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

// Kayıtlar kullanıcı akışında oluşur; her istekte taze okunur.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sattıklarım",
  description:
    "Tamamlanan satışların — bedeli tahsil edilmiş siparişler, brüt ciro, komisyon ve net kazancınla birlikte.",
};

export default async function SattiklarimPage() {
  const ben = await istekKullaniciAdi();
  const [islemler, aktarimlar] = await Promise.all([
    islemlerGetir(ben),
    aktarimlarimGetir(ben),
  ]);
  return (
    <AlimSatimListesi
      tur="satis"
      islemler={islemler}
      oturumKullanici={ben}
      // Para etiketi ("Bakiyede" / "IBAN'a aktarıldı") kayda yazılmaz;
      // aktarım defterinden türetilir (bkz. lib/islemler.ts → paraDurumlari).
      aktarilanToplam={aktarilanTutar(aktarimlar)}
    />
  );
}
