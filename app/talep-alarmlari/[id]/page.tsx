import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { talepEslesiyorMu } from "@/lib/alarm-eslesme";
import { alarmGetir, taleplerGetir, ilgiliTalepIdleri } from "@/lib/veri";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { TalepCard } from "@/components/TalepCard";
import { ButtonLink } from "@/components/ui/Button";

type Params = { params: Promise<{ id: string }> };

// Alarm ve talepler sürekli değişiyor; sayfa her istekte taze okunur.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const alarm = await alarmGetir(await istekKullaniciAdi(), id);
  return {
    title: alarm ? `${alarm.ad} · Talep Alarmı` : "Talep Alarmı",
    description:
      "Bu alarmın kriterlerine uyan açık talepler — kartına tıklayıp ilanı incele ve sunum gönder.",
  };
}

/**
 * TEK BİR ALARMIN YAKALADIĞI TALEPLER.
 *
 * Alarm kartı yalnızca "son eşleşme" satırını gösteriyordu; kriterlere uyan
 * diğer talepleri görmenin yolu yoktu. Burada o alarmın — YALNIZCA onun —
 * eşleşmeleri, Keşfet'tekiyle aynı ilan kartlarıyla listelenir; karta
 * tıklayınca ilan detayına gidilir.
 *
 * Eşleşme ölçütü bildirim gönderen kodun ta kendisi (`talepEslesiyorMu`),
 * ayrı bir kopya değil: liste ile bildirim aynı kuralı uygulasın.
 */
export default async function AlarmTalepleriPage({ params }: Params) {
  const { id } = await params;
  const ben = await istekKullaniciAdi();

  // Alarm hesabın kendi listesinden okunur; başkasının alarmı bulunamaz.
  const alarm = await alarmGetir(ben, id);
  if (!alarm) notFound();

  const [talepler, ilgililer] = await Promise.all([
    taleplerGetir(),
    ilgiliTalepIdleri(ben),
  ]);
  const eslesenler = talepler.filter((t) => talepEslesiyorMu(alarm.filtre, t));

  return (
    <main className="mx-auto max-w-[1440px] px-6 pb-14 pt-[22px]">
      <nav className="py-1.5 pb-3.5 text-[13px] font-medium text-ink-500">
        <Link href="/profil" className="text-ink-400 hover:text-primary">
          Profilim
        </Link>
        <span className="mx-1.5">›</span>
        <Link
          href="/talep-alarmlari"
          className="text-ink-400 hover:text-primary"
        >
          Talep Alarmı
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">{alarm.ad}</span>
      </nav>

      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold tracking-[-0.7px] text-ink-900">
            {alarm.ad}
          </h1>
          <p className="mt-[7px] text-[13.5px] font-medium text-ink-500">
            {alarm.kriterler.join("  ·  ")}
          </p>
        </div>
        <ButtonLink href="/talep-alarmlari" variant="secondary" size="md">
          ‹ Alarmlarım
        </ButtonLink>
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-ink-900">
          {eslesenler.length} uyan talep
        </span>
        {!alarm.aktif && (
          <span className="rounded-full bg-subtle px-2.5 py-[7px] text-[11.5px] font-semibold text-ink-500">
            Alarm duraklatıldı — bildirim gönderilmiyor
          </span>
        )}
      </div>

      {eslesenler.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-input bg-card px-6 py-16 text-center">
          <div className="text-[15px] font-bold text-ink-900">
            Bu alarma uyan açık talep yok
          </div>
          <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium leading-relaxed text-ink-500">
            Kriterlere uyan bir talep açıldığında hem burada listelenecek hem de
            sana bildirim gönderilecek.
          </p>
          <div className="mt-4 flex justify-center">
            <ButtonLink href="/kesfet" variant="primary" size="md">
              Talepleri Keşfet
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {eslesenler.map((t) => (
            <TalepCard key={t.id} talep={t} ilgili={ilgililer.includes(t.id)} />
          ))}
        </div>
      )}
    </main>
  );
}
