import type { Metadata } from "next";
import { CuzdanClient } from "@/components/CuzdanClient";

export const metadata: Metadata = {
  title: "Mali Tablom",
  description:
    "Tamamlanan alım ve satışlarının tek tabloda dökümü — toplam harcaman, net kazancın ve net durumun.",
};

export default function CuzdanPage() {
  return <CuzdanClient />;
}
