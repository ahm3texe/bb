"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/** Bir kayda iliştirilebilecek en fazla ekran görüntüsü — uçtaki sınırla aynı. */
const EN_FAZLA_EK = 3;
/** Ek başına üst sınır; `/api/yukle` de aynı sınırı ayrıca uygular. */
const MAX_EK_BYTE = 10 * 1024 * 1024;

/** Seçilmiş ama henüz yüklenmemiş bir ek. */
type EkDosya = { id: string; dosya: File; url: string };

/** Listede gösterilen kayıt — `/api/destek` GET yanıtının alt kümesi. */
type AcikTalep = {
  no: string;
  konu: string;
  baslik: string;
  /** ISO damga; ekranda gün/ay olarak biçimlenir. */
  zaman: string;
  durum: "Yanıtlandı" | "İncelemede" | "Kapandı";
};

// NOT: burada üç UYDURMA kayıt vardı ("#DT-5106 Kargo 3 gündür
// güncellenmedi" gibi) ve kullanıcı bunları kendi destek kayıtları
// sanıyordu — biri de olmayan bir özelliğe atıfta bulunuyordu ("şifre
// değişiminde SMS kodu gelmedi"). Gerçek kayıtlar `/api/destek` GET
// ucundan geliyor; uç zaten vardı, hiçbir yerden çağrılmıyordu.

