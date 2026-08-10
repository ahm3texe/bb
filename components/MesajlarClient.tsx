"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getTalep, talepNo, fiyatText } from "@/lib/data";
import { gelenSunumlar } from "@/lib/gelen-sunumlar";
import { ButtonLink } from "@/components/ui/Button";

const SEED_TALEP = getTalep("dawn-fm-imzali-cd")!;

type OfferSt = "superseded" | "accepted" | "rejected" | "pending";
type By = "seller" | "buyer";

type Msg =
  | { k: "sys"; text: string; time: string }
  | { k: "sunum"; by: By; time: string }
  | { k: "text"; by: By; text: string; time: string }
  | { k: "offer"; by: By; amount: string; note: string; st: OfferSt; time: string };

const VIEWER: By = "buyer"; // emre.k gözünden

const nameOf = (by: By) => (by === "seller" ? "plakdukkani34" : "emre.k");
const avOf = (by: By) => (by === "seller" ? "PD" : "EK");
const fmt = (n: number) => n.toLocaleString("tr-TR");
const now = () =>
  new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

function seed(): Msg[] {
  return [
    {
      k: "sys",
      text: `${nameOf("seller")} size bir sunum teklifi gönderdi.`,
      time: "Dün 14:02",
    },
    { k: "sunum", by: "seller", time: "Dün 14:02" },
    {
      k: "text",
      by: "seller",
      text: "Merhaba! İlgin için teşekkürler. CD jelatininde, imza kartı COA sertifikalı. İstersen sertifikanın ek fotoğrafını da atarım.",
      time: "Dün 14:05",
    },
    {
      k: "text",
      by: "buyer",
      text: "Merhaba, sunum çok iyi görünüyor. Sertifikayı görmek isterim. Fiyat beklentin nedir?",
      time: "Dün 14:11",
    },
    { k: "offer", by: "seller", amount: "4.800", note: "Teklif", st: "superseded", time: "Dün 14:16" },
    {
      k: "text",
      by: "buyer",
      text: "Bütçem ilanda yazdığı gibi 4.500. Hemen onaylarım, 4.300'e anlaşalım mı?",
      time: "Dün 14:20",
    },
    { k: "offer", by: "buyer", amount: "4.300", note: "Karşı teklif", st: "superseded", time: "Dün 14:21" },
    {
      k: "text",
      by: "seller",
      text: "4.300 olmaz maalesef, sertifikalı imza bu. İlan fiyatın olan 4.500'e tamamım — kargo benden.",
      time: "Dün 14:24",
    },
    { k: "offer", by: "seller", amount: "4.500", note: "Güncel teklif", st: "pending", time: "Dün 14:25" },
  ];
}

const polaroidBaslik =
  getTalep("polaroid-600-film")?.baslik ?? "Polaroid 600 arıyorum";

type Konusma = {
  id: string;
  ad: string;
  harf: string;
  ilan: string;
  son?: string;
  saat: string;
};

const sabitKonusmalar: Konusma[] = [
  { id: "seed", ad: "plakdukkani34", harf: "PD", ilan: SEED_TALEP.baslik, saat: "14:25" },
  { id: "muzikmarket", ad: "muzikmarket", harf: "MM", ilan: SEED_TALEP.baslik, son: "Teklif istendi — yanıt bekleniyor", saat: "Dün" },
  { id: "mert", ad: "koleksiyoner.mert", harf: "KM", ilan: SEED_TALEP.baslik, son: "Yeni sunum gönderdi", saat: "Dün" },
  { id: "analog", ad: "analogmarket", harf: "AM", ilan: polaroidBaslik, son: "Anlaşıldı ✓ — kargolandı", saat: "Salı" },
];

// Sunum gönderen her satıcının bir sohbeti var: karşılaştırma ekranındaki
// "Sohbete Geç" doğrudan o satıcının konuşmasını açar.
const konusmalar: Konusma[] = [
  ...sabitKonusmalar,
  ...gelenSunumlar
    .filter((s) => !sabitKonusmalar.some((k) => k.ad === s.satici))
    .map((s) => ({
      id: s.id,
      ad: s.satici,
      harf: s.harf,
      ilan: getTalep(s.talepId)?.baslik ?? SEED_TALEP.baslik,
      son: "Sunum gönderdi",
      saat: s.ne,
    })),
];

