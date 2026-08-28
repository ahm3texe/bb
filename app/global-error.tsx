"use client";

import { useEffect } from "react";

/**
 * Kök layout'un kendisi patlarsa `error.tsx` devreye giremez — Next bu durumda
 * global-error'ı kullanır ve layout'u atladığı için kendi <html>/<body>'sini
 * getirmesi gerekir. Header/Footer burada yok; tasarım token'ları da
 * yüklenmemiş olabileceğinden stiller satır içi verilir.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          textAlign: "center",
          background: "#f6f4fa",
          color: "#2e1a47",
          fontFamily:
            '"Helvetica Neue", Helvetica, -apple-system, system-ui, sans-serif',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
          Site şu anda yüklenemiyor.
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: 420,
            fontSize: 14,
            lineHeight: 1.6,
            color: "#615a77",
          }}
        >
          Beklenmedik bir hata oluştu. Birkaç saniye sonra tekrar denemeni
          öneririz.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            cursor: "pointer",
            border: "none",
            borderRadius: 12,
            background: "#7c3aed",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            padding: "13px 22px",
          }}
        >
          Tekrar Dene
        </button>
        {error.digest && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#787193" }}>
            Hata kodu: {error.digest}
          </span>
        )}
      </body>
    </html>
  );
}
