import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Chrome } from "@/components/Chrome";
import { OturumSaglayici } from "@/lib/aktif-kullanici";
import { istekOturumu } from "@/lib/oturum-sunucu";
import { kullaniciProfilGetir } from "@/lib/veri";
import { OnizlemeCubugu } from "@/components/OnizlemeCubugu";
import { onizlemeGecisiAcikMi } from "@/lib/onizleme";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Yayın adresi — sitemap ve robots ile aynı kaynak. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bulbana.com";

const BASLIK = "Bulbana — Sen iste, satıcı bulsun";
const ACIKLAMA =
  "Ters pazar: ilanı alıcı açar, fiyatı alıcı belirler; satıcılar ürünleriyle talebe gelir.";

export const metadata: Metadata = {
  // metadataBase olmadan görece OG/Twitter adresleri mutlak hâle gelmiyor
  // ve paylaşım kartı görselsiz kalıyor.
  metadataBase: new URL(SITE),
  title: {
    default: BASLIK,
    template: "%s · Bulbana",
  },
  description: ACIKLAMA,
  // Paylaşım kartı: ilan bağlantıları WhatsApp/X/Slack'te çıplak link
  // olarak görünüyordu — başlık, açıklama ve görsel yoktu.
  openGraph: {
    type: "website",
    siteName: "Bulbana",
    locale: "tr_TR",
    url: SITE,
    title: BASLIK,
    description: ACIKLAMA,
  },
  twitter: {
    card: "summary_large_image",
    title: BASLIK,
    description: ACIKLAMA,
  },
};

/**
 * Oturum, ağacın tepesinde BİR KEZ sunucuda çözülür ve aşağıya prop olarak
 * verilir. İstemci artık kimliği kendisi belirleyemez: oturum çerezi
 * `httpOnly` olduğu için JavaScript onu okuyamaz (bkz. lib/oturum-imza.ts).
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const oturum = await istekOturumu();
  /*
   * Oturum kaydı HESAPLANMIŞ profildir, sabit liste değil.
   *
   * Burada `getKullanici` çağrılıyordu: o kayıtta puan, değerlendirme
   * sayısı, tamamlanan alım/satış ve alıcı metrikleri HER ZAMAN 0'dır.
   * Kayıt tüm uygulamaya bu bağlamdan dağıldığı için Mali Tablom,
   * Aldıklarım, Sattıklarım ve başlıktaki hesap menüsü, kullanıcının
   * gerçek puanı 5,0 iken "★ 0,0 · 0 değerlendirme" ve "Kullanıcı kalitesi
   * henüz değerlendirilmedi" yazıyordu — aynı ekranın başka bir köşesinde
   * gerçek kazanç doğru hesaplanırken.
   *
   * Bedeli: her sayfa isteğinde profil hesaplanıyor (değerlendirme, işlem,
   * anlaşma ve mesaj tabloları okunuyor). Dosya tabanlı depoda kabul
   * edilebilir; Supabase geçişinde bu okuma tek sorguya inecek.
   */
  const kullanici = oturum
    ? ((await kullaniciProfilGetir(oturum)) ?? null)
    : null;

  return (
    <html lang="tr" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page text-ink-900">
        <OturumSaglayici kullanici={kullanici}>
          <Chrome header={<Header />} footer={<Footer />}>
            {children}
          </Chrome>
          {/* GEÇİCİ: parolasız hesap geçişi. Yalnızca
              BULBANA_ONIZLEME_GECISI=1 iken render edilir
              (bkz. lib/onizleme.ts). */}
          {onizlemeGecisiAcikMi() && <OnizlemeCubugu aktif={oturum} />}
        </OturumSaglayici>
      </body>
    </html>
  );
}
