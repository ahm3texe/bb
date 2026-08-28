import type { MetadataRoute } from "next";
import { taleplerGetir } from "@/lib/veri";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bulbana.com";

/**
 * Site haritası: sabit sayfalar + yayındaki talepler.
 * Kapanan/dondurulan talepler `taleplerGetir()` tarafından zaten elenir.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sabit = [
    "",
    "/kesfet",
    "/nasil-calisir",
    "/hakkimizda",
    "/yardim",
    "/guvenli-alisveris",
    "/ilan-kurallari",
    "/sozlesmeler",
    "/site-haritasi",
  ].map((yol) => ({
    url: `${SITE}${yol}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: yol === "" ? 1 : 0.6,
  }));

  const talepler = (await taleplerGetir()).map((t) => ({
    url: `${SITE}/ilan/${t.id}`,
    lastModified: t.olusturuldu ? new Date(t.olusturuldu) : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...sabit, ...talepler];
}
