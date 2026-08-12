"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Header/Footer gösterilmeyen tam ekran auth sayfaları.
const authRoutes = [
  "/giris",
  "/sifre-sifirlama",
  "/hos-geldin",
];

// Kendi çatısı olan iç araçlar — site Header/Footer'ı olmadan, tam genişlik.
const bareRoutes = ["/admin"];

/**
 * Uygulama çatısı: normal sayfalarda Header + Footer sarar; auth sayfalarında
 * (giriş vb.) bunları gizleyip içeriği tam ekran ortalar.
 */
export function Chrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAuth = authRoutes.some(
    (r) => pathname === r || pathname?.startsWith(`${r}/`),
  );
  const isBare = bareRoutes.some(
    (r) => pathname === r || pathname?.startsWith(`${r}/`),
  );

  if (isAuth) {
    return (
      <div
        key={pathname}
        className="flex min-h-screen w-full items-center justify-center"
      >
        {children}
      </div>
    );
  }

  if (isBare) {
    return (
      <div key={pathname} className="min-h-screen w-full">
        {children}
      </div>
    );
  }

  return (
    <>
      {header}
      <div key={pathname} className="animate-page-in flex-1">
        {children}
      </div>
      {footer}
    </>
  );
}
