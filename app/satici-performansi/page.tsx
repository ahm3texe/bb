import type { Metadata } from "next";
import Link from "next/link";
import { SaticiPerformansiBaslik } from "@/components/SaticiPerformansiBaslik";
import { fiyatText } from "@/lib/data";
import {
  islemlerGetir,
  gonderdigimSunumlarGetir,
  kullaniciMetrikleriGetir,
} from "@/lib/veri";
import { satislar, satisOzeti, komisyon } from "@/lib/islemler";
import type { Islem } from "@/lib/islemler";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { sureMetni } from "@/lib/olcum";

// Oturuma bağlı: sayfa giriş yapmış hesabın verisini gösteriyor ve kimlik
// çerezden geliyor. Ön-render edilirse derleme anında istek bağlamı olmaz
// ve ekran oturumsuz çizilirdi.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Satıcı Performansım",
  description:
    "Sunum, teklif ve satış dönüşümlerin, aylık net kazancın ve kargo performansın — hepsi tamamlanmış kayıtlardan.",
};

/*
 * BU SAYFA TAMAMEN UYDURMAYDI.
 *
 * Aylık kazanç grafiği, dönüşüm hunisi, kategori dağılımı ve "Usta Satıcı"
 * seviye tablosu koda gömülü sabit sayılardı. Sayfa hiçbir prop almıyor,
 * hiçbir uca bağlanmıyordu — yani HİÇ SATIŞI OLMAYAN bir hesap da
 * "38.720 TL net kazanç", "214/50 tamamlanmış satış ✓" ve "%98 zamanında
 * kargo" görüyordu. Uydurma bir finansal geçmiş sunan, sitedeki en
 * yanıltıcı ekrandı.
 *
 * Artık her sayı tamamlanmış kayıtlardan türetiliyor. Ölçülmeyen hiçbir şey
 * gösterilmiyor: kaldırılan bölümler (kategori dönüşüm ortalaması, satıcı
 * seviyesi) ölçülebilir olmadıkları için geri EKLENMEMELİ.
 */

const AY_ADI = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

/** Son 6 ayın net satış geliri — tamamlanmış işlemlerden. */
function aylikKazanc(islemler: Islem[]): { ay: string; tl: number }[] {
  const simdi = new Date();
  const aylar: { ay: string; anahtar: string; tl: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1);
    aylar.push({
      ay: AY_ADI[d.getMonth()],
      anahtar: `${d.getFullYear()}-${d.getMonth()}`,
      tl: 0,
    });
  }
  for (const i of islemler) {
    const d = new Date(i.tarihIso);
    const anahtar = `${d.getFullYear()}-${d.getMonth()}`;
    const hedef = aylar.find((a) => a.anahtar === anahtar);
    if (hedef) hedef.tl += i.fiyat - komisyon(i);
  }
  return aylar.map(({ ay, tl }) => ({ ay, tl }));
}

