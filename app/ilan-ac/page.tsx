import type { Metadata } from "next";
import { IlanAcForm } from "@/components/IlanAcForm";
import { talepGetir } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";

// Düzenlenecek talep her istekte taze okunur.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "İlan Aç",
  description:
    "Aradığın ürünü ilan et: fiyatı sen belirle, satıcılar sunumlarıyla sana gelsin. İlan açmak ücretsizdir.",
};

/**
 * `?duzenle=<id>` sunucuda okunup forma prop olarak geçilir.
 *
 * Eskiden form bunu `useSearchParams()` ile kendisi okuyordu; o da sayfayı
 * `<Suspense>` ile sarmayı zorunlu kılıyordu. Ancak o Suspense sınırı
 * istemcide çözülmediği için formun tamamı hidrate olmuyor, hiçbir butona
 * basılamıyordu. Parametreyi sunucudan geçirince ne CSR bailout'u ne de
 * Suspense gerekiyor.
 */
export default async function IlanAcPage({
  searchParams,
}: {
  searchParams: Promise<{ duzenle?: string; taslak?: string }>;
}) {
  const { duzenle, taslak } = await searchParams;
  // Düzenleme yalnızca talebin sahibine açılır; başkasının talebi forma
  // hiç yüklenmez (sunucu tarafı ayrıca PATCH'te de kontrol eder).
  const talep = duzenle ? await talepGetir(duzenle) : undefined;
  const ben = await istekKullaniciAdi();
  const duzenlenen = talep && talep.sahibi === ben ? talep : undefined;

  // `?taslak=yukle` Profilim'deki "Taslaklar" panelinden gelir: kullanıcı
  // orada taslağı görüp "Düzenlemeye devam et" dediyse forma girer girmez
  // yüklensin; bir de burada "Taslağı yükle" demesi gereksiz bir adımdır.
  return (
    <IlanAcForm
      duzenleId={duzenlenen?.id}
      duzenlenen={duzenlenen}
      taslagiAc={taslak === "yukle"}
    />
  );
}
