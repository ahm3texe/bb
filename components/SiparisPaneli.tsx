"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  anlasmaDurumu,
  iadeAdimi,
  aliciOnaySonTarih,
  iadeKargoSonTarih,
  iadeKargoSuresiDoldu,
  kargoSonTarih,
  odemeSonTarih,
  takipAdresi,
  takipNumarasiOtomatikMi,
  KARGO_FIRMALARI,
} from "@/lib/anlasma";
import type { Anlasma, IadeAdim } from "@/lib/anlasma";
import { YORUM_SINIR } from "@/lib/degerlendirme";
import { fiyatText } from "@/lib/data";

/**
 * Anlaşma sonrası sipariş şeridi — sohbetin altında durur.
 *
 * Aynı sipariş iki tarafta farklı okunur: ödemeyi alıcı yapar, kargoyu
 * satıcı verir. Bu yüzden her adım rol ayrımıyla yazılmıştır; karşı
 * tarafın işi olan adımda kullanıcı bilgilendirilir, buton gösterilmez.
 */
/**
 * Sipariş kodu kutusu — kargo şubesinde ADRES YERİNE söylenen numara.
 *
 * Burada `TeslimatKutusu` vardı: ödeme alınır alınmaz alıcının tam adresi
 * (kapı numarası, kat, daire, zil tarifi) satıcının ekranına düşüyor ve
 * "Kopyala" düğmesiyle panoya alınabiliyordu. Kaldırıldı — gönderenin
 * adresi bilmesi gerekmiyor; adresi kargo firması bilir ve onu sunucudan
 * alır (bkz. lib/kargo-gonderi.ts).
 *
 * Kod hiçbir adres bilgisi taşımaz: ele geçmesi adresi açığa çıkarmaz.
 */
function SiparisKoduKutusu({
  kod,
  aciklama,
}: {
  kod?: string;
  aciklama: string;
}) {
  const [kopyalandi, setKopyalandi] = useState(false);
  if (!kod) return null;

  return (
    <div className="mt-3 rounded-card border-[1.5px] border-primary/30 bg-primary-soft/40 px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-primary">
          Sipariş kodu
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(kod);
            setKopyalandi(true);
            setTimeout(() => setKopyalandi(false), 2000);
          }}
          className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-bold text-primary hover:bg-primary-soft"
        >
          {kopyalandi ? "Kopyalandı ✓" : "Kopyala"}
        </button>
      </div>
      <div className="mt-1 font-mono text-[20px] font-extrabold tracking-[0.08em] text-ink-900">
        {kod}
      </div>
      <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink-500">
        {aciklama}
      </p>
    </div>
  );
}

/**
 * Alışveriş bitince açılan değerlendirme kutusu. İki taraf da birbirine
 * yıldız verir ve tek cümlelik izlenim yazar; kayıt karşı tarafın
 * profilinde herkese açık görünür.
 */
