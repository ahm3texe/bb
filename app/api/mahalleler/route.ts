import { NextResponse } from "next/server";
import {
  getCities,
  getDistrictsAndNeighbourhoodsByCityCode,
} from "turkey-neighbourhoods";
import { karsilastirmaAnahtari } from "@/lib/metin";

// Mahalle verisi (~5 MB) istemci paketine girmesin diye sunucuda tutulur;
// form, il + ilçe seçilince buradan çeker.
export const runtime = "nodejs";

// "Kâhta" ↔ "Kahta", "Istanbul" ↔ "İstanbul" gibi yazım farklarını tolere
// eder. Buradaki eski normalize düzeltme işaretlerini katlıyordu ama Türkçe
// I/İ tuzağını kapatmıyordu: "Istanbul" → "ıstanbul" olup eşleşmiyordu.
const normalize = karsilastirmaAnahtari;

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const il = searchParams.get("il") ?? "";
  const ilce = searchParams.get("ilce") ?? "";
  if (!il || !ilce) {
    return NextResponse.json({ mahalleler: [] });
  }

  const sehir = getCities().find((c) => normalize(c.name) === normalize(il));
  if (!sehir) return NextResponse.json({ mahalleler: [] });

  const ilceler = getDistrictsAndNeighbourhoodsByCityCode(
    sehir.code,
  ) as Record<string, string[]>;
  const anahtar = Object.keys(ilceler).find(
    (d) => normalize(d) === normalize(ilce),
  );
  if (!anahtar) return NextResponse.json({ mahalleler: [] });

  // "Adliye Mah" → "Adliye Mahallesi" biçimine getirip alfabetik sırala.
  const mahalleler = [...ilceler[anahtar]]
    .map((m) => m.replace(/\s+Mah\.?$/i, " Mahallesi"))
    .sort((a, b) => a.localeCompare(b, "tr"));

  return NextResponse.json(
    { mahalleler },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
