"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { talepNo, fiyatText } from "@/lib/data";
import type { Talep } from "@/lib/data";
import { harfFor, karsiTarafFor, rolFor } from "@/lib/sohbetler";
import type { Sohbet } from "@/lib/sohbetler";
import { useOturumSahibi } from "@/lib/aktif-kullanici";
import { ButtonLink } from "@/components/ui/Button";
import { SiparisPaneli } from "@/components/SiparisPaneli";
import { odemeSonTarih, siparisSuruyor } from "@/lib/anlasma";
import { useRouter } from "next/navigation";
import type { Anlasma } from "@/lib/anlasma";

type OfferSt = "superseded" | "accepted" | "rejected" | "pending";
type By = "seller" | "buyer";

type Msg =
  | { k: "sys"; text: string; time: string }
  | { k: "sunum"; by: By; time: string }
  | { k: "text"; by: By; text: string; time: string }
  | {
      k: "offer";
      by: By;
      amount: string;
      note: string;
      st: OfferSt;
      time: string;
    };

const fmt = (n: number) => n.toLocaleString("tr-TR");

/**
 * Yazarken tutarı binlik ayraçlarla gösterir: 10000 → 10.000,
 * 250000 → 250.000, 1500000 → 1.500.000. Değer state'te ham rakam
 * olarak durur; biçim yalnızca görüntüdedir.
 */
const tutarBicimle = (ham: string) =>
  ham ? Number(ham).toLocaleString("tr-TR") : "";

/**
 * Pazarlıkta yalnızca SON teklif yanıtlanabilir; yeni teklif verildiğinde
 * öncekiler geçersiz kalır. Bu yüzden bekleyen tekliflerden sonuncusu
 * dışındakiler "üzerine yeni teklif verildi" durumuna çekilir.
 */
function tekliflerTazele(liste: Msg[]): Msg[] {
  const sonTeklif = liste.reduce(
    (son, m, i) => (m.k === "offer" ? i : son),
    -1,
  );
  return liste.map((m, i) =>
    m.k === "offer" && m.st === "pending" && i !== sonTeklif
      ? { ...m, st: "superseded" as OfferSt }
      : m,
  );
}

/** Sunucudan gelen ham mesaj kaydı. */
type SunucuMesaj = {
  id: string;
  gonderen: string;
  metin: string;
  tutar?: number;
  zaman: string;
};

const saatBicim = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const now = () =>
  new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Açılacak sohbeti seçer.
 *
 * Önce `?sunum=` — sohbetin kimliği zaten sunum kimliğinden türetiliyor, o
 * yüzden bu doğrudan ve şaşmaz bir adres. `?satici=` ise karşı tarafın ADINI
 * arıyor ve bulamayınca listenin ilk sohbetine düşüyordu: satıcı kendi
 * sunumundan "Sohbete Geç" dediğinde parametre kendi adı oluyor, eşleşme
 * olmuyor ve alakasız bir alıcının konuşması açılıyordu.
 */
function konusmaIdBul(
  liste: Sohbet[],
  kullanici: string,
  satici?: string,
  sunumId?: string,
  sohbetId?: string,
) {
  if (!liste.length) return "";
  // `?sohbet=` sohbeti kimliğiyle adresler — profildeki "Mesaj Gönder"
  // bunu kullanır.
  if (sohbetId && liste.some((k) => k.id === sohbetId)) return sohbetId;
  if (sunumId) {
    const hedef = liste.find((k) => k.id === `sunum-${sunumId}`);
    if (hedef) return hedef.id;
  }
  if (satici) {
    const hedef = liste.find((k) => karsiTarafFor(k, kullanici) === satici);
    if (hedef) return hedef.id;
  }
  return liste[0].id;
}