function DegerlendirmeKutusu({
  sunumId,
  karsiTaraf,
}: {
  sunumId: string;
  karsiTaraf: string;
}) {
  const [puan, setPuan] = useState(0);
  const [uzeri, setUzeri] = useState(0);
  const [yorum, setYorum] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [hata, setHata] = useState("");

  // Daha önce değerlendirme yapıldıysa form yerine teşekkür gösterilir.
  useEffect(() => {
    let iptal = false;
    fetch(`/api/degerlendirmeler?sunum=${encodeURIComponent(sunumId)}`)
      .then((r) => (r.ok ? r.json() : { degerlendirmeler: [] }))
      .then((v: { degerlendirmeler?: { yazan: string }[] }) => {
        if (iptal) return;
        // Kendi yazdığımı ayırt etmek için sunucudaki listeyi kullanıyoruz;
        // karşı tarafın yazması formu kapatmaz.
        const benimki = (v.degerlendirmeler ?? []).some(
          (d) => d.yazan !== karsiTaraf,
        );
        if (benimki) setBitti(true);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [sunumId, karsiTaraf]);

  async function gonder() {
    if (!puan || gonderiliyor) return;
    setGonderiliyor(true);
    setHata("");
    try {
      const r = await fetch("/api/degerlendirmeler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sunumId, puan, yorum }),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.hata ?? "Değerlendirme gönderilemedi.");
      setBitti(true);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Değerlendirme gönderilemedi.");
    } finally {
      setGonderiliyor(false);
    }
  }

  if (bitti)
    return (
      <div className="mt-3 rounded-card border border-hairline bg-card px-3.5 py-3 text-[13px] font-semibold text-ink-700">
        Değerlendirmen kaydedildi ✓ — {karsiTaraf} kullanıcısının profilinde
        görünüyor.
      </div>
    );

  return (
    <div className="mt-3 rounded-card border-[1.5px] border-primary/30 bg-card px-3.5 py-3">
      <div className="text-[13.5px] font-extrabold text-ink-900">
        {karsiTaraf} kullanıcısını değerlendir
      </div>
      <p className="mt-0.5 text-[12.5px] font-medium text-ink-500">
        Puanın ve yorumun profilinde herkese açık görünür.
      </p>

      <div className="mt-2.5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((y) => (
          <button
            key={y}
            type="button"
            aria-label={`${y} yıldız`}
            onClick={() => setPuan(y)}
            onMouseEnter={() => setUzeri(y)}
            onMouseLeave={() => setUzeri(0)}
            className={`cursor-pointer text-[24px] leading-none transition-colors ${
              (uzeri || puan) >= y ? "text-star" : "text-border-input"
            }`}
          >
            ★
          </button>
        ))}
        {puan > 0 && (
          <span className="ml-1.5 text-[13px] font-bold text-ink-700">
            {puan}/5
          </span>
        )}
      </div>

      <div className="mt-2.5">
        {/* Tek satırlık input, 300 karakterde yazılanın yalnızca sonunu
            gösterirdi; birkaç cümle yazılabilen bir alan çok satır ister. */}
        <textarea
          value={yorum}
          onChange={(e) => setYorum(e.target.value.slice(0, YORUM_SINIR))}
          maxLength={YORUM_SINIR}
          rows={3}
          placeholder="Alışveriş nasıl geçti?"
          className="w-full box-border resize-y rounded-[11px] border-[1.5px] border-border-input px-3 py-2.5 text-[13.5px] font-medium leading-relaxed text-ink-900 outline-none focus:border-primary"
        />
        <div className="mt-1 text-right text-[11.5px] font-semibold text-ink-400">
          {yorum.length}/{YORUM_SINIR}
        </div>
      </div>

      <button
        type="button"
        disabled={!puan || gonderiliyor}
        onClick={() => void gonder()}
        className="mt-1.5 w-full cursor-pointer rounded-control bg-primary px-4 py-2.5 text-[13.5px] font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {gonderiliyor ? "Gönderiliyor…" : "Değerlendirmeyi gönder"}
      </button>
      {hata && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-bold text-acil">
          {hata}
        </p>
      )}
    </div>
  );
}

