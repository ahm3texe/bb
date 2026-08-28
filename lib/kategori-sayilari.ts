"use client";

import { useEffect, useState } from "react";

/**
 * Kategori başına açık talep sayısı — sunucudan.
 *
 * Sabit `Kategori.sayi` alanı tohum verisinden kalmaydı ve gerçek
 * taleplerle ilgisi yoktu: site boşken bile "3 açık talep" yazıyordu.
 * İstek başarısız olursa sayı gösterilmez (undefined) — yanlış sayı
 * göstermektense hiç göstermemek doğru.
 */
export function useKategoriSayilari(): Record<string, number> | undefined {
  const [sayilar, setSayilar] = useState<Record<string, number>>();

  useEffect(() => {
    let iptal = false;
    fetch("/api/kategori-sayilari")
      .then((r) => (r.ok ? r.json() : { sayilar: undefined }))
      .then((v: { sayilar?: Record<string, number> }) => {
        if (!iptal) setSayilar(v.sayilar);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  return sayilar;
}