export default async function SaticiPerformansiPage() {
  const ben = await istekKullaniciAdi();
  const [islemler, sunumlarim, metrik] = await Promise.all([
    islemlerGetir(ben),
    gonderdigimSunumlarGetir(ben),
    kullaniciMetrikleriGetir(ben),
  ]);

  const kendiSatislari = satislar(islemler, ben);
  const { net } = satisOzeti(islemler, ben);
  const aylar = aylikKazanc(kendiSatislari);
  const maxAy = Math.max(1, ...aylar.map((m) => m.tl));

  // Huni GERÇEK sunum kayıtlarından: gönderilen → alıcı yanıtladı → satışa döndü.
  const gonderilen = sunumlarim.length;
  const yanitlanan = sunumlarim.filter(
    (s) => s.sonuc === "kabul" || s.sonuc === "red",
  ).length;
  const satisaDonen = metrik.tamamlananSatis;
  const huni = [
    { ad: "Gönderilen sunum", n: gonderilen, renk: "bg-primary" },
    { ad: "Alıcı yanıtladı", n: yanitlanan, renk: "bg-[#9f6ff0]" },
    { ad: "Satışa döndü", n: satisaDonen, renk: "bg-accent" },
  ];
  const huniBase = Math.max(1, gonderilen);

  // Kategori dağılımı — tamamlanmış satışlardan sayılır.
  const kategoriler = new Map<string, number>();
  for (const i of kendiSatislari)
    kategoriler.set(i.kategori, (kategoriler.get(i.kategori) ?? 0) + 1);
  const katDagilim = [...kategoriler.entries()]
    .map(([ad, satis]) => ({ ad, satis }))
    .sort((a, b) => b.satis - a.satis)
    .slice(0, 5);

  const hicVeriYok = gonderilen === 0 && kendiSatislari.length === 0;

  const kartCls = "rounded-[14px] border border-border bg-card p-4";
  const etiketCls = "text-[11.5px] font-medium leading-snug text-ink-400";
  const sayiCls = "mt-2 text-2xl font-extrabold text-ink-900";

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[18px]">
      <nav className="py-1.5 pb-3.5 text-[12.5px] font-medium text-ink-400">
        <Link href="/profil" className="text-ink-400 hover:text-primary">
          Profilim
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">Satıcı Performansım</span>
      </nav>

      <SaticiPerformansiBaslik />

      {hicVeriYok ? (
        <div className="rounded-panel border border-border bg-card p-9 text-center">
          <h2 className="text-[20px] font-extrabold text-ink-900">
            Henüz ölçecek bir şey yok
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm font-medium leading-relaxed text-ink-500">
            Sunum göndermeye başladığında dönüşüm oranların, kargo
            performansın ve net kazancın burada birikir.
          </p>
          <Link
            href="/kesfet"
            className="mt-5 inline-block rounded-control bg-primary px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
          >
            Talepleri Keşfet
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
          {/* ── SOL ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className={kartCls}>
                <div className={etiketCls}>Gönderilen sunum</div>
                <div className={sayiCls}>{gonderilen}</div>
              </div>
              <div className={kartCls}>
                <div className={etiketCls}>Alıcı yanıtladı</div>
                <div className={sayiCls}>{yanitlanan}</div>
                {gonderilen > 0 && (
                  <div className="mt-[7px] text-[11px] font-bold text-accent-ink">
                    %{Math.round((yanitlanan / gonderilen) * 100)} dönüşüm
                  </div>
                )}
              </div>
              <div className={kartCls}>
                <div className={etiketCls}>Satışa dönen</div>
                <div className={sayiCls}>{satisaDonen}</div>
                {gonderilen > 0 && (
                  <div className="mt-[7px] text-[11px] font-bold text-accent-ink">
                    %{Math.round((satisaDonen / gonderilen) * 100)} dönüşüm
                  </div>
                )}
              </div>
              <div className={kartCls}>
                <div className={etiketCls}>Net kazanç · Toplam</div>
                <div className={sayiCls}>{fiyatText(net)}</div>
                <Link
                  href="/cuzdan"
                  className="mt-[7px] inline-block text-[11px] font-bold text-primary hover:text-primary-hover"
                >
                  Mali Tablom ›
                </Link>
              </div>
            </div>

            {/* Huni */}
            <section className="rounded-panel border border-border bg-card p-[22px]">
              <h2 className="mb-[18px] text-[17px] font-extrabold text-ink-900">
                Sunum → Satış Hunisi
              </h2>
              <div className="flex flex-col gap-3">
                {huni.map((h, i) => {
                  const pct = Math.round((h.n / huniBase) * 100);
                  return (
                    <div key={h.ad}>
                      <div className="mb-1.5 flex justify-between text-[12.5px] font-semibold">
                        <span className="text-ink-900">{h.ad}</span>
                        {i === 0 ? (
                          <span className="font-extrabold text-ink-900">{h.n}</span>
                        ) : (
                          <span className="text-ink-400">
                            {h.n} · %{pct}
                          </span>
                        )}
                      </div>
                      <div
                        className={`h-[26px] rounded-lg ${h.renk}`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs font-medium leading-relaxed text-ink-400">
                Sayılar gönderdiğin sunum kayıtlarından gelir. “Alıcı
                yanıtladı”, kabul ya da ret kararı verilmiş sunumları sayar;
                hâlâ beklemede olanlar dahil değildir.
              </p>
            </section>

            {/* Kategori dağılımı */}
            {katDagilim.length > 0 && (
              <section className="rounded-panel border border-border bg-card p-[22px]">
                <h2 className="mb-[18px] text-[17px] font-extrabold text-ink-900">
                  Hangi kategoride satıyorsun?
                </h2>
                <div className="flex flex-col gap-3">
                  {katDagilim.map((k) => {
                    const pct = Math.round(
                      (k.satis / Math.max(1, kendiSatislari.length)) * 100,
                    );
                    return (
                      <div key={k.ad}>
                        <div className="mb-1.5 flex justify-between text-[12.5px] font-semibold">
                          <span className="text-ink-900">{k.ad}</span>
                          <span className="text-ink-400">
                            {k.satis} satış · %{pct}
                          </span>
                        </div>
                        <div
                          className="h-[22px] rounded-lg bg-accent"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ── SAĞ ── */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-panel border border-border bg-card p-[22px]">
              <h2 className="mb-[18px] text-[17px] font-extrabold text-ink-900">
                Aylık net kazanç
              </h2>
              <div className="flex h-[150px] items-end gap-2">
                {aylar.map((m, i) => (
                  <div key={`${m.ay}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-md bg-primary"
                      style={{ height: `${Math.max(2, (m.tl / maxAy) * 110)}px` }}
                      title={`${m.ay}: ${fiyatText(m.tl)}`}
                    />
                    <span className="text-[10.5px] font-semibold text-ink-400">
                      {m.ay}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-ink-400">
                Komisyon düşülmüş net tutar; alıcının onayladığı ay sayılır.
              </p>
            </section>

            <section className="rounded-panel border border-border bg-card p-[22px]">
              <h2 className="mb-3.5 text-[17px] font-extrabold text-ink-900">
                Güven sinyallerin
              </h2>
              <dl className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] font-medium text-ink-500">
                    Tamamlanan satış
                  </dt>
                  <dd className="text-[15px] font-extrabold text-ink-900">
                    {metrik.tamamlananSatis}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] font-medium text-ink-500">
                    Zamanında kargo
                  </dt>
                  <dd className="text-[15px] font-extrabold text-ink-900">
                    {/* Hiç gönderisi olmayan satıcıya "%0" göstermek onu
                        sözünde durmamış gibi gösterirdi. */}
                    {metrik.zamanindaKargo === null
                      ? "Henüz gönderi yok"
                      : `%${metrik.zamanindaKargo}`}
                  </dd>
                </div>
                {/* İki ölçülen süre. Bunlar bir dönem profil kartında
                    "Yanıt süresi · ~1 saat" / "Ort. kargolama · 1 gün" diye
                    KODA GÖMÜLÜ sabitlerdi (bkz. lib/olcum.ts). */}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] font-medium text-ink-500">
                    Ort. kargolama
                  </dt>
                  <dd className="text-[15px] font-extrabold text-ink-900">
                    {metrik.ortKargoSaat === null
                      ? "Henüz gönderi yok"
                      : sureMetni(metrik.ortKargoSaat)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] font-medium text-ink-500">
                    Ort. yanıt süresi
                  </dt>
                  <dd className="text-[15px] font-extrabold text-ink-900">
                    {metrik.ortYanitSaat === null
                      ? "Henüz ölçülmedi"
                      : sureMetni(metrik.ortYanitSaat)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] font-medium text-ink-500">
                    Kusurundan düşen sipariş
                  </dt>
                  <dd className="text-[15px] font-extrabold text-ink-900">
                    {metrik.iptalEdilenSatis}
                  </dd>
                </div>
              </dl>
              <p className="mt-3.5 text-xs font-medium leading-relaxed text-ink-400">
                Bu sayılar alıcıların sunumunu değerlendirirken gördüğü
                değerlerdir. Ölçüm yapılamayan bir değer “—” görünür;
                uydurma sayı gösterilmez.
              </p>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
