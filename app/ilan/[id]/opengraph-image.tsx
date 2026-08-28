import { ImageResponse } from "next/og";
import { talepGetir } from "@/lib/veri";

export const alt = "Bulbana ilanı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * İlana özel paylaşım kartı: başlık, alıcının belirlediği fiyat ve konum.
 *
 * Talep bulunamazsa genel kart çizilir — paylaşım görseli, silinmiş bir
 * ilan yüzünden 500 vermemeli.
 */
export default async function IlanOgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const talep = await talepGetir(id);

  const baslik = talep?.baslik ?? "Bulbana";
  const fiyat = talep ? `${talep.fiyatNum.toLocaleString("tr-TR")} TL` : "";
  const konum = talep ? `${talep.ilce}, ${talep.il}` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#2E1A47",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "#7C3AED",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            b
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#C9B8E0" }}>
            Aranan ürün
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 62,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            maxWidth: 1040,
          }}
        >
          {/* Uzun başlıklar karta sığmalı: kırpılıp üç nokta eklenir. */}
          {baslik.length > 84 ? `${baslik.slice(0, 84)}…` : baslik}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
          {fiyat ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#C9B8E0" }}>
                Alıcının belirlediği fiyat
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 52,
                  fontWeight: 800,
                  color: "#BEF264",
                }}
              >
                {fiyat}
              </div>
            </div>
          ) : null}
          {konum ? (
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#C9B8E0",
                paddingBottom: 10,
              }}
            >
              {konum}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
