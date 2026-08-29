"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useOturumSahibi } from "@/lib/aktif-kullanici";
import { fiyatText } from "@/lib/data";
import type { IadeAdim } from "@/lib/anlasma";
import type { AktarimTalebi } from "@/lib/aktarim";
import type { EpostaIsi } from "@/lib/eposta";

/**
 * Moderasyon paneli — destek ekibinin işini yaptığı yer.
 *
 * BU PANEL BİR DÖNEM TAMAMEN SAHTEYDİ: `ilanData`, `itirazData` ve
 * `sonIslemler` boş sabit dizilerdi, `kullaniciData` elle yazılmıştı ve
 * dosyada tek bir `fetch` yoktu. Düğmeler yalnızca yerel state değiştiriyordu.
 *
 * Bunun görünürdeki bedeli, panelin boş olmasından ibaret değildi. İtiraz
 * sürecinin üç adımı (`karar`, `ikinci-karar`, `odeme`) ve IBAN aktarımının
 * sonuçlandırılması destek yetkisi ister ve uçları doğru korunuyordu — ama
 * o adımları çağıran ekran hiç yoktu. Dolayısıyla:
 *
 *   • açılan bir itiraz "inceleme" adımında sonsuza kadar kalıyor,
 *   • alıcının parası havuzda asılı duruyor,
 *   • ilan `itiraz-suruyor` gerekçesiyle kalıcı olarak kilitleniyor,
 *   • aktarım talepleri hiç ödenmiyordu.
 *
 * Panel artık gerçek kuyrukları okuyor (`/api/moderasyon`) ve gerçek uçları
 * çağırıyor. Karşılığı olmayan bölümler (ilan onayı, kullanıcı yönetimi)
 * KALDIRILDI: veri modelinde ilan onayı diye bir kavram yok ve boş bir
 * sekme, olmayan bir yetenek vaat etmekten başka işe yaramıyordu.
 */

type Bolum = "itirazlar" | "aktarimlar" | "destek" | "eposta" | "sms";

/** SMS kuyruğundaki bir mesaj (bkz. lib/sms.ts). */
type SmsIsi = {
  id: string;
  kime: string;
  metin: string;
  zaman: string;
  durum: "kuyrukta" | "gonderildi" | "hata";
};

/**
 * Kullanıcının `/destek` formundan açtığı kayıt.
 *
 * Bu kuyruk bir dönem hiç görünmüyordu: form gerçek kayıt yazıyor ve
 * kullanıcıya numara veriyordu ama kaydı okuyan ekran yoktu, durumu da
 * hiçbir yerden değişmiyordu — herkesin kaydı sonsuza dek "İncelemede"
 * kalıyordu.
 */
type DestekKaydi = {
  no: string;
  acan: string;
  konu: string;
  refNo: string;
  sunumId?: string;
  baslik: string;
  aciklama: string;
  ekler?: string[];
  durum: "İncelemede" | "Yanıtlandı" | "Kapandı";
  zaman: string;
};

type ItirazKaydi = {
  sunumId: string;
  talepId: string;
  ilanBaslik: string;
  alici: string;
  satici: string;
  tutar: number;
  adim: IadeAdim;
  itirazZamani?: string;
  karsiItiraz?: string;
  iadeKargo?: { firma: string; takipNo: string };
};

/**
 * Adımın ne anlama geldiği ve sırasının kimde olduğu.
 *
 * `sirada` cümlenin içinde geçtiği hâliyle yazılır — eki koddan üretmeye
 * çalışmak "sıra alıcında" gibi bozuk Türkçe veriyordu.
 */
const ADIM_BILGI: Record<
  IadeAdim,
  { etiket: string; destekte: boolean; sirada: string }
