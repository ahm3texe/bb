import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "İlan Kuralları & Yasaklı Ürünler",
  description:
    "Bulbana'da talep açarken ve sunum gönderirken uyman gereken kurallar, yasaklı ürünler ve kademeli yaptırımlar.",
};

const yasakliUrunler = [
  {
    baslik: "Sahte & replika ürünler",
    metin: '"Replika kabulümdür" ibaresi de dahil — marka taklidi talep edilemez.',
  },
  {
    baslik: "Silah, mühimmat & kesici alet",
    metin: "Ruhsatlı olsa dahi platform üzerinden alım-satımı yasaktır.",
  },
  {
    baslik: "İlaç, takviye & tıbbi cihaz",
    metin: "Reçeteli/reçetesiz ilaç, lens, işitme cihazı gibi sağlık ürünleri.",
  },
  {
    baslik: "Canlı hayvan",
    metin: "Evcil hayvan dahil hiçbir canlı, talep konusu olamaz.",
  },
  {
    baslik: "Dijital hesap & kişisel veri",
    metin: "Oyun/sosyal medya hesabı, abonelik paylaşımı, veri listeleri.",
  },
  {
    baslik: "Menşei belirsiz ürün",
    metin: "IMEI kayıtsız telefon, seri numarası silinmiş ürün, gümrüksüz mal.",
  },
];

const talepKurallari = [
  {
    ok: true,
    lead: "Tek ilan, tek ürün.",
    rest: ' "Ne bulursanız gönderin" tarzı genel ilanlar yerine aradığın ürünü net tanımla — marka, model, durum.',
  },
  {
    ok: true,
    lead: "Gerçekçi fiyat koy.",
    rest: " Piyasanın belirgin altındaki fiyatlar sunum almaz; ilanın 3 sunumdan az alırsa fiyat önerisi gösteririz.",
  },
  {
    ok: true,
    lead: "Referans görsel temsilidir.",
    rest: " İlana koyduğun görsel aradığını tanımlar; satıcının ürünü sunum fotoğraflarıyla değerlendirilir.",
  },
  {
    ok: false,
    lead: "İletişim bilgisi paylaşma.",
    rest: " İlan metninde telefon, adres, sosyal medya hesabı yer alamaz — tüm iletişim platform sohbetinde kalır.",
  },
];

const sunumKurallari = [
  {
    ok: true,
    lead: "Fotoğraflar sunduğun ürüne ait olmalı.",
    rest: " Stok/katalog görseli, başka ilandan alınmış fotoğraf kullanılamaz; 3-10 fotoğrafın tamamı elindeki ürünü göstermeli.",
  },
  {
    ok: true,
    lead: "Kusuru gizleme.",
    rest: " Çizik, eksik parça, çalışmayan özellik açıklamada belirtilmeli — teslimde uyumsuzluk çıkarsa itiraz süreci satıcı aleyhine işler.",
  },
  {
    ok: true,
    lead: "İmzalı/sertifikalı ürünlerde kanıt şart.",
    rest: " COA belgesi, satın alma faturası ya da imza anı fotoğrafı sunuma eklenmeli.",
  },
  {
    ok: false,
    lead: "Platform dışına çekmek yasak.",
    rest: ' Fotoğraf üzerine telefon yazmak, "WhatsApp\'tan konuşalım" demek kalıcı yaptırım nedenidir — güvence yalnızca platform içinde geçerli.',
  },
];

const yaptirimlar = [
  {
    no: "1",
    baslik: "Uyarı",
    metin: "İçerik düzeltme talebiyle bildirim gönderilir.",
    cardClass: "bg-subtle",
    badgeClass: "bg-primary-soft text-primary-hover",
    baslikClass: "text-ink-900",
    metinClass: "text-ink-400",
  },
  {
    no: "2",
    baslik: "İçerik kaldırma",
    metin: "İlan ya da sunum yayından kaldırılır.",
    cardClass: "bg-subtle",
    badgeClass: "bg-primary-soft text-primary-hover",
    baslikClass: "text-ink-900",
    metinClass: "text-ink-400",
  },
  {
    no: "3",
    baslik: "7 gün askı",
    metin: "İlan açma ve sunum gönderme dondurulur.",
    cardClass: "bg-subtle",
    badgeClass: "bg-[#fff3e5] text-[#b45309]",
    baslikClass: "text-ink-900",
    metinClass: "text-ink-400",
  },
  {
    no: "4",
    baslik: "Kalıcı kapatma",
    metin: "Hesap ve bekleyen bakiye hukuki sürece göre işletilir.",
    cardClass: "bg-danger-soft",
    badgeClass: "bg-danger text-white",
    baslikClass: "text-danger",
    metinClass: "text-[#9a5b57]",
  },
];

