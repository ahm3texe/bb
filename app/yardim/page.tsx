import type { Metadata } from "next";
import { YardimClient } from "./YardimClient";

export const metadata: Metadata = {
  title: "Yardım Merkezi",
  description:
    "BulBana yardım merkezi: alıcı ve satıcı rehberleri, %4 komisyon, ödeme aktarımı, 3 gün kargo kuralı ve itiraz süreci hakkında sık sorulan sorular.",
};

export default function YardimPage() {
  return <YardimClient />;
}