/** Sorun bildirilmiş sipariş — destek kaydı açıldıysa numarasıyla gösterir. */
function SorunluPanel({
  anlasma,
  alici,
}: {
  anlasma: Anlasma;
  alici: boolean;
}) {
  const [kayit, setKayit] = useState<{ no: string } | null>(null);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    let iptal = false;
    fetch(`/api/destek?siparis=${encodeURIComponent(anlasma.sunumId)}`)
      .then((r) => (r.ok ? r.json() : { kayitlar: [] }))
      .then((v: { kayitlar?: { no: string }[] }) => {
        if (iptal) return;
        setKayit(v.kayitlar?.[0] ?? null);
        setYuklendi(true);
      })
      .catch(() => {
        if (!iptal) setYuklendi(true);
      });
    return () => {
      iptal = true;
    };
  }, [anlasma.sunumId]);

  const acildi = !!kayit;
  const adim = iadeAdimi(anlasma);
  const bitti = adim === "tamamlandi" || adim === "satici-hakli";

  // Süreç kapandıysa kutu artık uyarı değil, kapanış bildirimidir.
  if (bitti)
    return (
      <div className="border-t border-hairline bg-card px-4 py-3.5">
        <div className="text-[14.5px] font-extrabold leading-snug text-ink-900">
          İtiraz süreci sonlandı ✓
        </div>
        <div className="mt-1 text-[13px] font-medium leading-snug text-ink-700">
          {adim === "tamamlandi"
            ? alici
              ? `Ürün satıcıya ulaştı ve ${fiyatText(anlasma.tutar)} hesabına iade edildi.`
              : `İade ürünü elinize ulaştı; ${fiyatText(anlasma.tutar)} alıcıya iade edildi.`
            : "Destek incelemesi satıcı lehine sonuçlandı; süreç kapandı."}
        </div>
        {/* Süreç bittiyse taraflar birbirini değerlendirebilir. Sorunlu
            biten bir alışverişte bu, iyi giden birinden daha önemlidir. */}
        <DegerlendirmeKutusu
          sunumId={anlasma.sunumId}
          karsiTaraf={alici ? anlasma.satici : anlasma.alici}
        />
      </div>
    );

  const baslik: Partial<Record<IadeAdim, string>> = {
    inceleme: acildi ? `Destek kaydı açıldı — ${kayit!.no}` : "Üründe sorun bildirildi",
    "iade-kargosu-bekleniyor": "İtirazda alıcı haklı bulundu",
    "iade-kargoda": "İade kargoda",
    "satici-onayi-bekleniyor": "İade ürünü satıcıya ulaştı",
    "karsi-itiraz": "Satıcı karşı itiraz açtı",
    "para-iadesi-bekleniyor": "Satıcı iade ürününü onayladı",
    tamamlandi: "İtiraz süreci sonlandı ✓",
    "satici-hakli": "İtiraz süreci sonlandı ✓",
  };

  const aciklama: Partial<Record<IadeAdim, string>> = {
    inceleme: acildi
      ? alici
        ? "Bildirimin destek ekibine iletildi; ödemen inceleme bitene kadar güvencede tutulur."
        : "Alıcı destek kaydı açtı. Destek ekibi kaydı inceleyecek; ödeme inceleme bitene kadar aktarılmaz."
      : alici
        ? "Ödemen güvencede tutuluyor. İncelemenin başlaması için destek kaydını oluştur."
        : "Alıcı ürünü onaylamadı. Destek kaydı açılana kadar inceleme başlamaz; ödeme aktarılmaz.",
    "iade-kargosu-bekleniyor": iadeKargoSuresiDoldu(anlasma)
      ? alici
        ? "İade süresi doldu. Süreç satıcı lehine kapatılıyor ve ödeme satıcıya aktarılıyor."
        : "Alıcı ürünü süresinde göndermedi. Süreç lehine kapatılıyor ve ödeme sana aktarılıyor."
      : alici
        ? "Ürünü 2 gün içinde kargoya ver. “Ürünü iade et” düğmesiyle gönderiyi oluştur; şubede adres değil, sipariş kodunu vereceksin."
        : "Alıcı ürünü 2 gün içinde sana geri gönderecek.",
    "iade-kargoda": alici
      ? "İade kargon yolda. Ürün satıcıya ulaşınca burada görünecek."
      : "Alıcı ürünü geri gönderdi. Ulaştığında kontrol edebileceksin.",
    "satici-onayi-bekleniyor": alici
      ? "Ürün satıcıya ulaştı; satıcının kontrolü bekleniyor."
      : "Ürünü kontrol et: gönderdiğin ürünle aynıysa onayla, değilse karşı itiraz aç.",
    "karsi-itiraz": alici
      ? "Satıcı, iade ürününün gönderdiği ürün olmadığını bildirdi. Destek ekibi kaydı yeniden inceliyor."
      : "Karşı itirazın destek ekibine iletildi; inceleme sonuçlanana kadar para iadesi yapılmaz.",
    "para-iadesi-bekleniyor": alici
      ? "Satıcı iade ürününü onayladı; paran havuzdan iade ediliyor."
      : "Onayın alındı; para alıcıya iade ediliyor.",
    tamamlandi: alici
      ? "Ürün satıcıya ulaştı ve ödemen iade edildi. Süreç kapandı."
      : "İade ürünü sana ulaştı ve ödeme alıcıya iade edildi. Süreç kapandı.",
    // Satıcı lehine kapanış iki yoldan gelebilir: destek öyle karar verdi ya
    // da alıcı ürünü süresinde iade etmedi. İkisinde de ürün alıcıda kalır
    // ve bedelini o öder — yani alışveriş tamamlanmıştır.
    "satici-hakli": anlasma.iade?.kargoSuresiAsildi
      ? alici
        ? "Ürünü süresinde iade etmediğin için süreç satıcı lehine kapandı; ödeme satıcıya aktarıldı."
        : "Alıcı ürünü süresinde göndermedi; süreç lehine kapandı ve ödeme hesabına aktarıldı."
      : alici
        ? "Destek ekibi itirazını yerinde bulmadı; ürün sende kalır ve ödeme satıcıya aktarıldı."
        : "Destek ekibi lehine karar verdi; ödeme hesabına aktarıldı.",
  };

  return (
    <div className="border-t border-hairline bg-danger-soft px-4 py-3.5">
      <div className="text-[14.5px] font-extrabold leading-snug text-danger">
        {baslik[adim]}
      </div>
      <div className="mt-1 text-[13px] font-medium leading-snug text-ink-700">
        {aciklama[adim]}
      </div>

      {alici && yuklendi && !acildi && adim === "inceleme" && (
        <Link
          href={`/destek?konu=teslim&siparis=${encodeURIComponent(anlasma.sunumId)}`}
          className="mt-2 inline-block text-[13px] font-bold text-danger underline underline-offset-2"
        >
          Destek kaydını aç ›
        </Link>
      )}

      {/* Alıcı ürünü geri gönderiyor — 2 günlük süre işler */}
      {adim === "iade-kargosu-bekleniyor" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <Sayac
            sonTarih={iadeKargoSonTarih(anlasma)}
            etiket="İade kargosuna kalan"
            bittiEtiketi="İade süresi aşıldı"
            uyari
          />
        </div>
      )}
      {alici && adim === "iade-kargosu-bekleniyor" && (
        <IadeKargoFormu
          sunumId={anlasma.sunumId}
          siparisKodu={anlasma.siparisKodu}
        />
      )}

      {/* İade kargosu yola çıktıysa iki taraf da takip edebilsin */}
      <TakipSatiri
        firma={anlasma.iade?.kargoFirma}
        takipNo={anlasma.iade?.takipNo}
        beyan={anlasma.iade?.gonderi?.beyan}
      />

      {/* Satıcı iade ürününü kontrol ediyor */}
      {!alici && adim === "satici-onayi-bekleniyor" && (
        <IadeKontrol sunumId={anlasma.sunumId} />
      )}
    </div>
  );
}

