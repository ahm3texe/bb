"use client";

import { useState } from "react";
import Link from "next/link";

const nedenList = [
  "Ürün anlatıldığı gibi değil",
  "İmza / sertifika eksik ya da şüpheli",
  "Ürün hasarlı geldi",
  "Yanlış ürün geldi",
  "Ürün hiç gelmedi",
];

const kanitDolu =
  "repeating-linear-gradient(45deg, #bef264 0px, #bef264 8px, rgb(190 242 100 / 0.55) 8px, rgb(190 242 100 / 0.55) 16px)";

type Adim = {
  n: string;
  durum: "done" | "active" | "pending";
  baslik: string;
  metin: string;
  cizgi: boolean;
};

const adimlar: Adim[] = [
  {
    n: "✓",
    durum: "done",
    baslik: "İtiraz alındı, ödeme donduruldu",
    metin: "4.500 TL güvencede kalmaya devam ediyor.",
    cizgi: true,
  },
  {
    n: "✓",
    durum: "done",
    baslik: "Satıcıya bildirildi",
    metin: "plakdukkani34'ün 24 saat yanıt hakkı var.",
    cizgi: true,
  },
  {
    n: "●",
    durum: "active",
    baslik: "Destek incelemesi",
    metin:
      "Sunum fotoğrafları, sohbet kaydı ve kanıtlar 48 saat içinde incelenir.",
    cizgi: true,
  },
  {
    n: "4",
    durum: "pending",
    baslik: "Karar",
    metin:
      "Haklı bulunursan ödemen iade edilir; aksi halde satıcıya aktarılır.",
    cizgi: false,
  },
];

function nokta(durum: Adim["durum"]) {
  if (durum === "done") return "bg-primary text-white";
  if (durum === "active") return "bg-accent text-ink-900";
  return "bg-page text-ink-300";
}

