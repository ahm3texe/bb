"use client";

import { useState } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";

const konular = [
  "Sipariş & Kargo",
  "Ödeme & Komisyon",
  "İlan & Sunum",
  "Hesap & Güvenlik",
  "Diğer",
];

const inputCls =
  "w-full box-border rounded-control border-[1.5px] border-border-input px-3.5 py-3 text-[13.5px] font-semibold text-ink-900 outline-none focus:border-primary";

type AcikTalep = {
  no: string;
  konu: string;
  baslik: string;
  tarih: string;
  durum: "Yanıtlandı" | "İncelemede" | "Kapandı";
};

const acikTaleplerim: AcikTalep[] = [
  {
    no: "#DT-5106",
    konu: "Sipariş & Kargo",
    baslik: "Kargo 3 gündür güncellenmedi",
    tarih: "11 Tem",
    durum: "Yanıtlandı",
  },
  {
    no: "#DT-5089",
    konu: "Ödeme & Komisyon",
    baslik: "Cüzdanıma aktarım henüz görünmüyor",
    tarih: "9 Tem",
    durum: "İncelemede",
  },
  {
    no: "#DT-5042",
    konu: "Hesap & Güvenlik",
    baslik: "Kimlik doğrulama fotoğrafım reddedildi",
    tarih: "2 Tem",
    durum: "Kapandı",
  },
];

function durumVariant(d: AcikTalep["durum"]) {
  if (d === "Yanıtlandı") return "good" as const;
  if (d === "İncelemede") return "violet" as const;
  return "muted" as const;
}

