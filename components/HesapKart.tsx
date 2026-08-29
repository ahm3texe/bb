"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { useHesapProfil } from "@/lib/hesap-profil";
import { useOturumSahibi } from "@/lib/aktif-kullanici";
import { aliciKalitesi, SEVIYE_STIL } from "@/lib/alici-kalitesi";
import { KaliteKirilimi } from "@/components/KaliteKirilimi";
import type { AliciMetrik } from "@/lib/alici-kalitesi";
import { SEBEP_METNI } from "@/lib/iptal";
import type { IptalSebep } from "@/lib/iptal";

/** Hesap sayfalarında solda duran ortak profil kimlik kartı. */
export function HesapKart({
  oturumKullanici,
  metrik,
  kusurlar = [],
  puan,
  degerlendirme,
}: {
  /**
   * Gerçekten giriş yapmış hesap — SUNUCUDAN prop olarak gelir.
   * Eskiden `oturumSahibiMi()` doğrudan çağrılıyordu; o fonksiyon
   * `lib/oturum.ts` üzerinden talep verisini tarayıcı paketine taşıyordu
   * ve gerçek auth geldiğinde senkron kalamayacaktı.
   */
  oturumKullanici: string;
  /** Sunucudan gelen gerçek alıcı metrikleri (değerlendirmelerden). */
  metrik?: AliciMetrik;
  /**
   * Kusurlu bulunulan iptaller — gerekçesiyle. Sayı zaten görünüyordu ama
   * nedeni hiçbir yerde yazmıyordu; kullanıcı puanının neden düştüğünü
   * anlayamıyordu (bkz. lib/iptal.ts → SEBEP_METNI).
   */
  kusurlar?: { sebep: IptalSebep; zaman: string }[];
  puan?: number;
  degerlendirme?: number;
}) {
  const profil = useHesapProfil();
  const aktif = useOturumSahibi();
  // Varsayılan hesapta ayarlardan girilen bilgiler geçerli; başka bir hesaba
  // geçildiğinde o kullanıcının kendi kaydı gösterilir.
  const kendisi = aktif.kullanici === oturumKullanici;
  const ad = kendisi ? profil.kullanici : aktif.kullanici;
  const bio = kendisi ? profil.bio : aktif.bio;
  // Kalite ve puan gerçek değerlendirmelerden gelir; sunucu geçmezse
  // hesabın kendi kaydına düşülür (ör. başka hesaba geçildiğinde).
  const alici = aliciKalitesi(metrik ?? aktif.aliciMetrik);

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
          ★{" "}
          {(puan ?? aktif.puan).toLocaleString("tr-TR", {
            minimumFractionDigits: 1,
          })}{" "}
          <Link
            href="/profil?tab=yorumlar"
            className="text-[13px] font-semibold text-ink-400 underline-offset-2 hover:text-primary hover:underline"
          >
            · {degerlendirme ?? aktif.degerlendirme} değerlendirme
          </Link>
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-[10px] py-[7px] text-[11.5px] font-bold leading-none ${SEVIYE_STIL[alici.seviye].rozet}`}
            title={alici.ozet}
          >
            {alici.seviye === "degerlendirilmedi"
              ? "Kullanıcı kalitesi henüz değerlendirilmedi"
              : `Kullanıcı Kalitesi: ${alici.etiket}`}
          </span>
        </div>
        {/* Seviyenin gerekçesi — hesaplanan sinyal kırılımı bir yere
            çıkmıyordu (bkz. components/KaliteKirilimi.tsx). */}
        <KaliteKirilimi kalite={alici} />
        {/* Düşen siparişlerin gerekçesi — yalnızca kendi kartında ve
            yalnızca gerçekten kusur kaydı varsa. */}
        {kendisi && kusurlar.length > 0 && (
          <div className="mt-3 rounded-[12px] bg-danger-soft px-3.5 py-3 text-left">
            <div className="text-[12px] font-extrabold text-danger">
              Düşen sipariş: {kusurlar.length}
            </div>
            <ul className="mt-1.5 flex flex-col gap-1">
              {kusurlar.slice(0, 3).map((k, i) => (
                <li
                  key={`${k.zaman}-${i}`}
                  className="text-[11.5px] font-medium leading-[1.45] text-ink-700"
                >
                  {SEBEP_METNI[k.sebep]}
                  <span className="text-ink-300">
                    {" · "}
                    {new Date(k.zaman).toLocaleDateString("tr-TR")}
                  </span>
                </li>
              ))}
            </ul>
            {kusurlar.length > 3 && (
              <div className="mt-1 text-[11px] font-semibold text-ink-400">
                ve {kusurlar.length - 3} tane daha
              </div>
            )}
          </div>
        )}

        {bio && (
          <p className="mt-3.5 whitespace-pre-line break-words text-pretty text-[14px] font-medium leading-relaxed text-ink-700">
            {bio}
          </p>
        )}
        <div className="mt-3 border-t border-hairline pt-3 text-[13.5px] font-medium text-ink-400">
          {aktif.konum}
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
