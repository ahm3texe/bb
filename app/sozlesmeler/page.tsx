import type { Metadata } from "next";
import { SozlesmelerDocs } from "@/components/SozlesmelerDocs";

export const metadata: Metadata = {
  title: "Sözleşmeler ve Politikalar",
  description:
    "Bulbana Kullanıcı Sözleşmesi, KVKK Aydınlatma Metni ve Çerez Politikası — hak ve yükümlülüklerin özeti.",
};

export default function SozlesmelerPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-8">
      <h1 className="mb-1 text-[28px] font-extrabold leading-[1.15] tracking-[-0.7px] text-ink-900">
        Sözleşmeler ve Politikalar
      </h1>
      <p className="mb-[22px] text-[13px] font-medium leading-[1.5] text-ink-400">
        Son güncelleme: 1 Temmuz 2026 · Özet niteliğindedir, temsili içerik.
      </p>
      <SozlesmelerDocs />
    </main>
  );
}