> = {
  inceleme: {
    etiket: "İnceleme bekliyor",
    destekte: true,
    sirada: "destek ekibinde",
  },
  "iade-kargosu-bekleniyor": {
    etiket: "İade kargosu bekleniyor",
    destekte: false,
    sirada: "alıcıda — ürünü geri göndermesi bekleniyor",
  },
  "iade-kargoda": {
    etiket: "İade kargoda",
    destekte: false,
    sirada: "kargo firmasında — teslim bildirimi bekleniyor",
  },
  "satici-onayi-bekleniyor": {
    etiket: "Satıcının kontrolü bekleniyor",
    destekte: false,
    sirada: "satıcıda — iade ürününü kontrol etmesi bekleniyor",
  },
  "karsi-itiraz": {
    etiket: "Karşı itiraz açıldı",
    destekte: true,
    sirada: "destek ekibinde",
  },
  "para-iadesi-bekleniyor": {
    etiket: "Para iadesi bekleniyor",
    destekte: true,
    sirada: "destek ekibinde",
  },
  tamamlandi: { etiket: "Tamamlandı", destekte: false, sirada: "—" },
  "satici-hakli": {
    etiket: "Satıcı lehine kapandı",
    destekte: false,
    sirada: "—",
  },
};

const kartCls = "rounded-card border border-border bg-card p-[18px]";
const dugmeCls =
  "cursor-pointer rounded-[10px] px-3 py-2 text-[12.5px] font-bold transition-colors disabled:cursor-default disabled:opacity-55";

