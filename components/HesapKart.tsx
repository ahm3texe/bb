"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { useHesapProfil } from "@/lib/hesap-profil";
import { useAktifKullanici } from "@/lib/aktif-kullanici";
import { oturumSahibiMi } from "@/lib/oturum";
import { aliciKalitesi, SEVIYE_STIL } from "@/lib/alici-kalitesi";

/** Hesap sayfalarında solda duran ortak profil kimlik kartı. */
export function HesapKart() {
  const profil = useHesapProfil();
  const aktif = useAktifKullanici();
  // Varsayılan hesapta ayarlardan girilen bilgiler geçerli; başka bir hesaba
  // geçildiğinde o kullanıcının kendi kaydı gösterilir.
  const kendisi = oturumSahibiMi(aktif.kullanici);
  const ad = kendisi ? profil.kullanici : aktif.kullanici;
  const bio = kendisi ? profil.bio : aktif.bio;
  const alici = aliciKalitesi(aktif.aliciMetrik);

  return (
    <aside className="overflow-hidden rounded-panel border border-border bg-card lg:sticky lg:top-[150px]">
      <div className="h-16 bg-gradient-to-br from-primary-soft via-primary/20 to-accent-soft" />
      <div className="px-5 pb-5 text-center">
        <div className="-mt-9 mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary text-xl font-extrabold text-white ring-4 ring-card">
          {aktif.harf}
        </div>
        <h2 className="mt-2.5 text-[21px] font-extrabold tracking-[-0.3px] text-ink-900">
          {ad}
        </h2>
        <div className="mt-1 text-[15.5px] font-extrabold text-star-ink">
          ★ {aktif.puan.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}{" "}
          <Link
            href="/profil?tab=yorumlar"
            className="text-[13px] font-semibold text-ink-400 underline-offset-2 hover:text-primary hover:underline"
          >
            · {aktif.degerlendirme} değerlendirme
          </Link>
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-[10px] py-[7px] text-[11.5px] font-bold leading-none ${SEVIYE_STIL[alici.seviye].rozet}`}
            title={alici.ozet}
          >
            Alıcı Kalitesi: {alici.etiket}
          </span>
        </div>
        {bio && (
          <p className="mt-3.5 whitespace-pre-line text-pretty text-[14px] font-medium leading-relaxed text-ink-700">
            {bio}
          </p>
        )}
        <div className="mt-3 border-t border-hairline pt-3 text-[13.5px] font-medium text-ink-400">
          {aktif.konum} · {aktif.uyelik}&apos;ten beri üye
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
