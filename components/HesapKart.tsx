"use client";

import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/Button";
import { useHesapProfil } from "@/lib/hesap-profil";

/** Hesap sayfalarında solda duran ortak profil kimlik kartı. */
export function HesapKart() {
  const profil = useHesapProfil();

  return (
    <aside className="overflow-hidden rounded-panel border border-border bg-card lg:sticky lg:top-[150px]">
      <div className="h-16 bg-gradient-to-br from-primary-soft via-primary/20 to-accent-soft" />
      <div className="px-5 pb-5 text-center">
        <div className="-mt-9 mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary text-xl font-extrabold text-white ring-4 ring-card">
          EK
        </div>
        <h2 className="mt-2.5 text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
          {profil.kullanici}
        </h2>
        <div className="mt-1 text-[15.5px] font-extrabold text-star">
          ★ 4,9{" "}
          <Link
            href="/profil?tab=yorumlar"
            className="text-[13px] font-semibold text-ink-400 underline-offset-2 hover:text-primary hover:underline"
          >
            · 15 değerlendirme
          </Link>
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          <Chip variant="violet" size="md">
            ✓ Kimlik doğrulandı
          </Chip>
          <Chip variant="dark" size="md">
            Alıcı Kalitesi: Yüksek
          </Chip>
        </div>
        {profil.bio && (
          <p className="mt-3.5 whitespace-pre-line text-pretty text-[14px] font-medium leading-relaxed text-ink-700">
            {profil.bio}
          </p>
        )}
        <div className="mt-3 border-t border-hairline pt-3 text-[13.5px] font-medium text-ink-400">
          Kadıköy, İstanbul · 2024&apos;ten beri üye · %0 iptal
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <ButtonLink href="/ayarlar" variant="primary" size="md">
            Profil Ayarları
          </ButtonLink>
        </div>
      </div>
    </aside>
  );
}
