import type { MetadataRoute } from "next";

/** Arama motorlarına açık olan ve olmayan yollar. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Hesaba özel ve işlem yürüten sayfalar dizine girmemeli.
      disallow: [
        "/api/",
        "/profil",
        "/mesajlar",
        "/cuzdan",
        "/aldiklarim",
        "/sattiklarim",
        "/ayarlar",
        "/odeme",
        "/islem",
        "/sunum-detay",
        "/sunum-yap",
        "/ilan-ac",
        "/destek",
        "/admin",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}

/** Yayın adresi — dağıtımda NEXT_PUBLIC_SITE_URL ile verilir. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bulbana.com";