export function MesajlarClient({
  satici,
  sunumId,
  sohbetId,
  konusmalar,
  talepler,
}: {
  satici?: string;
  /** `?sunum=` ile gelen sunum kimliği — sohbeti doğrudan adresler. */
  sunumId?: string;
  /** `?sohbet=` ile gelen sohbet kimliği. */
  sohbetId?: string;
  /** Sunucudan gelen sohbetler — sunumlardan türetilir. */
  konusmalar: Sohbet[];
  /** Sohbetlerin konusu olan talepler — ilan bağlamı buradan çözülür. */
  talepler: Talep[];
}) {
  // Kullanıcının rolü sohbete göre değişir: kendi talebinde alıcı,
  // sunum yaptığı talepte satıcıdır.
  const aktif = useOturumSahibi();
  const router = useRouter();
  const [activeId, setActiveId] = useState(() =>
    konusmaIdBul(konusmalar, aktif.kullanici, satici, sunumId, sohbetId),
  );
  const [msgs, setMsgs] = useState<Msg[]>([]);
  // Anlaşma sunucudan gelir: teklif kabul edildiği anda pazarlık kapanır,
  // sipariş (ödeme → kargo) başlar. İki taraf da aynı kaydı görür.
  const [anlasma, setAnlasma] = useState<Anlasma | null>(null);
  const deal: "negotiating" | "accepted" = anlasma ? "accepted" : "negotiating";
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerVal, setOfferVal] = useState("");
  const [msgText, setMsgText] = useState("");

  const threadRef = useRef<HTMLDivElement>(null);
  const aktifSohbet =
    konusmalar.find((k) => k.id === activeId) ?? konusmalar[0];
  const isSeed = Boolean(aktifSohbet?.acik);
  // Sohbetin konusu olan talep; tamamlanmış işlemlerde ilan yayında değildir.
  const sohbetTalep = aktifSohbet?.talepId
    ? talepler.find((t) => t.id === aktifSohbet.talepId)
    : undefined;
  const VIEWER: By = aktifSohbet
    ? rolFor(aktifSohbet, aktif.kullanici)
    : "buyer";
  const nameOf = (by: By) =>
    !aktifSohbet
      ? aktif.kullanici
      : by === "seller"
        ? aktifSohbet.satici
        : aktifSohbet.alici;
  const avOf = (by: By) => harfFor(nameOf(by));

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, activeId]);

  // Sohbet değişince o sohbetin mesajları sunucudan çekilir.
  useEffect(() => {
    if (!activeId) return;
    let iptal = false;
    fetch(`/api/mesajlar?sohbet=${encodeURIComponent(activeId)}`)
      .then((r) => (r.ok ? r.json() : { mesajlar: [] }))
      .then((v: { mesajlar?: SunucuMesaj[] }) => {
        if (iptal) return;
        const acilis: Msg[] = aktifSohbet?.sunumId
          ? [
              {
                k: "sys",
                // Aynı olay iki taraf için farklı okunur: alıcıya "sana
                // gönderildi", satıcıya "sen gönderdin" demek gerekiyor.
                text:
                  aktifSohbet.satici === aktif.kullanici
                    ? `${aktifSohbet.alici} kullanıcısına sunum gönderildi.`
                    : `${aktifSohbet.satici} size bir sunum gönderdi.`,
                time: aktifSohbet.saat,
              },
              { k: "sunum", by: "seller", time: aktifSohbet.saat },
              // Sunumun fiyat teklifi — kabul/teklif/ret burada yanıtlanır.
              {
                k: "offer",
                by: "seller",
                amount: fmt(aktifSohbet.sunumFiyat ?? 0),
                note: "Sunum teklifi",
                st: "pending",
                time: aktifSohbet.saat,
              },
            ]
          : [];
        setMsgs(
          tekliflerTazele([
            ...acilis,
            ...(v.mesajlar ?? []).map((m) =>
              m.tutar
                ? {
                    k: "offer" as const,
                    by: (m.gonderen === aktifSohbet?.satici
                      ? "seller"
                      : "buyer") as By,
                    amount: fmt(m.tutar),
                    note: "Teklif",
                    st: "pending" as OfferSt,
                    time: saatBicim(m.zaman),
                  }
                : {
                    k: "text" as const,
                    by: (m.gonderen === aktifSohbet?.satici
                      ? "seller"
                      : "buyer") as By,
                    text: m.metin,
                    time: saatBicim(m.zaman),
                  },
            ),
          ]),
        );
      })
      .catch(() => {
        if (!iptal) setMsgs([]);
      });
    return () => {
      iptal = true;
    };
  }, [
    activeId,
    aktifSohbet?.satici,
    aktifSohbet?.sunumId,
    aktifSohbet?.sunumFiyat,
    aktifSohbet?.alici,
    aktifSohbet?.saat,
    aktif.kullanici,
  ]);

  // Rozet sayısı sunucudan; sohbet açılınca o sohbet okundu sayılır ve
  // sayı yeniden okunur. Sabit "3 yeni" yazısı hiçbir hesapta doğru
  // değildi.
  const [okunmamis, setOkunmamis] = useState(0);
  useEffect(() => {
    if (!activeId) return;
    let iptal = false;
    void (async () => {
      await fetch("/api/okundu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sohbetId: activeId }),
      }).catch(() => undefined);
      const r = await fetch("/api/okunmamis").catch(() => undefined);
      if (!r?.ok || iptal) return;
      const { okunmamis: n } = (await r.json()) as { okunmamis: number };
      if (!iptal) setOkunmamis(n);
    })();
    return () => {
      iptal = true;
    };
  }, [activeId, aktif.kullanici]);

  // Sohbetin siparişi — mesajlardan ayrı bir kayıt olduğu için ayrı çekilir.
  useEffect(() => {
    const sunumId = aktifSohbet?.sunumId;
    let iptal = false;
    // Sunumu olmayan sohbetin siparişi de yoktur; uç boş kayıt döner ve
    // önceki sohbetten kalan sipariş böylece temizlenir.
    fetch(
      sunumId
        ? `/api/anlasmalar?sunum=${encodeURIComponent(sunumId)}`
        : "/api/anlasmalar?sunum=",
    )
      .then((r) => (r.ok ? r.json() : { anlasma: null }))
      .then((v: { anlasma?: Anlasma | null }) => {
        if (!iptal) setAnlasma(v.anlasma ?? null);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [aktifSohbet?.sunumId]);

  // Ödeme süresi dolduğu anda anlaşma sunucuda düşer; sohbet de kendini
  // toparlasın diye tam o anda bir kez yeniden okunur (sayfa yenilemeye
  // gerek kalmaz).
  useEffect(() => {
    if (!anlasma || anlasma.odemeZamani) return;
    const kalan = new Date(odemeSonTarih(anlasma)).getTime() - Date.now();
    const zamanlayici = setTimeout(
      () => {
        fetch(`/api/anlasmalar?sunum=${encodeURIComponent(anlasma.sunumId)}`)
          .then((r) => (r.ok ? r.json() : { anlasma: null }))
          .then((v: { anlasma?: Anlasma | null }) => {
            if (v.anlasma) return;
            setAnlasma(null);
            setMsgs((prev) => [
              ...prev,
              {
                k: "sys",
                text: "Ödeme süresi doldu; anlaşma iptal edildi. Talep yeniden sunuma açıldı.",
                time: now(),
              },
            ]);
          })
          .catch(() => undefined);
      },
      Math.max(0, kalan) + 1000,
    );
    return () => clearTimeout(zamanlayici);
  }, [anlasma]);

  // Teklif penceresi Escape ile kapanır.
  useEffect(() => {
    if (!offerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOfferOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [offerOpen]);

  const pending = [...msgs]
    .reverse()
    .find((m) => m.k === "offer" && m.st === "pending") as
    Extract<Msg, { k: "offer" }> | undefined;
  /**
   * Sunumun akıbetini sunucuya yazar. Karar kalıcı olmazsa satıcı
   * reddedilen sunumdan sonra yeniden sunum yapamaz — bu yüzden
   * kabul/ret sadece ekranda değil kayıtta da işlenir.
   */
  async function sunumuSonucla(sonuc: "kabul" | "red"): Promise<boolean> {
    const sunumId = aktifSohbet?.sunumId;
    // Kararı yalnızca talebi açan alıcı verir; sunucu da aynı kuralı uygular.
    if (!sunumId || VIEWER !== "buyer") return false;
    const r = await fetch(`/api/sunumlar/${encodeURIComponent(sunumId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sonuc }),
    }).catch(() => undefined);

    // YANIT KONTROL EDİLİR. Eskiden sonuç hiç okunmuyordu: sunucu reddetse
    // bile ekran "Sunum reddedildi. Satıcı bu talebe yeniden sunum
    // yapabilir." diyordu. Oysa kayıtta hiçbir şey değişmemiş oluyor —
    // satıcı sunumu hâlâ "beklemede" görüyor ve yeniden sunum yapamıyor.
    // Bu fonksiyonun kendi yorumu tam bunu yapmamak için yazılmıştı.
    if (!r?.ok) {
      const v = (await r?.json().catch(() => ({}))) as { hata?: string };
      sistemMesaji(v.hata ?? "Karar kaydedilemedi, tekrar dene.");
      return false;
    }
    return true;
  }

  const accept = async () => {
    if (!pending) return;
    const oncesi = msgs;

    // Kabulü iki taraf da verebilir; sipariş kaydını sunucu açar, sunumu
    // "kabul" olarak işaretler ve ANLAŞILAN TUTARI KENDİSİ BELİRLER.
    //
    // Kart önce "kabul edildi"ye çevrilir (hızlı geri bildirim) ama sunucu
    // reddederse GERİ ALINIR. Eskiden alınmıyordu: sipariş açılamadığında
    // ekranda hem "Sipariş açılamadı" hata satırı hem "kabul edildi" kartı
    // birlikte duruyor, üstelik kart artık "beklemede" olmadığı için
    // kullanıcı yeniden deneyemiyordu.
    setMsgs((prev) =>
      prev.map((m) =>
        m.k === "offer" && m.st === "pending"
          ? { ...m, st: "accepted" as OfferSt }
          : m,
      ),
    );
    setOfferOpen(false);

    if (!(await anlasmaAc())) setMsgs(oncesi);
  };

  /**
   * Kabul edilen teklifi siparişe çevirir.
   *
   * Tutar GÖNDERİLMEZ: sunucu sohbetteki son karşı teklife bakarak kendisi
   * yazar. Ekrandaki onay metni de sunucunun döndürdüğü tutarı gösterir —
   * istemcinin tahminini değil. İkisi ayrışırsa kullanıcı gerçek kaydı
   * görmeli.
   */
  async function anlasmaAc(): Promise<boolean> {
    const sunumId = aktifSohbet?.sunumId;
    if (!sunumId) return false;
    const r = await fetch("/api/anlasmalar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sunumId }),
    }).catch(() => undefined);

    if (!r?.ok) {
      const v = (await r?.json().catch(() => ({}))) as { hata?: string };
      sistemMesaji(v.hata ?? "Sipariş açılamadı, tekrar dene.");
      return false;
    }

    const { anlasma: yeni } = (await r.json()) as { anlasma: Anlasma };
    setAnlasma(yeni);
    setMsgs((prev) => [
      ...prev,
      {
        k: "sys",
        text: `Teklif kabul edildi — ${fiyatText(yeni.tutar)} üzerinde anlaşıldı. Sıra ödemede; satıcının kargo süresi ödeme alınınca başlar.`,
        time: now(),
      },
    ]);
    return true;
  }

  /**
   * Teslim sonrası alıcının yanıtı. "Hayır" seçilirse kullanıcı hemen
   * destek kaydına yönlendirilir; sorunun kaybolmaması için sohbet
   * beklemeye alınmaz.
   */
  // "Ürünü teslim aldım" adımı kaldırıldı: teslim bilgisi kargo
  // firmasından geliyor ve aynı olayı bir de alıcıya doğrulatmak akışa
  // hiçbir şey katmıyordu (bkz. lib/anlasma.ts). Teslim damgası düşer
  // düşmez sıra doğrudan "ürün anlatıldığı gibi mi?" sorusuna gelir.

  async function onayGonder(onay: "evet" | "hayir") {
    const sunumId = aktifSohbet?.sunumId;
    if (!sunumId) return;
    const r = await fetch(
      `/api/anlasmalar/${encodeURIComponent(sunumId)}/onay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onay }),
      },
    ).catch(() => undefined);
    if (!r?.ok) return;
    const { anlasma: yeni } = (await r.json()) as { anlasma: Anlasma };
    setAnlasma(yeni);
    setMsgs((prev) => [
      ...prev,
      {
        k: "sys",
        text:
          onay === "evet"
            ? "Alıcı ürünü onayladı — alışveriş başarıyla tamamlandı."
            : // "Destek kaydı açıldı" DEMİYORUZ: kayıt bu noktada henüz
              // yok, kullanıcı birazdan onu oluşturacağı forma gidiyor.
              // Sipariş paneli de kaydın gerçekten açılıp açılmadığına
              // bakarak konuşuyor; iki ekran aynı şeyi söylemeli.
              "Alıcı üründe sorun bildirdi. İnceleme, destek kaydı oluşturulunca başlar.",
        time: now(),
      },
    ]);
    if (onay === "hayir")
      router.push(`/destek?konu=teslim&siparis=${encodeURIComponent(sunumId)}`);
  }

  /** Kargo bilgisi — hata metni döner, form onu gösterir. */
  // Takip numarası sağlayıcı bağlanana kadar satıcıdan alınır; kayıt
  // bunun beyan olduğunu taşır (bkz. lib/kargo-gonderi.ts).
  async function kargoGonder(firma: string, takipNo: string) {
    const sunumId = aktifSohbet?.sunumId;
    if (!sunumId) return "Sipariş bulunamadı.";
    const r = await fetch(
      `/api/anlasmalar/${encodeURIComponent(sunumId)}/kargo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firma, takipNo }),
      },
    ).catch(() => undefined);
    if (!r) return "Bağlantı kurulamadı.";
    const veri = (await r.json()) as { anlasma?: Anlasma; hata?: string };
    if (!r.ok) return veri.hata ?? "Gönderi oluşturulamadı.";
    if (veri.anlasma) {
      setAnlasma(veri.anlasma);
      setMsgs((prev) => [
        ...prev,
        {
          k: "sys",
          // Firma ve takip numarası hemen altındaki kargo kartında
          // zaten duruyor; sistem satırında tekrarlamak fazlalıktı.
          text: "Ürün kargoya verildi.",
          time: now(),
        },
      ]);
    }
    return undefined;
  }

  const reject = async () => {
    if (!pending) return;
    const oncesi = msgs;

    setMsgs((prev) => [
      ...prev.map((m) =>
        m.k === "offer" && m.st === "pending"
          ? { ...m, st: "rejected" as OfferSt }
          : m,
      ),
      {
        k: "sys",
        text: "Sunum reddedildi. Satıcı bu talebe yeniden sunum yapabilir.",
        time: now(),
      },
    ]);
    setOfferOpen(false);

    // Ret kayda geçmezse ekrandaki "reddedildi" bir yalan olur: satıcı
    // sunumu hâlâ beklemede görür.
    if (!(await sunumuSonucla("red"))) setMsgs(oncesi);
  };

  const counterSend = async () => {
    const val = parseInt(offerVal, 10);
    if (!val || val <= 0) return;
    // Pencere ve tutar ancak teklif kayda geçtiyse temizlenir.
    if (await gonder({ tutar: val })) {
      setOfferOpen(false);
      setOfferVal("");
    }
  };

  /**
   * Mesajı sunucuya yazar; karşı taraf da aynı kaydı görür.
   *
   * BAŞARIYI DÖNDÜRÜR. Eskiden başarısızlıkta sessizce vazgeçiyordu
   * (`if (!r.ok) return;`) ama çağıran taraf mesaj kutusunu ve teklif
   * alanını ZATEN temizlemişti: kullanıcı yazdığı mesajı kaybediyor,
   * ekranda hiçbir uyarı görmüyor ve mesajın gittiğini sanıyordu.
   * Talep alarmı formunda da aynı hata çıkmıştı (bkz. BACKEND.md).
   */
  async function gonder(govde: {
    metin?: string;
    tutar?: number;
  }): Promise<boolean> {
    if (!activeId) return false;
    const r = await fetch("/api/mesajlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sohbetId: activeId, ...govde }),
    }).catch(() => undefined);

    if (!r?.ok) {
      const v = (await r?.json().catch(() => ({}))) as { hata?: string };
      sistemMesaji(
        v.hata ?? "Mesaj gönderilemedi. Bağlantını kontrol edip tekrar dene.",
      );
      return false;
    }
    const { mesaj } = (await r.json()) as { mesaj: SunucuMesaj };
    setMsgs((prev) =>
      tekliflerTazele([
        ...prev,
        mesaj.tutar
          ? {
              k: "offer",
              by: VIEWER,
              amount: fmt(mesaj.tutar),
              note: "Teklif",
              st: "pending",
              time: saatBicim(mesaj.zaman),
            }
          : {
              k: "text",
              by: VIEWER,
              text: mesaj.metin,
              time: saatBicim(mesaj.zaman),
            },
      ]),
    );
    return true;
  }

  /** Akış hatalarını sohbete sistem satırı olarak düşürür. */
  function sistemMesaji(text: string) {
    setMsgs((prev) => [...prev, { k: "sys", text, time: now() }]);
  }

  const sendText = async () => {
    const t = msgText.trim();
    if (!t) return;
    // Kutu ancak mesaj GERÇEKTEN gittikten sonra temizlenir; yoksa
    // başarısız istekte kullanıcı yazdığını kaybediyordu.
    if (await gonder({ metin: t })) setMsgText("");
  };

  const offerNum = parseInt(offerVal, 10);

  // Sayfa yenilendiğinde kabul bilgisi mesajlarda değil anlaşma kaydında
  // durur; son teklif buna göre "kabul edildi" gösterilir.
  const gorunenMsgs = anlasma
    ? (() => {
        const sonTeklif = msgs.reduce(
          (son, m, i) => (m.k === "offer" ? i : son),
          -1,
        );
        return msgs.map((m, i) =>
          i === sonTeklif && m.k === "offer"
            ? { ...m, st: "accepted" as OfferSt }
            : m,
        );
      })()
    : msgs;

  if (!aktifSohbet) {
    return (
      <main className="mx-auto max-w-[640px] px-6 pb-20 pt-16">
        <div className="rounded-panel border border-border bg-card p-9 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-2xl text-primary-hover">
            ✉
          </div>
          <h1 className="mt-5 text-[22px] font-extrabold text-ink-900">
            Henüz mesajın yok
          </h1>
          <p className="mx-auto mt-2.5 max-w-md text-sm font-medium leading-relaxed text-ink-500">
            Bir talebe sunum gönderdiğinde ya da kendi talebine sunum geldiğinde
            pazarlık burada başlar.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <ButtonLink href="/kesfet" variant="primary" size="lg">
              Talepleri Keşfet
            </ButtonLink>
            <ButtonLink href="/ilan-ac" variant="secondary" size="lg">
              Aradığını İlan Et
            </ButtonLink>
          </div>
        </div>
      </main>
    );
  }

  const activeConv = aktifSohbet;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)_272px]">
        {/* ── Sohbet listesi ── */}
        <aside className="overflow-hidden rounded-card border border-border bg-card lg:sticky lg:top-[120px]">
          <div className="flex items-baseline justify-between border-b border-hairline px-4 pb-3 pt-4">
            <h1 className="text-base font-extrabold text-ink-900">Mesajlar</h1>
            {okunmamis > 0 && (
              <span className="rounded-full bg-accent px-2 py-[5px] text-[12px] font-bold text-ink-900">
                {okunmamis} yeni
              </span>
            )}
          </div>
          {konusmalar.map((c) => {
            const secili = c.id === activeId;
            // Özet metni sohbetin kendi verisinden gelir; sabit bir tutar
            // yazmak gerçek teklifle çelişiyordu.
            //
            // "Anlaşıldı ✓" YALNIZCA sipariş SÜRERKEN yazılır. Koşul
            // "anlaşma var mı?" idi ve tamamlanmış alışverişte de doğruydu:
            // sunucunun ürettiği "Alışveriş tamamlandı ✓" satırı, sohbete
            // tıklanır tıklanmaz bir önceki aşamaya geri dönüyordu.
            const onizleme =
              c.acik &&
              c.id === activeId &&
              anlasma !== null &&
              siparisSuruyor(anlasma)
                ? "Anlaşıldı ✓"
                : c.son;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex w-full gap-2.5 border-l-[3px] px-3.5 py-3 text-left transition-colors ${
                  secili
                    ? "border-l-primary bg-primary-soft"
                    : "border-l-transparent hover:bg-subtle"
                }`}
              >
                <span
                  className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                    secili
                      ? "bg-ink-900 text-accent"
                      : "bg-primary-soft text-primary-hover"
                  }`}
                >
                  {harfFor(karsiTarafFor(c, aktif.kullanici))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate text-[14px] font-bold text-ink-900">
                      {karsiTarafFor(c, aktif.kullanici)}
                    </span>
                    <span className="flex-none text-[11.5px] font-medium text-ink-400">
                      {c.saat}
                    </span>
                  </span>
                  <span
                    className={`mt-[3px] block truncate text-[12px] font-semibold ${
                      secili ? "text-primary-hover" : "text-ink-400"
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
            <div className="ref-image flex h-11 w-11 flex-none items-center justify-center rounded-control font-mono text-[9px] text-ink-400">
              görsel
            </div>
            <div className="min-w-0 flex-1">
              {sohbetTalep ? (
                <Link
                  href={`/ilan/${sohbetTalep.id}`}
                  className="block truncate text-sm font-bold text-ink-900"
                >
                  {activeConv.ilan}
                </Link>
              ) : (
                <div className="truncate text-sm font-bold text-ink-900">
                  {activeConv.ilan}
                </div>
              )}
              <div className="mt-[3px] text-[12.5px] font-medium text-ink-400">
                {sohbetTalep ? (
                  <>
                    Alıcının fiyatı:{" "}
                    <span className="font-bold text-ink-900">
                      {fiyatText(sohbetTalep.fiyatNum)}
                    </span>{" "}
                    · İlan {talepNo(sohbetTalep.id)}
                  </>
                ) : (
                  "Tamamlanmış işlem — ilan artık yayında değil"
                )}
              </div>
            </div>
            {sohbetTalep && (
              <Link
                href={`/ilan/${sohbetTalep.id}`}
                className="flex-none text-[13px] font-semibold"
              >
                İlanı Gör
              </Link>
            )}
          </div>

          {isSeed ? (
            <>
              {/* Mesaj akışı */}
              <div
                ref={threadRef}
                className="flex h-[calc(100vh-330px)] min-h-[220px] flex-col gap-3.5 overflow-y-auto bg-subtle px-[18px] pb-2 pt-[18px]"
              >
                {gorunenMsgs.map((m, i) => {
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
                        className={`max-w-[440px] rounded-card border border-border bg-card p-3.5 ${
                          // Sunum kartı da bir mesajdır: gönderen taraf için
                          // sağda, karşı taraf için solda durur.
                          m.by === VIEWER ? "self-end" : "self-start"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-1 gap-1.5">
                            {Array.from(
                              {
                                length: Math.min(3, aktifSohbet.sunumFoto ?? 0),
                              },
                              (_, n) => (
                                <div
                                  key={n}
                                  className="ref-image flex aspect-[3/4] w-[46px] flex-none items-center justify-center rounded-lg font-mono text-[9px] text-ink-400"
                                >
                                  foto {n + 1}
                                </div>
                              ),
                            )}
                            {(aktifSohbet.sunumFoto ?? 0) > 3 && (
                              <div className="flex aspect-[3/4] w-[46px] flex-none items-center justify-center rounded-lg bg-page text-[12px] font-bold text-ink-500">
                                +{(aktifSohbet.sunumFoto ?? 0) - 3}
                              </div>
                            )}
                          </div>
                          <ButtonLink
                            href={`/sunum-detay?id=${encodeURIComponent(aktifSohbet.sunumId ?? "")}`}
                            variant="primary"
                            size="sm"
                            className="flex-none"
                          >
                            Sunumu görüntüle ›
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
                        <div
                          key={i}
                          className="max-w-[430px] self-end text-right"
                        >
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
                      <div
                        key={i}
                        className="flex max-w-[430px] gap-2 self-start"
                      >
                        {/* Avatar karşı tarafın profiline gider. */}
                        <Link
                          href={`/profil/${nameOf(m.by)}`}
                          aria-label={`${nameOf(m.by)} profilini gör`}
                          title={`${nameOf(m.by)} profilini gör`}
                          className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink-900 text-[10.5px] font-bold text-accent transition-opacity hover:opacity-80"
                        >
                          {avOf(m.by)}
                        </Link>
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
                      className={`w-[380px] max-w-full rounded-panel border-[1.5px] bg-card px-4 py-3.5 ${
                        // Teklif de bir mesajdır: karşı tarafınki solda,
                        // kendi teklifin sağda — metin balonlarıyla aynı hiza.
                        mine ? "self-end" : "self-start"
                      } ${border}`}
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
                              onClick={() => void accept()}
                              className="flex-1 cursor-pointer rounded-control bg-primary px-3 py-3 text-[14px] font-bold text-white hover:bg-primary-hover"
                            >
                              Kabul Et
                            </button>
                            <button
                              type="button"
                              onClick={() => setOfferOpen(true)}
                              className="flex-1 cursor-pointer rounded-control bg-accent px-3 py-3 text-[14px] font-bold text-ink-900 hover:brightness-95"
                            >
                              Teklif Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => void reject()}
                              className="flex-1 cursor-pointer rounded-control bg-acil px-3 py-3 text-[14px] font-bold text-white hover:brightness-95"
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

              {/* Anlaşma sonrası sipariş akışı: ödeme alıcının, kargo
                  satıcının işi — panel rolüne göre farklı görünür. */}
              {anlasma && (
                <SiparisPaneli
                  anlasma={anlasma}
                  rol={VIEWER}
                  onKargo={kargoGonder}
                  onOnay={onayGonder}
                />
              )}

              {/* Teklif penceresi — ekranın üstünde açılan katman.
                  Sohbet akışını kaydırmadan teklif verilir; Escape ve
                  dışarı tıklama ile kapanır. */}
              {offerOpen && deal === "negotiating" && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="teklif-baslik"
                  onClick={() => setOfferOpen(false)}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-accent/55 p-6 backdrop-blur-[2px]"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[420px] rounded-panel border border-border bg-card p-6 shadow-pop"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2
                          id="teklif-baslik"
                          className="text-[19px] font-extrabold text-ink-900"
                        >
                          Teklif ver
                        </h2>
                        <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-ink-500">
                          {karsiTarafFor(activeConv, aktif.kullanici)} ile
                          pazarlık — yeni teklifin öncekini geçersiz kılar, ek
                          ücret yok.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOfferOpen(false)}
                        aria-label="Kapat"
                        className="flex-none cursor-pointer rounded-full px-2 py-1 text-[18px] leading-none text-ink-400 hover:text-ink-900"
                      >
                        ×
                      </button>
                    </div>

                    {sohbetTalep && (
                      <div className="mt-4 flex justify-between rounded-control bg-subtle px-3.5 py-2.5 text-[13px] font-medium">
                        <span className="text-ink-400">İlan fiyatı</span>
                        <span className="font-bold text-ink-900">
                          {fiyatText(sohbetTalep.fiyatNum)}
                        </span>
                      </div>
                    )}

                    <label
                      htmlFor="revize-teklif"
                      className="mt-4 block text-[13.5px] font-bold text-ink-900"
                    >
                      Teklifin (TL)
                    </label>
                    <input
                      id="revize-teklif"
                      autoFocus
                      value={tutarBicimle(offerVal)}
                      onChange={(e) =>
                        setOfferVal(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 9),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && offerNum > 0) counterSend();
                        if (e.key === "Escape") setOfferOpen(false);
                      }}
                      inputMode="numeric"
                      placeholder="örn. 58.000"
                      className="mt-2 w-full box-border rounded-control border-[1.5px] border-border-input bg-card px-4 py-3.5 text-[20px] font-extrabold text-ink-900 outline-none focus:border-primary"
                    />

                    <div className="mt-5 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setOfferOpen(false)}
                        className="flex-1 cursor-pointer rounded-control border-[1.5px] border-border-input bg-card px-4 py-3 text-[14px] font-bold text-ink-900"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={() => void counterSend()}
                        disabled={!offerNum || offerNum <= 0}
                        className={`flex-1 rounded-control px-4 py-3 text-[14px] font-bold ${
                          offerNum > 0
                            ? "cursor-pointer bg-accent text-ink-900 hover:brightness-95"
                            : "cursor-not-allowed bg-[#efebf5] text-ink-300"
                        }`}
                      >
                        Teklifi Gönder
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mesaj yazma */}
              <div className="flex items-center gap-2.5 border-t border-hairline bg-card px-4 py-3">
                {/* Teklif verme yalnızca teklif kutusundaki butondan yapılır;
                    yazma satırındaki ikinci giriş gereksizdi. */}
                <input
                  value={msgText}
                  aria-label="Mesaj yaz"
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendText();
                  }}
                  placeholder="Mesaj yaz..."
                  className="flex-1 rounded-control border-[1.5px] border-border-input bg-card px-3.5 py-3 text-[14.5px] font-medium text-ink-900 outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => void sendText()}
                  className="flex-none cursor-pointer rounded-control bg-primary px-5 py-3 text-[14.5px] font-bold text-white hover:bg-primary-hover"
                >
                  Gönder
                </button>
              </div>
            </>
          ) : (
            /* Placeholder konuşma */
            <div className="flex h-[calc(100vh-330px)] min-h-[220px] flex-col items-center justify-center gap-3 bg-subtle px-8 text-center">
              <Link
                href={`/profil/${karsiTarafFor(activeConv, aktif.kullanici)}`}
                aria-label={`${karsiTarafFor(activeConv, aktif.kullanici)} profilini gör`}
                title={`${karsiTarafFor(activeConv, aktif.kullanici)} profilini gör`}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary-hover transition-opacity hover:opacity-80"
              >
                {harfFor(karsiTarafFor(activeConv, aktif.kullanici))}
              </Link>
              <div className="text-base font-bold text-ink-900">
                {karsiTarafFor(activeConv, aktif.kullanici)} ile sohbet
              </div>
              <p className="max-w-[320px] text-[14px] font-medium leading-relaxed text-ink-400">
                Bu sohbet tamamlanmış bir işleme ait. Önizlemede yalnızca
                pazarlığı süren sohbetin tam geçmişi yüklüdür.
              </p>
              <button
                type="button"
                onClick={() => {
                  const acikOlan = konusmalar.find((k) => k.acik);
                  if (acikOlan) setActiveId(acikOlan.id);
                }}
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
                yalnızca Bulbana üzerinden
              </strong>{" "}
              yürütülmelidir. Karşı taraf seni IBAN&apos;a havale, kapıda nakit
              ya da başka bir uygulamaya geçmeye çağırıyorsa kabul etme.
            </p>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-white">
              Uygulama dışında yapılan ödemelerde güvenli ödeme, iade ve itiraz
              hakkın işlemez; doğabilecek dolandırıcılık ve kayıplardan{" "}
              <strong className="font-extrabold text-accent">
                Bulbana sorumlu değildir
              </strong>
              .
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