/**
 * Alıcının iade akışı: "Ürünü iade et" düğmesi, sonra kargo firması seçimi.
 * Satış tarafındaki gönderi formunun aynadaki hâli.
 *
 * SATICININ ADRESİ ARTIK GÖSTERİLMİYOR. Burada `?yon=iade` ile çekilen bir
 * adres kutusu ve elle doldurulan bir takip numarası alanı vardı. İkisi de
 * gidiş yönünde kapatılan şeyin aynısıydı: gönderenin karşı tarafın kapı
 * numarasını bilmesi gerekmiyor, adresi kargo firması sunucudan alıyor
 * (bkz. lib/kargo-gonderi.ts).
 */
function IadeKargoFormu({
  sunumId,
  siparisKodu,
}: {
  sunumId: string;
  siparisKodu?: string;
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [firma, setFirma] = useState("");
  const [takipNo, setTakipNo] = useState("");
  const [isliyor, setIsliyor] = useState(false);
  const [hata, setHata] = useState("");

  if (!acik)
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="mt-3 cursor-pointer rounded-control bg-danger px-4 py-2.5 text-[13px] font-bold text-white hover:brightness-95"
      >
        Ürünü iade et
      </button>
    );

  return (
    <div className="mt-3 rounded-card border-[1.5px] border-danger/30 bg-card px-3.5 py-3">
      <div className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-danger">
        İade gönderisi
      </div>
      <SiparisKoduKutusu
        kod={siparisKodu}
        aciklama="Ürünü kargo şubesine götür ve bu kodu ver. Görevli iade adresini kendi sisteminde görecek; adres sende olmayacak."
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          aria-label="İade kargo firması"
          value={firma}
          onChange={(e) => setFirma(e.target.value)}
          className="min-w-[150px] flex-1 cursor-pointer rounded-[11px] border-[1.5px] border-border-input bg-card px-3 py-2.5 text-[13px] font-medium text-ink-900 outline-none focus:border-primary"
        >
          <option value="">Kargo firması</option>
          {KARGO_FIRMALARI.map((k) => (
            <option key={k.ad} value={k.ad}>
              {k.ad}
            </option>
          ))}
        </select>
        <input
          aria-label="İade kargo takip numarası"
          value={takipNo}
          onChange={(e) => setTakipNo(e.target.value.slice(0, 40))}
          placeholder="Takip numarası"
          className="min-w-[150px] flex-1 rounded-[11px] border-[1.5px] border-border-input px-3 py-2.5 text-[13px] font-medium text-ink-900 outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={!firma || takipNo.length < 6 || isliyor}
          onClick={() => {
            setIsliyor(true);
            setHata("");
            void fetch(`/api/anlasmalar/${encodeURIComponent(sunumId)}/iade`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ adim: "kargo", firma, takipNo }),
            })
              .then(async (r) => {
                if (!r.ok) {
                  const v = await r.json().catch(() => ({}));
                  throw new Error(v.hata ?? "Gönderi oluşturulamadı.");
                }
                router.refresh();
              })
              .catch((e) =>
                setHata(
                  e instanceof Error ? e.message : "Gönderi oluşturulamadı.",
                ),
              )
              .finally(() => setIsliyor(false));
          }}
          className="cursor-pointer rounded-control bg-danger px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {isliyor ? "Oluşturuluyor…" : "İade gönderisi oluştur"}
        </button>
      </div>
      {hata && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-bold text-acil">
          {hata}
        </p>
      )}
    </div>
  );
}

/**
 * Satıcının iade ürününü kontrol adımı: gönderdiği ürünse onaylar, değilse
 * karşı itiraz açar. Alıcının "ürün anlatıldığı gibi mi?" adımının aynası.
 */