/** "11 Tem" — kayıt listesindeki kısa tarih. */
function kisaTarih(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function durumVariant(d: AcikTalep["durum"]) {
  if (d === "Yanıtlandı") return "good" as const;
  if (d === "İncelemede") return "violet" as const;
  return "muted" as const;
}

export function DestekClient({
  /** Sohbetten gelindiyse konu ve sipariş numarası hazır gelir. */
  hazirKonu = "",
  hazirRefNo = "",
  hazirBaslik = "",
}: {
  hazirKonu?: string;
  hazirRefNo?: string;
  hazirBaslik?: string;
}) {
  // Sohbetten "ürün anlatıldığı gibi değil" denilerek gelindiyse konu,
  // sipariş numarası ve başlık hazır gelir; kullanıcı sorunu baştan
  // yazmak zorunda kalmasın. Adres satırı ilk render'da okunur.
  const [konu, setKonu] = useState(hazirKonu);
  const [refNo, setRefNo] = useState(hazirRefNo);
  const [baslik, setBaslik] = useState(hazirBaslik);
  const [aciklama, setAciklama] = useState("");
  /**
   * Seçilen ekran görüntüleri. Dosyanın kendisi burada durur; sunucuya
   * ancak kayıt gönderilirken yüklenir — kullanıcı vazgeçerse diskte
   * yetim dosya bırakmayalım.
   */
  const [ekDosyalar, setEkDosyalar] = useState<EkDosya[]>([]);
  const [ekHatasi, setEkHatasi] = useState("");
  const dosyaGirdisi = useRef<HTMLInputElement>(null);
  const [gitti, setGitti] = useState(false);

  // Kendi destek kayıtları — sabit örnekler değil, gerçek uçtan.
  const [kayitlarim, setKayitlarim] = useState<AcikTalep[]>([]);
  const [kayitlarYuklendi, setKayitlarYuklendi] = useState(false);
  // E-posta aktif hesabın kaydından gelir; sabit adres yanlış hesabı gösteriyordu.
  /** Doğrulanmış bildirim adresi — destek yanıtı buraya gider. */
  const [eposta, setEposta] = useState("");
  useEffect(() => {
    let iptal = false;
    fetch("/api/eposta")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: { eposta?: { adres: string; dogrulandi: boolean } | null } | null) => {
        if (!iptal && v?.eposta?.dogrulandi) setEposta(v.eposta.adres);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  const kayitlariTazele = useCallback(() => {
    fetch("/api/destek")
      .then((r) => (r.ok ? r.json() : { kayitlar: [] }))
      .then((v: { kayitlar?: AcikTalep[] }) => {
        setKayitlarim(v.kayitlar ?? []);
        setKayitlarYuklendi(true);
      })
      .catch(() => setKayitlarYuklendi(true));
  }, []);

  useEffect(kayitlariTazele, [kayitlariTazele]);

  /** Seçilen dosyaları listeye alır; tür ve boyut burada da süzülür. */
  function ekSec(secilen: FileList | null) {
    if (!secilen?.length) return;
    setEkHatasi("");
    const bos = EN_FAZLA_EK - ekDosyalar.length;
    if (bos <= 0) {
      setEkHatasi(`En fazla ${EN_FAZLA_EK} ek ekleyebilirsin.`);
      return;
    }

    const kabul: EkDosya[] = [];
    for (const dosya of Array.from(secilen).slice(0, bos)) {
      if (!dosya.type.startsWith("image/")) {
        setEkHatasi("Yalnızca görsel eklenebilir (ekran görüntüsü, fotoğraf).");
        continue;
      }
      if (dosya.size > MAX_EK_BYTE) {
        setEkHatasi(`"${dosya.name}" 10 MB sınırını aşıyor.`);
        continue;
      }
      kabul.push({
        id: `${dosya.name}-${dosya.lastModified}-${Math.random()}`,
        dosya,
        url: URL.createObjectURL(dosya),
      });
    }
    if (kabul.length) setEkDosyalar((p) => [...p, ...kabul]);
  }

  function ekKaldir(id: string) {
    setEkHatasi("");
    setEkDosyalar((p) => {
      p.filter((e) => e.id === id).forEach((e) => URL.revokeObjectURL(e.url));
      return p.filter((e) => e.id !== id);
    });
  }

  /**
   * Ekler artık ZORUNLU DEĞİL.
   *
   * Eskiden `ekler > 0` gönderim şartıydı ama ortada yükleme yoktu: kural,
   * kullanıcıyı sahte bir düğmeye tıklamaya zorluyordu. Ekran görüntüsü
   * gerçekten yardımcı olur, yine de "hesabımı kapatın" gibi bir kayıt
   * için zorunlu tutmak anlamsız.
   */
  const acikOk = aciklama.trim().length >= 20;
  const canSend =
    konu !== "" &&
    refNo.trim().length > 0 &&
    baslik.trim().length >= 5 &&
    acikOk;

  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [kayitNo, setKayitNo] = useState("");

  /** Kaydı sunucuya yazar; "kayıt açıldı" ifadesi ancak bundan sonra doğrudur. */
  async function gonder() {
    if (!canSend || gonderiliyor) return;
    setGonderiliyor(true);
    setHata("");
    try {
      // 1) Ekler önce yüklenir; kayıt ancak yollar elde edilince açılır.
      //    Sıra tersi olsaydı yükleme başarısızlığında kayıt eksiz kalır,
      //    kullanıcı ise ekran görüntüsünü gönderdiğini sanırdı.
      let ekYollari: string[] = [];
      if (ekDosyalar.length) {
        const form = new FormData();
        ekDosyalar.forEach((e) => form.append("dosyalar", e.dosya));
        const y = await fetch("/api/yukle", { method: "POST", body: form });
        const yv = (await y.json().catch(() => ({}))) as {
          hata?: string;
          yollar?: string[];
        };
        if (!y.ok) throw new Error(yv.hata ?? "Ekler yüklenemedi.");
        ekYollari = yv.yollar ?? [];
      }

      const r = await fetch("/api/destek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          konu,
          refNo,
          // Sohbetten gelindiyse referans doğrudan sipariş kimliğidir.
          sunumId: hazirRefNo || undefined,
          baslik,
          aciklama,
          ...(ekYollari.length ? { ekler: ekYollari } : {}),
        }),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.hata ?? "Destek kaydı oluşturulamadı.");
      // Önizleme URL'leri artık gerekmez (IlanAcForm ile aynı desen:
      // sayfadan çıkıldığında tarayıcı zaten hepsini serbest bırakır, bu
      // yüzden ayrı bir unmount temizliği yok).
      ekDosyalar.forEach((e) => URL.revokeObjectURL(e.url));
      setEkDosyalar([]);
      setKayitNo(v.kayit?.no ?? "");
      setGitti(true);
      // Yeni kayıt alttaki listede de görünsün.
      kayitlariTazele();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Destek kaydı oluşturulamadı.");
    } finally {
      setGonderiliyor(false);
    }
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
                    value={eposta || "Ayarlar > Bildirim tercihleri'nden ekle"}
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

              {/* Ekler — GERÇEK dosya seçici; yükleme gönderim anında yapılır. */}
              <label
                htmlFor="destek-ek"
                className="mb-2 mt-4 block text-[13px] font-bold text-ink-900"
              >
                Ekran görüntüsü{" "}
                <span className="font-medium text-ink-300">
                  (isteğe bağlı, en çok {EN_FAZLA_EK})
                </span>
              </label>
              <input
                ref={dosyaGirdisi}
                id="destek-ek"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  ekSec(e.target.files);
                  // Aynı dosya art arda seçilebilsin diye girdi sıfırlanır.
                  e.target.value = "";
                }}
              />
              <div className="grid grid-cols-6 gap-2">
                {ekDosyalar.map((ek) => (
                  <div
                    key={ek.id}
                    className="relative aspect-square overflow-hidden rounded-[10px] border border-border bg-subtle"
                  >
                    {/* Yerel önizleme: dosya henüz sunucuda değil, o yüzden
                        next/image değil düz <img>. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ek.url}
                      alt={ek.dosya.name}
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => ekKaldir(ek.id)}
                      aria-label={`${ek.dosya.name} ekini kaldır`}
                      title="Eki kaldır"
                      className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-ink-900/75 text-[11px] font-bold leading-none text-white hover:bg-danger"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {ekDosyalar.length < EN_FAZLA_EK && (
                  <button
                    type="button"
                    onClick={() => dosyaGirdisi.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-border-input bg-subtle text-[17px] font-medium text-ink-300 hover:border-primary hover:text-primary"
                  >
                    +
                  </button>
                )}
              </div>
              {ekHatasi && (
                <p role="alert" className="mt-2 text-[11.5px] font-bold text-danger">
                  {ekHatasi}
                </p>
              )}

              {/* Gönder */}
              <div className="mt-5 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => void gonder()}
                  disabled={!canSend || gonderiliyor}
                  className={`rounded-[13px] px-6 py-4 text-[14.5px] font-extrabold leading-none ${
                    canSend
                      ? "cursor-pointer bg-primary text-white hover:bg-primary-hover"
                      : "cursor-not-allowed bg-[#efebf5] text-ink-300"
                  }`}
                >
                  Talebi Gönder
                </button>
                {hata && (
                  <span role="alert" className="text-[12.5px] font-bold text-acil">
                    {hata}
                  </span>
                )}
                <span className="text-[11.5px] font-medium leading-relaxed text-ink-300">
                  Zorunlu alanlar: kategori, sipariş/talep no, başlık (en az 5)
                  ve açıklama (en az 20). Ekran görüntüsü isteğe bağlıdır ama
                  incelemeyi hızlandırır.
                </span>
              </div>
            </section>
          ) : (
            <section className="rounded-panel border border-border bg-card px-[30px] py-10 text-center">
              <div className="mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white">
                ✓
              </div>
              <h1 className="mt-[18px] text-[22px] font-extrabold leading-tight text-ink-900">
                Talebin alındı{kayitNo ? ` — ${kayitNo}` : ""}
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
                {kayitlarYuklendi ? `${kayitlarim.length} kayıt` : "yükleniyor…"}
              </span>
            </div>
            {kayitlarYuklendi && kayitlarim.length === 0 && (
              <p className="rounded-control border border-dashed border-border-input bg-subtle px-4 py-5 text-center text-[13px] font-medium text-ink-400">
                Henüz destek kaydın yok. Yukarıdaki formdan açtığın kayıtlar
                burada listelenir.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {kayitlarim.map((t) => (
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
                    {kisaTarih(t.zaman)}
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
                href="/guvenli-alisveris"
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