function zamanMetni(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminClient() {
  const oturum = useOturumSahibi();
  const [bolum, setBolum] = useState<Bolum>("itirazlar");
  const [itirazlar, setItirazlar] = useState<ItirazKaydi[]>([]);
  const [aktarimlar, setAktarimlar] = useState<AktarimTalebi[]>([]);
  const [kuyruk, setKuyruk] = useState<EpostaIsi[]>([]);
  const [smsKuyruk, setSmsKuyruk] = useState<SmsIsi[]>([]);
  const [destekKayitlari, setDestekKayitlari] = useState<DestekKaydi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  /** İşlem yapılan satırın kimliği — çift tıklamayı ve yarış durumunu önler. */
  const [isleniyor, setIsleniyor] = useState("");

  type Kuyruk = {
    hata?: string;
    itirazlar?: ItirazKaydi[];
    aktarimlar?: AktarimTalebi[];
    destekKayitlari?: DestekKaydi[];
  };

  /** Gelen kuyruğu ekrana yazar. Yalnızca çözülmüş bir yanıtla çağrılır. */
  const uygula = useCallback((ok: boolean, v: Kuyruk) => {
    if (!ok) {
      setHata(v.hata ?? "Kuyruklar okunamadı.");
    } else {
      setHata("");
      setItirazlar(v.itirazlar ?? []);
      setAktarimlar(v.aktarimlar ?? []);
      setDestekKayitlari(v.destekKayitlari ?? []);
    }
    setYukleniyor(false);
  }, []);

  /** "Yenile" düğmesi ve her işlemden sonra çağrılır. */
  const yukle = useCallback(
    () =>
      fetch("/api/moderasyon")
        .then((r) => r.json().then((v: Kuyruk) => uygula(r.ok, v)))
        .catch(() => uygula(false, { hata: "Sunucuya ulaşılamadı." })),
    [uygula],
  );

  /**
   * E-posta kuyruğu ayrı uçtan gelir (`/api/eposta-kuyrugu`).
   *
   * Bu uç yalnızca destek ekibine açıktı ve doğru korunuyordu — ama onu
   * okuyan hiçbir ekran yoktu. Kuyruk 500 kayıtta sessizce kırpılıyor ve
   * kimse fark etmiyordu; ucun yazılma gerekçesi tam olarak buydu.
   */
  const kuyrukYukle = useCallback(
    () =>
      Promise.all([
        fetch("/api/eposta-kuyrugu")
          .then((r) => (r.ok ? r.json() : null))
          .then((v: { kuyruk?: EpostaIsi[] } | null) => {
            if (v?.kuyruk) setKuyruk(v.kuyruk);
          })
          .catch(() => undefined),
        // SMS kuyruğu da görünür olmalı: doğrulama kodları burada bekliyor
        // ve okuyan olmazsa "telefon doğrulama" hiç çalışmayan bir özellik
        // olurdu (bkz. app/api/sms-kuyrugu).
        fetch("/api/sms-kuyrugu")
          .then((r) => (r.ok ? r.json() : null))
          .then((v: { kuyruk?: SmsIsi[] } | null) => {
            if (v?.kuyruk) setSmsKuyruk(v.kuyruk);
          })
          .catch(() => undefined),
      ]).then(() => undefined),
    [],
  );

  useEffect(() => {
    let iptal = false;
    void kuyrukYukle();
    fetch("/api/moderasyon")
      .then((r) =>
        r.json().then((v: Kuyruk) => {
          if (!iptal) uygula(r.ok, v);
        }),
      )
      .catch(() => {
        if (!iptal) uygula(false, { hata: "Sunucuya ulaşılamadı." });
      });
    return () => {
      iptal = true;
    };
  }, [uygula, kuyrukYukle]);

  /** İtiraz sürecinde bir adımı işler. */
  async function itirazAdimi(sunumId: string, govde: Record<string, unknown>) {
    if (isleniyor) return;
    setIsleniyor(sunumId);
    setHata("");
    try {
      const r = await fetch(
        `/api/anlasmalar/${encodeURIComponent(sunumId)}/iade`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(govde),
        },
      );
      const v = (await r.json().catch(() => ({}))) as { hata?: string };
      if (!r.ok) {
        setHata(v.hata ?? "Adım işlenemedi.");
        return;
      }
      await yukle();
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setIsleniyor("");
    }
  }

  async function aktarimSonucla(
    id: string,
    durum: "tamamlandi" | "reddedildi",
  ) {
    if (isleniyor) return;
    // Ret bir gerekçe ister: kullanıcı parasının neden gelmediğini görmeli.
    let not: string | undefined;
    if (durum === "reddedildi") {
      const girilen = window.prompt("Ret gerekçesi (kullanıcıya gösterilir):");
      if (girilen === null) return;
      not = girilen.trim() || undefined;
      if (!not) {
        setHata("Ret için gerekçe gerekli.");
        return;
      }
    }
    setIsleniyor(id);
    setHata("");
    try {
      const r = await fetch("/api/aktarimlar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, durum, not }),
      });
      const v = (await r.json().catch(() => ({}))) as { hata?: string };
      if (!r.ok) {
        setHata(v.hata ?? "Aktarım sonuçlandırılamadı.");
        return;
      }
      await yukle();
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setIsleniyor("");
    }
  }

  /** Destek kaydının durumunu değiştirir; kullanıcıya bildirim gider. */
  async function destekDurum(no: string, durum: DestekKaydi["durum"]) {
    if (isleniyor) return;
    setIsleniyor(no);
    setHata("");
    try {
      const r = await fetch(`/api/destek/${encodeURIComponent(no)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durum }),
      });
      const v = (await r.json().catch(() => ({}))) as { hata?: string };
      if (!r.ok) {
        setHata(v.hata ?? "Kayıt güncellenemedi.");
        return;
      }
      await yukle();
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setIsleniyor("");
    }
  }

  const bekleyenAktarim = aktarimlar.filter((a) => a.durum === "islemde");
  const destekBekleyen = itirazlar.filter((i) => ADIM_BILGI[i.adim].destekte);

  const menu: { id: Bolum; ad: string; harf: string; rozet: number }[] = [
    {
      id: "itirazlar",
      ad: "İtirazlar",
      harf: "!",
      rozet: destekBekleyen.length,
    },
    {
      id: "aktarimlar",
      ad: "IBAN Aktarımları",
      harf: "₺",
      rozet: bekleyenAktarim.length,
    },
    {
      id: "destek",
      ad: "Destek Kayıtları",
      harf: "?",
      rozet: destekKayitlari.filter((k) => k.durum === "İncelemede").length,
    },
    {
      id: "eposta",
      ad: "E-posta Kuyruğu",
      harf: "@",
      rozet: kuyruk.filter((k) => k.durum === "hata").length,
    },
    {
      id: "sms",
      ad: "SMS Kuyruğu",
      harf: "#",
      rozet: smsKuyruk.filter((k) => k.durum === "hata").length,
    },
  ];

  return (
    <main className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-start gap-6 px-6 py-6 md:grid-cols-[232px_minmax(0,1fr)]">
      {/* ── Kenar çubuğu ── */}
      <aside className="sticky top-[150px] flex flex-col gap-1 rounded-panel bg-footer p-[14px] text-white">
        <div className="flex items-center gap-[9px] px-2 pb-4 pt-1">
          {/* "b" harfi yerine gerçek işaret; koyu zemin olduğu için beyaz
              kutunun içinde (bkz. public/logo-isaret.svg). */}
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-white">
            <Image
              src="/logo-isaret.svg"
              alt=""
              width={312}
              height={316}
              className="block h-[22px] w-[22px]"
            />
          </span>
          <div>
            <div className="text-base font-extrabold leading-none">
              {/* Logodaki gibi lime yeşili (bkz. components/Footer.tsx). */}
              bul<span className="text-accent">bana</span>
            </div>
            <div className="mt-[3px] text-[8.5px] font-bold leading-none tracking-[1.2px] text-accent">
              MODERASYON
            </div>
          </div>
        </div>

        {menu.map((m) => {
          const active = bolum === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setBolum(m.id)}
              className={`flex items-center gap-[10px] rounded-[10px] px-3 py-3 text-left transition-colors ${
                active
                  ? "bg-[#362258] font-bold text-white"
                  : "bg-transparent font-semibold text-[#b4a8d6] hover:bg-[#2e1d4e] hover:text-white"
              }`}
            >
              <span
                className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md text-[11px] font-extrabold ${
                  active
                    ? "bg-accent text-ink-900"
                    : "bg-[#362258] text-[#b4a8d6]"
                }`}
              >
                {m.harf}
              </span>
              <span className="flex-1 text-[13px]">{m.ad}</span>
              {m.rozet > 0 && (
                <span className="rounded-full bg-danger px-[7px] py-1 text-[10px] font-bold leading-none text-white">
                  {m.rozet}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-4 flex items-center gap-[9px] border-t border-footer-line px-2 pt-3">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-accent text-[11px] font-bold text-ink-900">
            {oturum.harf}
          </span>
          <div>
            <div className="text-xs font-bold leading-tight">
              {oturum.kullanici}
            </div>
            <Link
              href="/"
              className="text-[10.5px] font-semibold leading-tight text-[#8b7bb0] hover:text-white"
            >
              Siteye dön ›
            </Link>
          </div>
        </div>
      </aside>

      {/* ── İçerik ── */}
      <section className="min-w-0">
        <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[22px] font-extrabold leading-tight text-ink-900">
            {bolum === "itirazlar"
              ? "İtirazlar"
              : bolum === "aktarimlar"
                ? "IBAN Aktarımları"
                : bolum === "destek"
                  ? "Destek Kayıtları"
                  : bolum === "sms"
                    ? "SMS Kuyruğu"
                    : "E-posta Kuyruğu"}
          </h1>
          <button
            type="button"
            onClick={() => {
              void yukle();
              void kuyrukYukle();
            }}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Yenile
          </button>
        </div>

        {hata && (
          <p
            role="alert"
            className="mb-3.5 rounded-[12px] bg-danger-soft px-3.5 py-2.5 text-[12.5px] font-semibold text-danger"
          >
            {hata}
          </p>
        )}

        {yukleniyor ? (
          <div className={kartCls}>
            <p className="text-[13px] font-medium text-ink-400">Yükleniyor…</p>
          </div>
        ) : bolum === "sms" ? (
          <SmsKuyrugu kayitlar={smsKuyruk} />
        ) : bolum === "eposta" ? (
          <EpostaKuyrugu kayitlar={kuyruk} />
        ) : bolum === "destek" ? (
          <DestekListesi
            kayitlar={destekKayitlari}
            isleniyor={isleniyor}
            onDurum={destekDurum}
          />
        ) : bolum === "itirazlar" ? (
          <ItirazListesi
            kayitlar={itirazlar}
            isleniyor={isleniyor}
            onAdim={itirazAdimi}
          />
        ) : (
          <AktarimListesi
            kayitlar={aktarimlar}
            isleniyor={isleniyor}
            onSonucla={aktarimSonucla}
          />
        )}
      </section>
    </main>
  );
}

function ItirazListesi({
  kayitlar,
  isleniyor,
  onAdim,
}: {
  kayitlar: ItirazKaydi[];
  isleniyor: string;
  onAdim: (sunumId: string, govde: Record<string, unknown>) => Promise<void>;
}) {
  if (!kayitlar.length)
    return (
      <div className={kartCls}>
        <p className="text-[13px] font-medium text-ink-400">Açık itiraz yok.</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {kayitlar.map((i) => {
        const bilgi = ADIM_BILGI[i.adim];
        const bizde = bilgi.destekte;
        const kilit = isleniyor === i.sunumId;
        return (
          <div key={i.sunumId} className={kartCls}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/ilan/${encodeURIComponent(i.talepId)}`}
                  className="text-[14.5px] font-extrabold text-ink-900 hover:text-primary"
                >
                  {i.ilanBaslik}
                </Link>
                <div className="mt-1 text-[12px] font-medium text-ink-400">
                  Alıcı <b className="text-ink-700">{i.alici}</b> · Satıcı{" "}
                  <b className="text-ink-700">{i.satici}</b> ·{" "}
                  {fiyatText(i.tutar)}
                </div>
                <div className="mt-0.5 text-[11.5px] font-medium text-ink-300">
                  İtiraz: {zamanMetni(i.itirazZamani)}
                </div>
              </div>
              <span
                className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                  bizde
                    ? "bg-danger-soft text-danger"
                    : "bg-primary-soft text-primary-hover"
                }`}
              >
                {bilgi.etiket}
              </span>
            </div>

            {i.karsiItiraz && (
              <p className="mt-3 rounded-[10px] bg-page px-3 py-2.5 text-[12.5px] font-medium leading-[1.55] text-ink-700">
                <b className="text-ink-900">Satıcının karşı itirazı:</b>{" "}
                {i.karsiItiraz}
              </p>
            )}

            {i.iadeKargo && (
              <p className="mt-2 text-[11.5px] font-medium text-ink-400">
                İade kargosu: {i.iadeKargo.firma} · Takip {i.iadeKargo.takipNo}
              </p>
            )}

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {i.adim === "inceleme" && (
                <>
                  <button
                    type="button"
                    disabled={kilit}
                    onClick={() =>
                      void onAdim(i.sunumId, {
                        adim: "karar",
                        karar: "alici-hakli",
                      })
                    }
                    className={`${dugmeCls} bg-danger text-white hover:opacity-90`}
                  >
                    Alıcı haklı — ürün iade edilsin
                  </button>
                  <button
                    type="button"
                    disabled={kilit}
                    onClick={() =>
                      void onAdim(i.sunumId, {
                        adim: "karar",
                        karar: "satici-hakli",
                      })
                    }
                    className={`${dugmeCls} bg-ink-900 text-white hover:opacity-90`}
                  >
                    Satıcı haklı — itiraz reddedilsin
                  </button>
                </>
              )}

              {i.adim === "karsi-itiraz" && (
                <>
                  <button
                    type="button"
                    disabled={kilit}
                    onClick={() =>
                      void onAdim(i.sunumId, {
                        adim: "ikinci-karar",
                        karar: "iade",
                      })
                    }
                    className={`${dugmeCls} bg-danger text-white hover:opacity-90`}
                  >
                    Karşı itiraz reddedilsin — para iade
                  </button>
                  <button
                    type="button"
                    disabled={kilit}
                    onClick={() =>
                      void onAdim(i.sunumId, {
                        adim: "ikinci-karar",
                        karar: "ret",
                      })
                    }
                    className={`${dugmeCls} bg-ink-900 text-white hover:opacity-90`}
                  >
                    Satıcı haklı — süreç kapansın
                  </button>
                </>
              )}

              {i.adim === "para-iadesi-bekleniyor" && (
                <button
                  type="button"
                  disabled={kilit}
                  onClick={() => void onAdim(i.sunumId, { adim: "odeme" })}
                  className={`${dugmeCls} bg-accent text-ink-900 hover:opacity-90`}
                >
                  Para iadesini işle ({fiyatText(i.tutar)})
                </button>
              )}

              {!bizde && (
                <span className="text-[12px] font-semibold text-ink-400">
                  Sıra {bilgi.sirada}.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Destek kayıtları kuyruğu.
 *
 * Ekler kullanıcının yüklediği ekran görüntüleridir; yeni sekmede açılır.
 * Ek yüklemenin bir anlamı olması için bu listenin var olması ŞART:
 * form eki alıp kimsenin göremediği bir yere koymak, sahte "ek" düğmesinin
 * daha pahalı bir biçimi olurdu.
 */
function DestekListesi({
  kayitlar,
  isleniyor,
  onDurum,
}: {
  kayitlar: DestekKaydi[];
  isleniyor: string;
  onDurum: (no: string, durum: DestekKaydi["durum"]) => Promise<void>;
}) {
  if (!kayitlar.length)
    return (
      <div className={kartCls}>
        <p className="text-[13px] font-medium text-ink-400">
          Açık destek kaydı yok.
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {kayitlar.map((k) => {
        const kilit = isleniyor === k.no;
        return (
          <div key={k.no} className={kartCls}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-extrabold text-primary-hover">
                    {k.no}
                  </span>
                  <span className="text-[11px] font-semibold text-ink-300">
                    {k.konu}
                  </span>
                  <span className="text-[11px] font-medium text-ink-400">
                    {k.acan} · {zamanMetni(k.zaman)}
                  </span>
                </div>
                <div className="mt-1 text-[14px] font-bold text-ink-900">
                  {k.baslik}
                </div>
                <p className="mt-1 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-ink-700">
                  {k.aciklama}
                </p>
                <div className="mt-1.5 text-[11.5px] font-medium text-ink-400">
                  Referans: <span className="font-mono">{k.refNo}</span>
                </div>
                {k.ekler && k.ekler.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {k.ekler.map((yol, i) => (
                      <a
                        key={yol}
                        href={yol}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-primary-soft px-2.5 py-1.5 text-[11px] font-bold text-primary-hover hover:underline"
                      >
                        ek {i + 1} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span
                className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                  k.durum === "İncelemede"
                    ? "bg-danger-soft text-danger"
                    : k.durum === "Yanıtlandı"
                      ? "bg-accent text-accent-ink"
                      : "bg-page text-ink-500"
                }`}
              >
                {k.durum}
              </span>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {k.durum !== "Yanıtlandı" && (
                <button
                  type="button"
                  disabled={kilit}
                  onClick={() => void onDurum(k.no, "Yanıtlandı")}
                  className={`${dugmeCls} bg-accent text-ink-900 hover:opacity-90`}
                >
                  Yanıtlandı olarak işaretle
                </button>
              )}
              {k.durum !== "Kapandı" && (
                <button
                  type="button"
                  disabled={kilit}
                  onClick={() => void onDurum(k.no, "Kapandı")}
                  className={`${dugmeCls} bg-ink-900 text-white hover:opacity-90`}
                >
                  Kapat
                </button>
              )}
              {k.durum !== "İncelemede" && (
                <button
                  type="button"
                  disabled={kilit}
                  onClick={() => void onDurum(k.no, "İncelemede")}
                  className={`${dugmeCls} border-[1.5px] border-border-input bg-card text-ink-500 hover:border-primary hover:text-primary`}
                >
                  Yeniden incelemeye al
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * SMS kuyruğu — gönderilmeyi bekleyen doğrulama kodları.
 *
 * Sağlayıcı bağlanana kadar kodlar burada bekliyor; destek ekibi kullanıcıya
 * buradan iletir. Kuyruğu görünür kılmak şart, yoksa telefon doğrulama
 * "var ama hiç çalışmayan" bir özellik olurdu.
 */
function SmsKuyrugu({ kayitlar }: { kayitlar: SmsIsi[] }) {
  if (!kayitlar.length)
    return (
      <div className={kartCls}>
        <p className="text-[13px] font-medium text-ink-400">
          Kuyrukta mesaj yok.
        </p>
      </div>
    );

  const sayi = (d: SmsIsi["durum"]) =>
    kayitlar.filter((k) => k.durum === d).length;

  return (
    <div className="flex flex-col gap-3">
      <div className={`${kartCls} flex flex-wrap gap-5`}>
        {(
          [
            ["Toplam", kayitlar.length],
            ["Kuyrukta", sayi("kuyrukta")],
            ["Gönderildi", sayi("gonderildi")],
            ["Hata", sayi("hata")],
          ] as const
        ).map(([ad, n]) => (
          <div key={ad}>
            <div className="text-[22px] font-extrabold leading-none text-ink-900">
              {n}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.8px] text-ink-400">
              {ad}
            </div>
          </div>
        ))}
      </div>

      {kayitlar.map((k) => (
        <div key={k.id} className={kartCls}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[12.5px] font-bold text-ink-900">
                {k.kime}
              </div>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink-700">
                {k.metin}
              </p>
              <div className="mt-1 text-[11.5px] font-medium text-ink-300">
                {zamanMetni(k.zaman)}
              </div>
            </div>
            <span
              className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                k.durum === "kuyrukta"
                  ? "bg-danger-soft text-danger"
                  : k.durum === "gonderildi"
                    ? "bg-accent text-accent-ink"
                    : "bg-page text-ink-500"
              }`}
            >
              {k.durum === "kuyrukta"
                ? "Kuyrukta"
                : k.durum === "gonderildi"
                  ? "Gönderildi"
                  : "Hata"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EpostaKuyrugu({ kayitlar }: { kayitlar: EpostaIsi[] }) {
  if (!kayitlar.length)
    return (
      <div className={kartCls}>
        <p className="text-[13px] font-medium text-ink-400">
          Kuyrukta posta yok.
        </p>
      </div>
    );

  const sayi = (d: EpostaIsi["durum"]) =>
    kayitlar.filter((k) => k.durum === d).length;

  return (
    <div className="flex flex-col gap-3">
      <div className={`${kartCls} flex flex-wrap gap-5`}>
        {(
          [
            ["Toplam", kayitlar.length],
            ["Kuyrukta", sayi("kuyrukta")],
            ["Gönderildi", sayi("gonderildi")],
            ["Hata", sayi("hata")],
          ] as const
        ).map(([ad, n]) => (
          <div key={ad}>
            <div className="text-[22px] font-extrabold leading-none text-ink-900">
              {n}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.8px] text-ink-400">
              {ad}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[12px] font-medium leading-[1.5] text-ink-400">
        Gerçek gönderim servisi bağlanana kadar postalar burada birikir (bkz.
        lib/eposta.ts). Kuyruk 500 kayıtta en eskiden başlayarak kırpılır — bu
        sessiz bir veri kaybıdır, sayıyı takip edin.
      </p>

      {kayitlar.slice(0, 50).map((k) => (
        <div key={k.id} className={kartCls}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-extrabold text-ink-900">
                {k.konu}
              </div>
              <div className="mt-1 text-[12px] font-medium text-ink-400">
                {k.kime} · {zamanMetni(k.zaman)}
              </div>
            </div>
            <span
              className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                k.durum === "gonderildi"
                  ? "bg-accent text-accent-ink"
                  : k.durum === "hata"
                    ? "bg-danger-soft text-danger"
                    : "bg-primary-soft text-primary-hover"
              }`}
            >
              {k.durum === "gonderildi"
                ? "Gönderildi"
                : k.durum === "hata"
                  ? "Hata"
                  : "Kuyrukta"}
            </span>
          </div>
          <pre className="mt-2.5 max-h-[140px] overflow-auto whitespace-pre-wrap break-words rounded-[10px] bg-page px-3 py-2.5 text-[11.5px] font-medium leading-[1.5] text-ink-700">
            {k.govde}
          </pre>
        </div>
      ))}

      {kayitlar.length > 50 && (
        <p className="text-[12px] font-semibold text-ink-400">
          İlk 50 kayıt gösteriliyor (toplam {kayitlar.length}).
        </p>
      )}
    </div>
  );
}

function AktarimListesi({
  kayitlar,
  isleniyor,
  onSonucla,
}: {
  kayitlar: AktarimTalebi[];
  isleniyor: string;
  onSonucla: (id: string, durum: "tamamlandi" | "reddedildi") => Promise<void>;
}) {
  if (!kayitlar.length)
    return (
      <div className={kartCls}>
        <p className="text-[13px] font-medium text-ink-400">
          Aktarım talebi yok.
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {kayitlar.map((a) => {
        const bekliyor = a.durum === "islemde";
        const kilit = isleniyor === a.id;
        return (
          <div key={a.id} className={kartCls}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-ink-900">
                  {fiyatText(a.tutar)}
                </div>
                <div className="mt-1 text-[12px] font-medium text-ink-400">
                  <b className="text-ink-700">{a.kullanici}</b> ·{" "}
                  <span className="font-mono">{a.ibanMaske || "IBAN yok"}</span>
                </div>
                <div className="mt-0.5 text-[11.5px] font-medium text-ink-300">
                  Talep: {zamanMetni(a.zaman)}
                  {a.sonucZamani
                    ? ` · Sonuç: ${zamanMetni(a.sonucZamani)}`
                    : ""}
                </div>
                {a.not && (
                  <div className="mt-1 text-[11.5px] font-semibold text-danger">
                    Gerekçe: {a.not}
                  </div>
                )}
              </div>
              <span
                className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold ${
                  a.durum === "islemde"
                    ? "bg-danger-soft text-danger"
                    : a.durum === "tamamlandi"
                      ? "bg-accent text-accent-ink"
                      : "bg-page text-ink-500"
                }`}
              >
                {a.durum === "islemde"
                  ? "İşlemde"
                  : a.durum === "tamamlandi"
                    ? "Tamamlandı"
                    : "Reddedildi"}
              </span>
            </div>

            {bekliyor && (
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={kilit}
                  onClick={() => void onSonucla(a.id, "tamamlandi")}
                  className={`${dugmeCls} bg-accent text-ink-900 hover:opacity-90`}
                >
                  Havale yapıldı — tamamla
                </button>
                <button
                  type="button"
                  disabled={kilit}
                  onClick={() => void onSonucla(a.id, "reddedildi")}
                  className={`${dugmeCls} bg-ink-900 text-white hover:opacity-90`}
                >
                  Reddet
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
