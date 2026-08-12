"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Sayfa render'ında yakalanmamış bir hata oluştuğunda gösterilir.
 * Backend bağlandığında en sık tetikleyici ağ/API hataları olacak; bu yüzden
 * kullanıcıya "tekrar dene" yolu bırakılır — Next `reset()` ile segmenti
 * yeniden render eder, sayfa yenilemeye gerek kalmaz.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Üretimde burası hata toplama servisine bağlanır (Sentry vb.).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-danger-soft text-3xl font-extrabold text-danger">
        !
      </span>

      <h1 className="mt-[18px] text-pretty text-2xl font-extrabold leading-tight tracking-[-0.5px] text-ink-900">
        Bir şeyler ters gitti.
      </h1>
      <p className="mt-2.5 max-w-[440px] text-pretty text-sm font-medium leading-relaxed text-ink-500">
        Bu sayfa yüklenirken beklenmedik bir hata oluştu. Genellikle geçicidir —
        tekrar denemen sorunu çözebilir.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Button variant="primary" size="lg" onClick={reset}>
          Tekrar Dene
        </Button>
        <ButtonLink href="/" variant="secondary" size="lg">
          Ana Sayfaya Dön
        </ButtonLink>
      </div>

      <span className="mt-[26px] text-[11.5px] font-semibold leading-snug text-ink-300">
        {error.digest ? `Hata kodu: ${error.digest} · ` : ""}Sorun sürerse{" "}
        <Link href="/destek" className="font-bold">
          destek talebi oluştur
        </Link>
      </span>
    </main>
  );
}