export function ItirazClient() {
  const [neden, setNeden] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [kanit, setKanit] = useState(0);
  const [gonderildi, setGonderildi] = useState(false);

  const acikOk = aciklama.trim().length >= 20;
  const kanitOk = kanit >= 1;
  const canSend = neden !== "" && acikOk && kanitOk;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Sayfa yolu"
        className="flex flex-wrap items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-ink-400"
      >
        <Link href="/siparis" className="text-ink-400 hover:text-primary">
          Sipariş #BB-78412
        </Link>
        <span aria-hidden>›</span>
        <span className="font-semibold text-ink-900">İtiraz</span>
      </nav>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── Sol sütun ── */}
        <div className="min-w-0">
          {!gonderildi ? (
            /* ── FORM ── */
            <section className="rounded-[18px] border border-border bg-card p-[22px]">
              <h1 className="text-[22px] font-extrabold text-ink-900">
                İtiraz başlat
              </h1>
              <p className="mb-[18px] mt-1 text-[13px] font-medium leading-relaxed text-ink-400">
                Ödemen güvencede — itiraz sonuçlanana kadar satıcıya{" "}
                <strong className="text-ink-900">aktarılmaz</strong>. Sorunu ne
                kadar net anlatırsan inceleme o kadar hızlı biter.
              </p>

              <label className="mb-2 block text-[13px] font-bold text-ink-900">
                İtiraz nedeni <span className="text-danger">*</span>
              </label>
              <div className="mb-[18px] flex flex-wrap gap-2">
                {nedenList.map((n) => {
                  const active = neden === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNeden(n)}
                      className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-[11px] text-[12.5px] transition-colors ${
                        active
                          ? "border-primary bg-primary-soft font-bold text-primary-hover"
                          : "border-border-input bg-card font-semibold text-ink-500 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {n}
                      {active ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>

              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-[13px] font-bold text-ink-900">
                  Sorunu anlat <span className="text-danger">*</span>
                </label>
                <span
                  className={`text-[11.5px] font-semibold ${
                    acikOk ? "text-primary-hover" : "text-danger"
                  }`}
                >
                  {aciklama.length}/400
                  {acikOk ? "" : " · en az 20 karakter"}
                </span>
              </div>
              <textarea
                rows={4}
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value.slice(0, 400))}
                placeholder="Ne bekliyordun, ne geldi? Sunumdaki hangi bilgiyle çelişiyor? (örn. imza sertifikası pakette yoktu)"
                className="w-full resize-y rounded-control border-[1.5px] border-border-input bg-card px-3.5 py-3 text-[13.5px] font-medium leading-relaxed text-ink-900 outline-none focus:border-primary"
              />

              <div className="mb-2 mt-[18px] flex items-baseline justify-between">
                <label className="text-[13px] font-bold text-ink-900">
                  Kanıt fotoğrafları <span className="text-danger">*</span>
                </label>
                <span
                  className={`text-[11.5px] font-semibold ${
                    kanitOk ? "text-primary-hover" : "text-danger"
                  }`}
                >
                  {kanit}/6
                  {kanitOk ? "" : " · en az 1 fotoğraf"}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }, (_, i) => {
                  const filled = i < kanit;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setKanit((k) => (i < k ? i : i + 1))
                      }
                      aria-label={`Kanıt ${i + 1}`}
                      style={filled ? { background: kanitDolu } : undefined}
                      className={`flex aspect-square cursor-pointer items-center justify-center rounded-[10px] ${
                        filled
                          ? "text-[10.5px] font-bold text-primary-hover"
                          : "border-[1.5px] border-dashed border-border-input bg-subtle text-[17px] font-medium text-ink-300 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {filled ? `kanıt ${i + 1} ✓` : "+"}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11.5px] font-medium leading-snug text-ink-300">
                Gelen ürünü, hasarı ya da eksik parçayı gösteren fotoğraflar
                ekle. (Önizlemede kutulara tıkla.)
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => canSend && setGonderildi(true)}
                  disabled={!canSend}
                  className={`rounded-[13px] px-6 py-4 text-[14.5px] font-extrabold ${
                    canSend
                      ? "cursor-pointer bg-primary text-white hover:bg-primary-hover"
                      : "cursor-not-allowed bg-[#efebf5] text-ink-300"
                  }`}
                >
                  İtirazı Gönder
                </button>
                <Link href="/siparis" className="text-[13px] font-semibold text-ink-400">
                  Vazgeç, siparişe dön
                </Link>
              </div>
            </section>
          ) : (
            /* ── SONUÇ ── */
            <section className="rounded-[18px] border border-border bg-card p-[22px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-danger text-lg font-extrabold text-white">
                  !
                </span>
                <div className="flex-1">
                  <h1 className="text-xl font-extrabold text-ink-900">
                    İtirazın alındı — #IT-2094
                  </h1>
                  <div className="mt-1 text-[12.5px] font-medium text-ink-400">
                    Neden: {neden || "Ürün anlatıldığı gibi değil"} · Bugün, 14:20
                  </div>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-2 text-[11.5px] font-bold text-accent-ink">
                  İnceleniyor
                </span>
              </div>

              {/* Zaman çizelgesi */}
              <div className="mt-5 flex flex-col">
                {adimlar.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-none flex-col items-center">
                      <span
                        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10.5px] font-extrabold ${nokta(
                          a.durum,
                        )}`}
                      >
                        {a.n}
                      </span>
                      {a.cizgi && (
                        <span
                          className={`h-[30px] w-0.5 ${
                            a.durum === "done" ? "bg-primary" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-2">
                      <div
                        className={`text-[13px] font-bold ${
                          a.durum === "pending" ? "text-ink-300" : "text-ink-900"
                        }`}
                      >
                        {a.baslik}
                      </div>
                      <div className="mt-0.5 text-[11.5px] font-medium leading-snug text-ink-300">
                        {a.metin}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-control bg-primary-soft px-3.5 py-3 text-[12px] font-bold leading-snug text-primary-hover">
                Ödeme donduruldu — 4.500 TL, itiraz sonuçlanana kadar satıcıya
                aktarılmaz.
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href="/siparis"
                  className="rounded-control border-[1.5px] border-border-input bg-card px-[18px] py-3 text-[13px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                >
                  Siparişe Dön
                </Link>
                <Link
                  href="/destek"
                  className="rounded-control border-[1.5px] border-border-input bg-card px-[18px] py-3 text-[13px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                >
                  Destekle Yazış
                </Link>
              </div>
            </section>
          )}
        </div>

        {/* ── Sağ sütun ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[150px]">
          <div className="rounded-panel border border-border bg-card p-[18px]">
            <div className="mb-3 text-sm font-extrabold text-ink-900">
              İlgili sipariş
            </div>
            <div className="flex items-center gap-3">
              <div className="ref-image flex h-12 w-12 flex-none items-center justify-center rounded-[10px] font-mono text-[8px] text-[#968cac]">
                görsel
              </div>
              <div>
                <div className="text-[13px] font-bold leading-snug text-ink-900">
                  İmzalı The Weeknd &quot;Dawn FM&quot; CD
                </div>
                <div className="mt-[3px] text-[11.5px] font-medium text-ink-400">
                  4.500 TL · plakdukkani34
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-[10px] bg-primary-soft px-3 py-2.5 text-[12px] font-bold leading-snug text-primary-hover">
              Ödeme güvencede — itiraz süresince aktarılmaz.
            </div>
          </div>

          <div className="rounded-panel bg-ink-900 p-[18px] text-white">
            <div className="text-[13.5px] font-extrabold">
              İtiraz nasıl işler?
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {[
                "Nedenini seç, kanıtla gönder",
                "BulBana 48 saat içinde inceler",
                "Karar: iade ya da satıcıya aktarım",
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-accent text-[10.5px] font-extrabold text-ink-900">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] font-semibold leading-snug text-[#d9d2ea]">
                    {t}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-[#cfc5e8]">
              İnceleme; sunum fotoğrafları, sohbet kaydı ve kanıtların üzerinden
              yapılır — bu yüzden pazarlığı hep sohbette tut.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
