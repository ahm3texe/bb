import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Chrome } from "@/components/Chrome";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bulbana — Sen iste, satıcı bulsun",
    template: "%s · Bulbana",
  },
  description:
    "Ters pazar: ilanı alıcı açar, fiyatı alıcı belirler; satıcılar ürünleriyle talebe gelir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page text-ink-900">
        <Chrome header={<Header />} footer={<Footer />}>
          {children}
        </Chrome>
      </body>
    </html>
  );
}