function KuralSatiri({
  ok,
  lead,
  rest,
}: {
  ok: boolean;
  lead: string;
  rest: string;
}) {
  return (
    <div className="flex items-start gap-[11px]">
      <span
        className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold ${
          ok
            ? "bg-accent-soft text-accent-ink"
            : "bg-danger-soft text-danger"
        }`}
      >
        {ok ? "✓" : "✕"}
      </span>
      <span className="text-[13.5px] font-medium leading-[1.6] text-ink-700">
        <strong className="font-bold text-ink-900">{lead}</strong>
        {rest}
      </span>
    </div>
  );
}

export default function IlanKurallariPage() {
  return (
    <main className="mx-auto max-w-[880px] px-6 pb-16 pt-[18px]">
      {/* Breadcrumb */}
      <div className="py-[10px] text-[12.5px] font-medium text-ink-400">
        <Link href="/yardim" className="text-ink-400">
          Yardım
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">
          İlan Kuralları &amp; Yasaklı Ürünler
        </span>
      </div>

      <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-[-0.8px] text-ink-900">
        İlan Kuralları &amp; Yasaklı Ürünler
      </h1>
      <p className="mb-6 mt-2.5 text-pretty text-sm font-medium leading-[1.6] text-ink-500">
        Bulbana&apos;da güven, kuraldan önce gelir — bu kurallar hem alıcıyı hem
        satıcıyı korur. Talep açarken ve sunum gönderirken aşağıdakilere uyman
        gerekir; aykırı içerikler moderasyon ekibince kaldırılır.
      </p>

      {/* Yasaklı ürünler */}
      <section className="mb-4 rounded-[18px] border border-border bg-card p-6">
        <h2 className="mb-1 text-[19px] font-extrabold text-ink-900">
          Talep Edilemeyecek Ürünler
        </h2>
        <p className="mb-4 text-[12.5px] font-medium leading-[1.5] text-ink-400">
          Bu kategorilerde açılan ilanlar yayınlanmaz; tekrarında hesap yaptırımı
          uygulanır.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {yasakliUrunler.map((u) => (
            <div
              key={u.baslik}
              className="flex items-start gap-[11px] rounded-[12px] bg-subtle px-3.5 py-[13px]"
            >
              <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-danger-soft text-[11px] font-extrabold text-danger">
                ✕
              </span>
              <div>
                <div className="text-[13px] font-bold leading-[1.3] text-ink-900">
                  {u.baslik}
                </div>
                <div className="mt-[3px] text-[11.5px] font-medium leading-[1.5] text-ink-400">
                  {u.metin}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Talep kuralları */}
      <section className="mb-4 rounded-[18px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[19px] font-extrabold text-ink-900">
          Alıcılar İçin: Talep Kuralları
        </h2>
        <div className="flex flex-col gap-2.5">
          {talepKurallari.map((k) => (
            <KuralSatiri key={k.lead} {...k} />
          ))}
        </div>
      </section>

      {/* Sunum kuralları */}
      <section className="mb-4 rounded-[18px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[19px] font-extrabold text-ink-900">
          Satıcılar İçin: Sunum Kuralları
        </h2>
        <div className="flex flex-col gap-2.5">
          {sunumKurallari.map((k) => (
            <KuralSatiri key={k.lead} {...k} />
          ))}
        </div>
      </section>

      {/* Yaptırım kademeleri */}
      <section className="rounded-[18px] border border-border bg-card p-6">
        <h2 className="mb-1 text-[19px] font-extrabold text-ink-900">
          Yaptırım Kademeleri
        </h2>
        <p className="mb-[18px] text-[12.5px] font-medium leading-[1.5] text-ink-400">
          İhlaller kademeli uygulanır; sahtecilik ve dolandırıcılıkta doğrudan 4.
          kademeye geçilir.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {yaptirimlar.map((y) => (
            <div key={y.no} className={`rounded-[14px] p-4 ${y.cardClass}`}>
              <div
                className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12px] font-extrabold ${y.badgeClass}`}
              >
                {y.no}
              </div>
              <div
                className={`mt-2.5 text-[13px] font-bold leading-[1.3] ${y.baslikClass}`}
              >
                {y.baslik}
              </div>
              <div
                className={`mt-1 text-[11.5px] font-medium leading-[1.5] ${y.metinClass}`}
              >
                {y.metin}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-[18px] text-[12.5px] font-medium leading-[1.55] text-ink-500">
          Kural ihlali gördüğünde ilandaki{" "}
          <strong className="font-bold text-ink-900">&quot;Bildir&quot;</strong>{" "}
          bağlantısını kullan ya da{" "}
          <Link href="/destek" className="font-bold">
            destek talebi
          </Link>{" "}
          oluştur. Detaylı hukuki çerçeve için{" "}
          <Link href="/sozlesmeler" className="font-bold">
            Kullanıcı Sözleşmesi
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
