import { ImageResponse } from "next/og";

// Paylaşım kartı görseli — istek anında üretilir, statik dosya tutulmaz.
export const alt = "Bulbana — Sen iste, satıcı bulsun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Sitenin varsayılan OG görseli.
 *
 * `next/og` çalışma anında çizer; depoda 1200×630 bir PNG taşımak ve
 * tasarım değişince onu elle güncellemek gerekmiyor. Tek dış bağımlılığı
 * yok: renkler ve yazı tipi ölçüleri buraya gömülü.
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#2E1A47",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              background: "#7C3AED",
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            b
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>
            bulbana
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          Sen iste, satıcı bulsun.
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            fontWeight: 500,
            color: "#C9B8E0",
            maxWidth: 900,
          }}
        >
          İlanı alıcı açar, fiyatı alıcı belirler; satıcılar ürünleriyle talebe
          gelir.
        </div>
      </div>
    ),
    size,
  );
}