export default function DestekPage() {
  const [konu, setKonu] = useState("");
  const [refNo, setRefNo] = useState("");
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [ekler, setEkler] = useState(0);
  const [gitti, setGitti] = useState(false);

  // Sayfadaki bütün alanlar zorunlu — hiçbiri boş bırakılamaz.
  const acikOk = aciklama.trim().length >= 20;
  const canSend =
    konu !== "" &&
    refNo.trim().length > 0 &&
    baslik.trim().length >= 5 &&
    acikOk &&
    ekler > 0;

  function gonder() {
    if (canSend) setGitti(true);
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-5">
      {/* Breadcrumb */}
      <div className="py-2.5 text-[12.5px] font-medium text-ink-400">
        <Link href="/yardim" className="text-ink-400 hover:text-primary">
          Yardım Merkezi
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">Destek Kaydı</span>
      </div>

      <div className="grid items-start gap-7 md:grid-cols-[minmax(0,1fr)_384px]">
        {/* ── Sol kolon ── */}
        <div className="min-w-0">
          {!gitti ? (
            <section className="rounded-panel border border-border bg-card p-[22px]">
              <h1 className="text-[22px] font-extrabold leading-tight text-ink-900">
                Destek Kaydı Oluştur
              </h1>
              <p className="mb-[18px] mt-1 text-[13px] font-medium leading-relaxed text-ink-400">
                Hafta içi 09.00–18.00 arasında ortalama 2 saat içinde
                yanıtlıyoruz.
              </p>

              {/* Konu kategorisi */}
              <label className="mb-2 block text-[13px] font-bold text-ink-900">
                Konu kategorisi <span className="text-danger">*</span>
              </label>
              <div className="mb-[18px] flex flex-wrap gap-2">
                {konular.map((k) => {
                  const active = konu === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKonu(k)}
                      className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-[11px] text-[12.5px] leading-none transition-colors ${
                        active
                          ? "border-primary bg-primary-soft font-bold text-primary-hover"
                          : "border-border-input bg-card font-semibold text-ink-500 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {k}
                      {active ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>

              {/* Ref no + E-posta */}
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-ink-900">
                    İlgili sipariş / talep no{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value.slice(0, 20))}
                    placeholder="örn. #BB-78412"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-ink-900">
                    E-posta
                  </label>
                  <input
                    value="emre.k@eposta.com"
                    readOnly
                    className="w-full box-border rounded-control border-[1.5px] border-border bg-subtle px-3.5 py-3 text-[13.5px] font-semibold text-ink-400 outline-none"
                  />
                </div>
              </div>

              {/* Başlık */}
              <label className="mb-2 block text-[13px] font-bold text-ink-900">
                Başlık <span className="text-danger">*</span>
              </label>
              <input
                value={baslik}
                onChange={(e) => setBaslik(e.target.value.slice(0, 80))}
                placeholder="Sorunu tek cümleyle özetle"
                className={`${inputCls} mb-4`}
              />

              {/* Açıklama */}
              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-[13px] font-bold text-ink-900">
                  Açıklama <span className="text-danger">*</span>
                </label>
                {acikOk ? (
                  <span className="text-[11.5px] font-semibold text-primary-hover">
                    {aciklama.length}/600
                  </span>
                ) : (
                  <span className="text-[11.5px] font-semibold text-danger">
                    {aciklama.length}/600 · en az 20 karakter
                  </span>
                )}
              </div>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value.slice(0, 600))}
                rows={5}
                placeholder="Ne oldu, ne zaman oldu, ne beklersin? Ekran görüntüsü varsa aşağıya ekle."
                className="w-full box-border resize-y rounded-control border-[1.5px] border-border-input px-3.5 py-3 text-[13.5px] font-medium leading-relaxed text-ink-900 outline-none focus:border-primary"
              />

              {/* Ekler */}
              <label className="mb-2 mt-4 block text-[13px] font-bold text-ink-900">
                Ekler <span className="text-danger">*</span>{" "}
                <span className="font-medium text-ink-300">(en çok 3)</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 3 }, (_, i) => {
                  const filled = i < ekler;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEkler(i < ekler ? i : i + 1)}
                      className={
                        filled
                          ? "flex aspect-square items-center justify-center rounded-[10px] text-[10.5px] font-bold text-primary-hover"
                          : "flex aspect-square items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-border-input bg-subtle text-[17px] font-medium text-ink-300 hover:border-primary hover:text-primary"
                      }
                      style={
                        filled
                          ? {
                              background:
                                "repeating-linear-gradient(45deg, #bef264 0px, #bef264 8px, rgb(190 242 100 / 0.55) 8px, rgb(190 242 100 / 0.55) 16px)",
                            }
                          : undefined
                      }
                    >
                      {filled ? `ek ${i + 1} ✓` : "+"}
                    </button>
                  );
                })}
              </div>

              {/* Gönder */}
              <div className="mt-5 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={gonder}
                  disabled={!canSend}
                  className={`rounded-[13px] px-6 py-4 text-[14.5px] font-extrabold leading-none ${
                    canSend
                      ? "cursor-pointer bg-primary text-white hover:bg-primary-hover"
                      : "cursor-not-allowed bg-[#efebf5] text-ink-300"
                  }`}
                >
                  Talebi Gönder
                </button>
                <span className="text-[11.5px] font-medium leading-relaxed text-ink-300">
                  Tüm alanlar zorunlu: kategori, sipariş/talep no, başlık (en az
                  5), açıklama (en az 20) ve en az 1 ek.
                </span>
              </div>
            </section>
          ) : (
            <section className="rounded-panel border border-border bg-card px-[30px] py-10 text-center">
              <div className="mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white">
                ✓
              </div>
              <h1 className="mt-[18px] text-[22px] font-extrabold leading-tight text-ink-900">
                Talebin alındı — #DT-5127
              </h1>
              <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink-700">
                Konu: {konu || "Diğer"}. Yanıtı e-postana ve bildirimlerine
                göndereceğiz — hafta içi ortalama 2 saat.
              </p>
              <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/yardim"
                  className="rounded-control border-[1.5px] border-border-input bg-card px-5 py-3 text-[13.5px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                >
                  Yardım Merkezine Dön
                </Link>
                <Link
                  href="/"
                  className="rounded-control bg-primary px-5 py-3.5 text-[13.5px] font-bold text-white hover:bg-primary-hover"
                >
                  Ana Sayfa
                </Link>
              </div>
            </section>
          )}

          {/* ── Destek taleplerim ── */}
          <section className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-extrabold text-ink-900">
                Destek taleplerim
              </h2>
              <span className="text-[12px] font-semibold text-ink-400">
                {acikTaleplerim.length} kayıt
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {acikTaleplerim.map((t) => (
                <div
                  key={t.no}
                  className="flex items-center gap-3 rounded-control border border-border bg-card px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-primary-hover">
                        {t.no}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-300">
                        {t.konu}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[13.5px] font-semibold text-ink-900">
                      {t.baslik}
                    </div>
                  </div>
                  <span className="flex-none text-[11.5px] font-medium text-ink-400">
                    {t.tarih}
                  </span>
                  <Chip variant={durumVariant(t.durum)}>{t.durum}</Chip>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Aside ── */}
        <aside className="flex flex-col gap-3.5 md:sticky md:top-[150px]">
          <div className="rounded-card border border-border bg-card p-[18px]">
            <div className="text-xs font-bold uppercase tracking-[1px] text-ink-400">
              Önce buna bak
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link
                href="/nasil-calisir#komisyon"
                className="text-[13px] font-semibold leading-snug"
              >
                %4 komisyon nasıl işler?
              </Link>
              <Link
                href="/itiraz"
                className="text-[13px] font-semibold leading-snug"
              >
                Ürünle ilgili sorun için itiraz süreci
              </Link>
              <Link
                href="/yardim"
                className="text-[13px] font-semibold leading-snug"
              >
                Yardım merkezindeki tüm konular
              </Link>
            </div>
          </div>
          <div className="rounded-card bg-ink-900 p-[18px] text-white">
            <div className="text-[13.5px] font-extrabold leading-tight">
              Çalışma saatleri
            </div>
            <p className="mt-2.5 text-xs font-medium leading-relaxed text-[#cfc5e8]">
              Hafta içi 09.00–18.00 · ortalama yanıt 2 saat.
              <br />
              Sipariş ve itiraz konuları önceliklidir; aktif bir itirazın varsa
              bu form yerine itiraz kaydından yaz.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