function IadeKontrol({ sunumId }: { sunumId: string }) {
  const router = useRouter();
  const [isliyor, setIsliyor] = useState(false);
  const [itirazAcik, setItirazAcik] = useState(false);
  const [aciklama, setAciklama] = useState("");
  const [hata, setHata] = useState("");

  function gonder(onay: "evet" | "hayir") {
    setIsliyor(true);
    setHata("");
    void fetch(`/api/anlasmalar/${encodeURIComponent(sunumId)}/iade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adim: "satici-onay", onay, aciklama }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const v = await r.json().catch(() => ({}));
          throw new Error(v.hata ?? "Kaydedilemedi.");
        }
        router.refresh();
      })
      .catch((e) => setHata(e instanceof Error ? e.message : "Kaydedilemedi."))
      .finally(() => setIsliyor(false));
  }

  return (
    <div className="mt-3">
      {itirazAcik ? (
        <div className="rounded-card border-[1.5px] border-danger/30 bg-card px-3.5 py-3">
          <div className="text-[13.5px] font-extrabold text-ink-900">
            Karşı itiraz
          </div>
          <input
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value.slice(0, 300))}
            placeholder="Ürünün neden gönderdiğin ürün olmadığını yaz"
            className="mt-2 w-full box-border rounded-[11px] border-[1.5px] border-border-input px-3 py-2.5 text-[13px] font-medium text-ink-900 outline-none focus:border-primary"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isliyor || aciklama.trim().length < 10}
              onClick={() => gonder("hayir")}
              className="cursor-pointer rounded-control bg-acil px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {isliyor ? "Gönderiliyor…" : "Karşı itirazı gönder"}
            </button>
            <button
              type="button"
              onClick={() => setItirazAcik(false)}
              className="cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-4 py-2.5 text-[13px] font-bold text-ink-900"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isliyor}
            onClick={() => gonder("evet")}
            className="cursor-pointer rounded-control bg-accent px-4 py-2.5 text-[13px] font-bold text-ink-900 disabled:opacity-50"
          >
            Ürün teslim ettiğim gibi
          </button>
          <button
            type="button"
            onClick={() => setItirazAcik(true)}
            className="cursor-pointer rounded-control bg-acil px-4 py-2.5 text-[13px] font-bold text-white"
          >
            Hayır, sorun var
          </button>
        </div>
      )}
      {hata && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-bold text-acil">
          {hata}
        </p>
      )}
    </div>
  );
}

export function SiparisPaneli({
  anlasma,
  rol,
  onKargo,
  onOnay,
}: {
  anlasma: Anlasma;
  rol: "buyer" | "seller";
  onKargo: (firma: string, takipNo: string) => Promise<string | undefined>;
  /** Alıcının "ürünü teslim aldım" onayı — onay sorusundan önceki adım. */
  /** Teslim sonrası alıcının yanıtı. */
  onOnay: (onay: "evet" | "hayir") => Promise<void>;
}) {
  const durum = anlasmaDurumu(anlasma);
  const alici = rol === "buyer";

  if (durum === "odeme-bekleniyor")
    return (
      <div className="border-t border-hairline bg-primary-soft px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14.5px] font-extrabold leading-snug text-primary-hover">
              Anlaşma tamam ✓ — {fiyatText(anlasma.tutar)}
            </div>
            <div className="mt-1 text-[13px] font-medium leading-snug text-primary-hover/80">
              {alici
                ? `Ödemeni 1 saat içinde tamamla; satıcının ${anlasma.kargoSaat} saatlik kargo süresi ödemenden sonra başlar.`
                : "Ödeme bekleniyor — alıcı 1 saat içinde ödemezse anlaşma iptal olur."}
            </div>
          </div>
          <div className="flex flex-none items-center gap-2.5">
            {/* Kabul, ürünü diğer adaylara kapatıyor; süre iki tarafa da
                görünsün ki bekleyiş belirsiz kalmasın. */}
            <Sayac
              sonTarih={odemeSonTarih(anlasma)}
              etiket="Ödemeye kalan"
              bittiEtiketi="Süre doldu"
              uyari
            />
            {alici ? (
              // Ödeme sohbette değil, kendi akışında yapılır: sayaç ancak
              // adımlar tamamlanıp ödeme doğrulandığında başlar.
              <Link
                href={`/odeme/${encodeURIComponent(anlasma.sunumId)}`}
                className="rounded-control bg-primary px-[18px] py-3 text-[14px] font-bold text-white hover:bg-primary-hover"
              >
                Ödemeye Geç ›
              </Link>
            ) : (
              <span className="rounded-control bg-card px-[18px] py-3 text-[14px] font-bold text-primary-hover">
                Ödeme bekleniyor
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-[12.5px] font-medium leading-snug text-primary-hover/70">
          Süre dolarsa anlaşma iptal edilir ve talep diğer satıcılara
          yeniden açılır.
        </p>
      </div>
    );

  if (durum === "kargo-bekleniyor")
    return (
      <div className="border-t border-hairline bg-card px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14.5px] font-extrabold leading-snug text-ink-900">
              Ödeme alındı ✓ — {alici ? "kargo bekleniyor" : "kargoya verme süren işliyor"}
            </div>
            <div className="mt-1 text-[13px] font-medium leading-snug text-ink-500">
              {alici
                ? `Satıcı sunumunda ${anlasma.kargoSaat} saat içinde kargoya vermeyi vaat etti.`
                : "Kargo firmasını seç; gönderiyi sistem oluşturur. Şubede adres değil, sipariş kodunu vereceksin."}
            </div>
          </div>
          <Sayac sonTarih={kargoSonTarih(anlasma)} />
        </div>
        {/* ADRES ARTIK KİMSEYE GÖSTERİLMİYOR. Satıcı sipariş kodunu görür,
            alıcı ürünün nereye geleceğini kendi adres kaydından bilir. */}
        {!alici && (
          <>
            <SiparisKoduKutusu
              kod={anlasma.siparisKodu}
              aciklama="Ürünü kargo şubesine götür ve bu kodu ver. Görevli teslimat adresini kendi sisteminde görecek; adres sende olmayacak."
            />
            <KargoFormu onKargo={onKargo} sabitFirma={anlasma.kargoFirma} />
          </>
        )}
      </div>
    );

  // Alışveriş bitti: alıcı ürünü onayladı.
  if (durum === "tamamlandi")
    return (
      <div className="border-t border-hairline bg-accent-soft px-4 py-3.5">
        <div className="text-[14.5px] font-extrabold leading-snug text-ink-900">
          Alışveriş tamamlandı ✓
        </div>
        <div className="mt-1 text-[13px] font-medium leading-snug text-ink-700">
          {alici
            ? `Ürünü onayladın; ${fiyatText(anlasma.tutar)} satıcıya aktarılıyor. İyi günlerde kullan.`
            : `Alıcı ürünü onayladı; ${fiyatText(anlasma.tutar)} hesabına aktarılmak üzere işleme alındı.`}
        </div>
        <DegerlendirmeKutusu
          sunumId={anlasma.sunumId}
          karsiTaraf={alici ? anlasma.satici : anlasma.alici}
        />
      </div>
    );

  // Alıcı üründe sorun bildirdi. Kayıt henüz açılmadıysa "açıldı" denmez —
  // metin, destek kaydının gerçekten oluşturulup oluşturulmadığına bakar.
  if (durum === "sorunlu")
    return <SorunluPanel anlasma={anlasma} alici={alici} />;

  // Teslim edildi: sıra alıcıda ve TEK adım var — "ürün anlatıldığı gibi
  // mi?".
  //
  // Araya bir de "ürünü teslim aldın mı?" adımı giriyordu. Kaldırıldı:
  // teslim bilgisi kargo firmasından geliyor, aynı olayı bir de alıcıya
  // doğrulatmak akışa hiçbir şey katmıyordu. Dahası kötüye kullanılabilir
  // bir kapıydı — ürünü almış alıcı "almadım" diyerek süreci ve satıcının
  // parasını 24 saat bekletebiliyordu.
  //
  // Kargo firmasının bildiriminden itibaren 24 saatlik sayaç işler; süre
  // dolarsa alışveriş otomatik onaylanır (bkz. lib/depo.ts → otomatikOnaylar).
  if (durum === "teslim-edildi") {
    const sonTarih = aliciOnaySonTarih(anlasma);

    return (
      <div className="border-t border-hairline bg-card px-4 py-3.5">
        <div className="text-[14.5px] font-extrabold leading-snug text-ink-900">
          Kargo teslim edildi ✓
        </div>

        {alici ? (
          <>
            <div className="mt-1 text-[14px] font-bold leading-snug text-ink-900">
              Ürün size anlatıldığı gibi mi?
            </div>
            <div className="mt-1 text-[12.5px] font-medium leading-snug text-ink-500">
              Onaylarsan alışveriş tamamlanır ve ödeme satıcıya aktarılır.
            </div>
            <div className="mt-2.5">
              <Sayac
                sonTarih={sonTarih}
                etiket="Yanıt için kalan"
                bittiEtiketi="Süre doldu"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onOnay("evet")}
                className="cursor-pointer rounded-control bg-accent px-5 py-3 text-[14px] font-bold text-ink-900 hover:brightness-95"
              >
                Evet, anlatıldığı gibi
              </button>
              <button
                type="button"
                onClick={() => void onOnay("hayir")}
                className="cursor-pointer rounded-control bg-acil px-5 py-3 text-[14px] font-bold text-white hover:brightness-95"
              >
                Hayır, sorun var
              </button>
            </div>
            <p className="mt-2.5 text-[11.5px] font-medium leading-relaxed text-ink-400">
              24 saat içinde yanıt vermezsen alışveriş otomatik onaylanır ve
              ödeme satıcıya aktarılır.
            </p>
          </>
        ) : (
          <>
            <div className="mt-1 text-[13px] font-semibold leading-snug text-primary">
              Alıcının ürünü incelemesi bekleniyor.
            </div>
            <div className="mt-2.5">
              <Sayac
                sonTarih={sonTarih}
                etiket="Alıcının yanıtı için kalan"
                bittiEtiketi="Süre doldu"
              />
            </div>
            <p className="mt-2 text-[11.5px] font-medium leading-relaxed text-ink-400">
              Süre dolarsa alışveriş otomatik onaylanır ve ödeme hesabına
              aktarılır.
            </p>
          </>
        )}
      </div>
    );
  }

  // Kargoda — takip bilgisi iki tarafa da açık.
  const firma = anlasma.kargoFirma ?? "";
  const adres = takipAdresi(firma, anlasma.takipNo ?? "");
  // Bazı firmalar numarayı adresten kabul etmiyor; o durumda kullanıcıyı
  // takip sayfasına götürüp numarayı kendisinin yapıştıracağını söylüyoruz.
  const otomatik = takipNumarasiOtomatikMi(firma);
  return (
    <div className="border-t border-hairline bg-accent-soft px-4 py-3.5">
      <div className="text-[14.5px] font-extrabold leading-snug text-ink-900">
        Kargoya verildi ✓
      </div>
      <TakipSatiri
        firma={anlasma.kargoFirma}
        takipNo={anlasma.takipNo}
        beyan={anlasma.gonderi?.beyan}
      />
      <div className="mt-1.5 text-[12.5px] font-medium leading-snug text-ink-500">
        {!alici
          ? "Takip bilgisi alıcıya iletildi."
          : !adres
            ? "Takip numarasını kargo firmasının sitesinde sorgulayabilirsin."
            : otomatik
              ? "Numaraya tıklayarak kargonu takip edebilirsin."
              : `Numaraya tıkladığında ${firma} takip sayfası açılır; numarayı oraya yapıştır.`}
      </div>
    </div>
  );
}

/**
 * Takip numarası satırı — tıklanınca firmanın takip sayfası açılır.
 *
 * İade yönünde bu bilgi düz metindi (`Aras Kargo · 12345`): alıcı iade
 * kargosunu takip etmek için numarayı elle kopyalayıp firmanın sitesini
 * kendi bulmak zorundaydı, oysa gidiş yönünde bağlantı zaten vardı. Aynı
 * bilgi iki yönde iki farklı şekilde sunuluyordu.
 */
function TakipSatiri({
  firma,
  takipNo,
  beyan,
}: {
  firma?: string;
  takipNo?: string;
  /** Numara firmadan değil gönderenin beyanından geldiyse söylenir. */
  beyan?: boolean;
}) {
  if (!firma || !takipNo) return null;
  const adres = takipAdresi(firma, takipNo);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5">
      <div className="text-[13px] font-medium">
        <span className="text-ink-500">Kargo firması: </span>
        <span className="font-bold text-ink-900">{firma}</span>
      </div>
      <div className="text-[13px] font-medium">
        <span className="text-ink-500">Takip no: </span>
        {adres ? (
          <a
            href={adres}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary-hover underline underline-offset-2"
          >
            {takipNo}
          </a>
        ) : (
          <span className="font-bold text-ink-900">{takipNo}</span>
        )}
      </div>
      {beyan && (
        <span className="text-[12px] font-medium text-ink-500">
          Numara gönderenin beyanı — firmadan doğrulanmadı.
        </span>
      )}
    </div>
  );
}

/** Kalan süre — saniyede bir yenilenir, süre dolunca gecikmeyi gösterir. */
function Sayac({
  sonTarih,
  etiket = "Kargoya kalan",
  bittiEtiketi = "Süre aşıldı",
  uyari = false,
}: {
  sonTarih?: string;
  etiket?: string;
  bittiEtiketi?: string;
  /** Kaçırılması anlaşmayı bitiren süre — son dakikada dikkat çeker. */
  uyari?: boolean;
}) {
  const [simdi, setSimdi] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!sonTarih) return null;
  const kalan = new Date(sonTarih).getTime() - simdi;
  const gecti = kalan <= 0;
  // Son beş dakikada ödeme sayacı kırmızıya döner.
  const kritik = uyari && kalan <= 5 * 60_000;
  const sn = Math.floor(Math.abs(kalan) / 1000);
  const parcalar = [
    Math.floor(sn / 3600),
    Math.floor((sn % 3600) / 60),
    sn % 60,
  ].map((n) => String(n).padStart(2, "0"));

  return (
    <div
      className={`flex-none rounded-control px-4 py-2.5 text-center ${
        gecti || kritik ? "bg-danger-soft" : "bg-subtle"
      }`}
    >
      <div
        // Sayaç saniyede bir değişiyor; ekran okuyucuya sürekli
        // okutmamak için canlı bölge yapılmadı.
        className={`font-mono text-[19px] font-extrabold leading-none tabular-nums ${
          gecti || kritik ? "text-danger" : "text-ink-900"
        }`}
      >
        {parcalar.join(":")}
      </div>
      <div
        className={`mt-1 text-[11.5px] font-bold uppercase tracking-[0.04em] ${
          gecti || kritik ? "text-danger" : "text-ink-400"
        }`}
      >
        {gecti ? bittiEtiketi : etiket}
      </div>
    </div>
  );
}

/**
 * Satıcının kargo firması + takip numarası girişi.
 *
 * Numara neden hâlâ elle giriliyor: hiçbir kargo firmasıyla canlı bağlantı
 * yok (bkz. lib/kargo-gonderi.ts → SAGLAYICILAR). Sağlayıcı bağlandığı gün
 * numarayı firma döner ve bu alan gerekmez; o güne kadar girilen numara
 * kayda BEYAN olarak düşer ve ekranda doğrulanmış gibi gösterilmez.
 *
 * Adresle ilgisi yok: numara elle girilse de alıcının adresi satıcıya
 * gösterilmez.
 */
function KargoFormu({
  onKargo,
  sabitFirma,
}: {
  onKargo: (firma: string, takipNo: string) => Promise<string | undefined>;
  /**
   * Sunumda beyan edilmiş firma. Doluysa seçim SORULMAZ: satıcı sözünü
   * sunumda verdi ve alıcı o sözü görerek kabul etti; burada başka bir
   * firmaya kaymak, alıcının karar verdiği koşulu tek taraflı
   * değiştirmek olurdu. Kural sunucuda da uygulanır (gonderiHazirla).
   */
  sabitFirma?: string;
}) {
  const [firma, setFirma] = useState(sabitFirma ?? "");
  const [takipNo, setTakipNo] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, setBekliyor] = useState(false);

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="min-w-[190px] flex-1">
          <label
            htmlFor="kargo-firma"
            className="block text-[12.5px] font-bold text-ink-900"
          >
            Kargo firması
          </label>
          {sabitFirma ? (
            <div className="mt-1.5 rounded-control border-[1.5px] border-hairline bg-subtle px-3 py-2.5 text-[14px] font-bold text-ink-900">
              {sabitFirma}
              <span className="ml-1.5 text-[12px] font-medium text-ink-500">
                · sunumunda seçtin
              </span>
            </div>
          ) : (
            <select
              id="kargo-firma"
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              className="mt-1.5 w-full cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-3 py-2.5 text-[14px] font-medium text-ink-900 outline-none focus:border-primary"
            >
              <option value="">Seç…</option>
              {KARGO_FIRMALARI.map((k) => (
                <option key={k.ad} value={k.ad}>
                  {k.ad}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="min-w-[190px] flex-1">
          <label
            htmlFor="kargo-takip"
            className="block text-[12.5px] font-bold text-ink-900"
          >
            Kargo takip numarası
          </label>
          <input
            id="kargo-takip"
            value={takipNo}
            onChange={(e) => setTakipNo(e.target.value.slice(0, 40))}
            placeholder="Örn. 1234567890123"
            className="mt-1.5 w-full rounded-control border-[1.5px] border-border-input bg-card px-3 py-2.5 text-[14px] font-medium text-ink-900 outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          disabled={!firma || takipNo.length < 6 || bekliyor}
          onClick={async () => {
            setBekliyor(true);
            setHata((await onKargo(firma, takipNo)) ?? "");
            setBekliyor(false);
          }}
          className="cursor-pointer rounded-control bg-accent px-5 py-2.5 text-[14px] font-bold text-ink-900 hover:brightness-95 disabled:opacity-60"
        >
          {bekliyor ? "Oluşturuluyor…" : "Gönderi Oluştur"}
        </button>
      </div>
      {hata && (
        <p role="alert" className="mt-2 text-[12.5px] font-bold text-danger">
          ⚠ {hata}
        </p>
      )}
    </div>
  );
}