/** ?satici=... ile gelen kullanıcıyı doğrudan o sohbete düşür. */
function konusmaIdBul(satici?: string) {
  if (!satici) return "seed";
  return konusmalar.find((k) => k.ad === satici)?.id ?? "seed";
}

export function MesajlarClient({ satici }: { satici?: string }) {
  const [activeId, setActiveId] = useState(() => konusmaIdBul(satici));
  const [msgs, setMsgs] = useState<Msg[]>(() => seed());
  const [deal, setDeal] = useState<"negotiating" | "accepted">("negotiating");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerVal, setOfferVal] = useState("");
  const [msgText, setMsgText] = useState("");

  const threadRef = useRef<HTMLDivElement>(null);
  const isSeed = activeId === "seed";

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, activeId]);

  const pending = [...msgs]
    .reverse()
    .find((m) => m.k === "offer" && m.st === "pending") as
    | Extract<Msg, { k: "offer" }>
    | undefined;
  const accept = () => {
    if (!pending) return;
    const amount = pending.amount;
    setMsgs((prev) => [
      ...prev.map((m) =>
        m.k === "offer" && m.st === "pending"
          ? { ...m, st: "accepted" as OfferSt }
          : m,
      ),
      {
        k: "sys",
        text:
          "Teklif kabul edildi — " +
          amount +
          " TL üzerinde anlaşıldı. Ödemeni güvenceye al; satıcının 3 gün kargo süresi ödeme sonrası başlar.",
        time: now(),
      },
    ]);
    setDeal("accepted");
    setOfferOpen(false);
  };

  const reject = () => {
    if (!pending) return;
    setMsgs((prev) => [
      ...prev.map((m) =>
        m.k === "offer" && m.st === "pending"
          ? { ...m, st: "rejected" as OfferSt }
          : m,
      ),
      { k: "sys", text: "Güncel teklif reddedildi. Taraflar yeni teklif verebilir.", time: now() },
    ]);
    setOfferOpen(false);
  };

  const counterSend = () => {
    const val = parseInt(offerVal, 10);
    if (!val || val <= 0) return;
    setMsgs((prev) => [
      ...prev.map((m) =>
        m.k === "offer" && m.st === "pending"
          ? { ...m, st: "superseded" as OfferSt }
          : m,
      ),
      {
        k: "offer",
        by: VIEWER,
        amount: fmt(val),
        note: "Revize teklif",
        st: "pending",
        time: now(),
      },
    ]);
    setOfferOpen(false);
    setOfferVal("");
  };

  const sendText = () => {
    const t = msgText.trim();
    if (!t) return;
    setMsgs((prev) => [...prev, { k: "text", by: VIEWER, text: t, time: now() }]);
    setMsgText("");
  };

  const offerNum = parseInt(offerVal, 10);

  const activeConv = konusmalar.find((c) => c.id === activeId)!;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)_272px]">
        {/* ── Sohbet listesi ── */}
        <aside className="overflow-hidden rounded-card border border-border bg-card lg:sticky lg:top-[120px]">
          <div className="flex items-baseline justify-between border-b border-hairline px-4 pb-3 pt-4">
            <span className="text-base font-extrabold text-ink-900">Mesajlar</span>
            <span className="rounded-full bg-accent px-2 py-[5px] text-[12px] font-bold text-ink-900">
              3 yeni
            </span>
          </div>
          {konusmalar.map((c) => {
            const aktif = c.id === activeId;
            const onizleme =
              c.id === "seed"
                ? deal === "accepted"
                  ? "Anlaşıldı ✓ — 4.500 TL"
                  : "Güncel teklif: 4.500 TL"
                : c.son;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex w-full gap-2.5 border-l-[3px] px-3.5 py-3 text-left transition-colors ${
                  aktif
                    ? "border-l-primary bg-primary-soft"
                    : "border-l-transparent hover:bg-subtle"
                }`}
              >
                <span
                  className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                    aktif
                      ? "bg-ink-900 text-accent"
                      : "bg-primary-soft text-primary-hover"
                  }`}
                >
                  {c.harf}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate text-[14px] font-bold text-ink-900">
                      {c.ad}
                    </span>
                    <span className="flex-none text-[11.5px] font-medium text-ink-400">
                      {c.saat}
                    </span>
                  </span>
                  <span
                    className={`mt-[3px] block truncate text-[12px] font-semibold ${
                      aktif ? "text-primary-hover" : "text-ink-400"
                    }`}
                  >
                    {c.ilan}
                  </span>
                  <span className="mt-[3px] block truncate text-[12.5px] font-medium text-ink-500">
                    {onizleme}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* ── Sohbet ── */}
        <section className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
          {/* İlan bağlamı */}
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
            <div className="ref-image flex h-11 w-11 flex-none items-center justify-center rounded-control font-mono text-[9px] text-[#968cac]">
              görsel
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href="/ilan/dawn-fm-imzali-cd"
                className="block truncate text-sm font-bold text-ink-900"
              >
                {activeConv.ilan}
              </Link>
              <div className="mt-[3px] text-[12.5px] font-medium text-ink-400">
                Alıcının fiyatı:{" "}
                <span className="font-bold text-ink-900">
                  {fiyatText(SEED_TALEP.fiyatNum)}
                </span>{" "}
                · İlan {talepNo(SEED_TALEP.id)}
              </div>
            </div>
            <Link
              href="/ilan/dawn-fm-imzali-cd"
              className="flex-none text-[13px] font-semibold"
            >
              İlanı Gör
            </Link>
          </div>

          {isSeed ? (
            <>
              {/* Mesaj akışı */}
              <div
                ref={threadRef}
                className="flex h-[calc(100vh-330px)] min-h-[220px] flex-col gap-3.5 overflow-y-auto bg-subtle px-[18px] pb-2 pt-[18px]"
              >
                {msgs.map((m, i) => {
                  if (m.k === "sys") {
                    return (
                      <div
                        key={i}
                        className="max-w-[520px] self-center rounded-full bg-accent px-4 py-2.5 text-center text-[13.5px] font-bold leading-relaxed text-ink-900"
                      >
                        {m.text}
                      </div>
                    );
                  }
                  if (m.k === "sunum") {
                    return (
                      <div
                        key={i}
                        className="max-w-[440px] self-start rounded-card border border-border bg-card p-3.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-1 gap-1.5">
                            {["foto 1", "foto 2", "foto 3"].map((f) => (
                              <div
                                key={f}
                                className="ref-image flex aspect-[3/4] w-[46px] flex-none items-center justify-center rounded-lg font-mono text-[9px] text-[#968cac]"
                              >
                                {f}
                              </div>
                            ))}
                            <div className="flex aspect-[3/4] w-[46px] flex-none items-center justify-center rounded-lg bg-page text-[12px] font-bold text-ink-500">
                              +3
                            </div>
                          </div>
                          <ButtonLink
                            href="/sunum-detay"
                            variant="primary"
                            size="sm"
                            className="flex-none"
                          >
                            Sunumu Gör ›
                          </ButtonLink>
                        </div>
                        <div className="mt-2 text-[11.5px] font-medium text-ink-300">
                          {m.time}
                        </div>
                      </div>
                    );
                  }
                  if (m.k === "text") {
                    const mine = m.by === VIEWER;
                    if (mine) {
                      return (
                        <div key={i} className="max-w-[430px] self-end text-right">
                          <div className="rounded-[14px_4px_14px_14px] bg-primary px-3.5 py-[11px] text-left text-[14.5px] font-medium leading-relaxed text-white">
                            {m.text}
                          </div>
                          <div className="mt-[5px] text-[11.5px] font-medium text-ink-300">
                            {m.time}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="flex max-w-[430px] gap-2 self-start">
                        <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink-900 text-[10.5px] font-bold text-accent">
                          {avOf(m.by)}
                        </div>
                        <div>
                          <div className="rounded-[4px_14px_14px_14px] border border-border bg-card px-3.5 py-[11px] text-[14.5px] font-medium leading-relaxed text-ink-900">
                            {m.text}
                          </div>
                          <div className="mt-[5px] text-[11.5px] font-medium text-ink-300">
                            {nameOf(m.by)} · {m.time}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // offer
                  const mine = m.by === VIEWER;
                  const canAct =
                    m.st === "pending" && !mine && deal === "negotiating";
                  let border = "border-border";
                  if (m.st === "pending" || m.st === "accepted")
                    border = "border-primary";
                  if (m.st === "rejected") border = "border-danger-line";
                  return (
                    <div
                      key={i}
                      className={`w-[380px] max-w-full self-center rounded-panel border-[1.5px] bg-card px-4 py-3.5 ${border}`}
                    >
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="text-[12px] font-bold uppercase tracking-[0.8px] text-ink-400">
                          {m.note} · {nameOf(m.by)}
                        </span>
                        <span className="flex-none text-[11.5px] font-medium text-ink-300">
                          {m.time}
                        </span>
                      </div>
                      {m.st === "superseded" && (
                        <>
                          <div className="mt-2 text-2xl font-extrabold text-ink-300 line-through">
                            {m.amount} TL
                          </div>
                          <div className="mt-1.5 text-[12.5px] font-semibold text-ink-300">
                            Üzerine yeni teklif verildi
                          </div>
                        </>
                      )}
                      {m.st === "accepted" && (
                        <>
                          <div className="mt-2 text-2xl font-extrabold text-ink-900">
                            {m.amount} TL
                          </div>
                          <div className="mt-2 inline-block rounded-full bg-primary-soft px-2.5 py-1.5 text-[12.5px] font-bold text-primary-hover">
                            Kabul edildi ✓
                          </div>
                        </>
                      )}
                      {m.st === "rejected" && (
                        <>
                          <div className="mt-2 text-2xl font-extrabold text-ink-300 line-through">
                            {m.amount} TL
                          </div>
                          <div className="mt-2 inline-block rounded-full bg-danger-soft px-2.5 py-1.5 text-[12.5px] font-bold text-danger">
                            Reddedildi
                          </div>
                        </>
                      )}
                      {m.st === "pending" && mine && (
                        <>
                          <div className="mt-2 text-2xl font-extrabold text-ink-900">
                            {m.amount} TL
                          </div>
                          <div className="mt-2 inline-block rounded-full bg-accent-soft px-2.5 py-1.5 text-[12.5px] font-bold text-accent-ink">
                            Karşı tarafın yanıtı bekleniyor
                          </div>
                        </>
                      )}
                      {canAct && (
                        <>
                          <div className="mt-2 text-2xl font-extrabold text-ink-900">
                            {m.amount} TL
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={accept}
                              className="flex-1 cursor-pointer rounded-control bg-primary px-3 py-3 text-[14px] font-bold text-white hover:bg-primary-hover"
                            >
                              Kabul Et
                            </button>
                            <button
                              type="button"
                              onClick={() => setOfferOpen(true)}
                              className="flex-1 cursor-pointer rounded-control bg-accent px-3 py-3 text-[14px] font-bold text-ink-900 hover:brightness-95"
                            >
                              Revize Teklif
                            </button>
                            <button
                              type="button"
                              onClick={reject}
                              className="flex-none cursor-pointer rounded-control border-[1.5px] border-danger-line bg-card px-3.5 py-3 text-[14px] font-bold text-danger hover:bg-danger-soft"
                            >
                              Reddet
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Anlaşma sonrası — alıcı ödemeye geçer (kargo satıcının işi) */}
              {deal === "accepted" && (
                <div className="border-t border-hairline bg-primary-soft px-4 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-extrabold leading-snug text-primary-hover">
                        Anlaşma tamam ✓ — sıra ödemede
                      </div>
                      <div className="mt-1 text-[13px] font-medium leading-snug text-primary-hover/80">
                        Ödemeni güvenceye al; satıcı 3 gün içinde kargolar, sen
                        teslim alıp onaylayınca ödeme aktarılır.
                      </div>
                    </div>
                    <Link
                      href="/siparis"
                      className="flex-none rounded-control bg-primary px-[18px] py-3 text-[14px] font-bold text-white hover:bg-primary-hover"
                    >
                      Ödemeye Geç ›
                    </Link>
                  </div>
                </div>
              )}

              {/* Revize teklif paneli */}
              {offerOpen && deal === "negotiating" && (
                <div className="flex flex-wrap items-center gap-2.5 border-t border-hairline bg-accent-soft px-4 py-3">
                  <label
                    htmlFor="revize-teklif"
                    className="flex-none text-[13.5px] font-bold text-accent-ink"
                  >
                    Teklifin (TL):
                  </label>
                  <input
                    id="revize-teklif"
                    value={offerVal}
                    onChange={(e) =>
                      setOfferVal(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))
                    }
                    inputMode="numeric"
                    placeholder="örn. 4400"
                    className="w-[130px] rounded-control border-[1.5px] border-border-input bg-card px-3 py-[11px] text-[15px] font-bold text-ink-900 outline-none focus:border-primary"
                  />
                  <span className="text-[12.5px] font-medium leading-snug text-accent-ink">
                    Yeni teklifin öncekini geçersiz kılar; ek ücret yok.
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOfferOpen(false)}
                      className="cursor-pointer bg-transparent p-2.5 text-[13.5px] font-semibold text-ink-400"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={counterSend}
                      disabled={!offerNum || offerNum <= 0}
                      className={`rounded-control px-[18px] py-3 text-[14px] font-bold ${
                        offerNum > 0
                          ? "cursor-pointer bg-ink-900 text-white hover:bg-footer"
                          : "cursor-not-allowed bg-[#efebf5] text-ink-300"
                      }`}
                    >
                      Teklifi Gönder
                    </button>
                  </div>
                </div>
              )}

              {/* Mesaj yazma */}
              <div className="flex items-center gap-2.5 border-t border-hairline bg-card px-4 py-3">
                {deal === "negotiating" && (
                  <button
                    type="button"
                    onClick={() => setOfferOpen(true)}
                    className="flex-none cursor-pointer rounded-control bg-accent-soft px-3.5 py-3 text-[13.5px] font-bold text-accent-ink hover:brightness-95"
                  >
                    + Teklif Ver
                  </button>
                )}
                <input
                  value={msgText}
                  aria-label="Mesaj yaz"
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendText();
                  }}
                  placeholder="Mesaj yaz..."
                  className="flex-1 rounded-control border-[1.5px] border-border-input bg-card px-3.5 py-3 text-[14.5px] font-medium text-ink-900 outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={sendText}
                  className="flex-none cursor-pointer rounded-control bg-primary px-5 py-3 text-[14.5px] font-bold text-white hover:bg-primary-hover"
                >
                  Gönder
                </button>
              </div>
            </>
          ) : (
            /* Placeholder konuşma */
            <div className="flex h-[calc(100vh-330px)] min-h-[220px] flex-col items-center justify-center gap-3 bg-subtle px-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary-hover">
                {activeConv.harf}
              </div>
              <div className="text-base font-bold text-ink-900">
                {activeConv.ad} ile sohbet
              </div>
              <p className="max-w-[320px] text-[14px] font-medium leading-relaxed text-ink-400">
                Bu önizlemede yalnızca plakdukkani34 ile olan sohbetin tam geçmişi
                yüklü. Bu konuşmayı açmak için seç.
              </p>
              <button
                type="button"
                onClick={() => setActiveId("seed")}
                className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-4 py-2.5 text-[14px] font-bold text-ink-900 hover:border-primary hover:text-primary"
              >
                Bu konuşmayı aç
              </button>
            </div>
          )}
        </section>

        {/* ── Yan panel ── */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[120px]">
          {/* Platform dışına çıkma uyarısı */}
          <div className="rounded-card bg-footer p-4">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-[15px] leading-none">
                ⚠️
              </span>
              <div className="text-[13px] font-extrabold uppercase tracking-[1px] text-accent">
                Alışverişi dışarı taşıma
              </div>
            </div>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-white">
              Pazarlık, ödeme ve teslimat{" "}
              <strong className="font-extrabold text-accent">
                yalnızca BulBana üzerinden
              </strong>{" "}
              yürütülmelidir. Karşı taraf seni IBAN&apos;a havale, kapıda nakit
              ya da başka bir uygulamaya geçmeye çağırıyorsa kabul etme.
            </p>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-white">
              Uygulama dışında yapılan ödemelerde güvenli ödeme, iade ve itiraz
              hakkın işlemez; doğabilecek dolandırıcılık ve kayıplardan{" "}
              <strong className="font-extrabold text-accent">
                BulBana sorumlu değildir
              </strong>
              .
            </p>
          </div>

          <div className="overflow-hidden rounded-card border-l-[4px] border-l-primary bg-primary-soft p-4">
            <div className="text-[13px] font-extrabold uppercase tracking-[1px] text-primary-hover">
              3 Gün Kuralı
            </div>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-700">
              Teklif kabul edilince satıcı ürünü{" "}
              <strong className="font-extrabold text-primary-hover">
                3 gün içinde
              </strong>{" "}
              kargoya verir, takip numarasını sohbete işler.
            </p>
          </div>

        </aside>
      </div>
    </main>
  );
}
