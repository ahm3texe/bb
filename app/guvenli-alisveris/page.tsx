import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Güvenli Alışveriş Rehberi",
  description:
    "Bulbana Güvencesi ödemeni korur; bu rehber güvenceyi tamamlayan alışkanlıkları, alıcı-satıcı ipuçlarını ve kırmızı bayrakları anlatır.",
};

const aliciIpuclari = [
  {
    lead: "Sunumda canlı kanıt iste.",
    rest: " Satıcıdan ürünün yanına el yazısıyla kullanıcı adını ve bugünün tarihini yazıp fotoğraflamasını iste — stok fotoğrafı dolandırıcılığını anında eler.",
  },
  {
    lead: "Seri numarası ve sertifikayı doğrula.",
    rest: " İmzalı/koleksiyon ürünlerde COA numarasını veren kuruluşun sitesinden kontrol et; elektronikte IMEI/seri no fotoğrafı iste.",
  },
  {
    lead: "Satıcı geçmişini oku.",
    rest: ' Puan kadar değerlendirme metinleri de önemli: "anlatıldığı gibi geldi" yorumları ve zamanında kargo oranı %95 üstü olan satıcıları tercih et.',
  },
  {
    lead: "Paketi kamerayla aç.",
    rest: " Kargo açılışını videoya al — üründe uyumsuzluk çıkarsa itirazda en güçlü kanıtın bu olur. Onay butonuna ürünü incelemeden basma; onay, ödemeyi satıcıya aktarır.",
  },
];

const saticiIpuclari = [
  {
    lead: "Paketleme sürecini belgele.",
    rest: ' Ürünü kutuya koyarken video çek; kargo fişini sakla. "Ürün eksik geldi" itirazlarına karşı birincil kanıtın.',
  },
  {
    lead: "Yalnızca sipariş ekranındaki adrese gönder.",
    rest: ' Sohbette "adres değişti, şuraya gönder" mesajı gelirse gönderme — adres değişikliği yalnızca sipariş ekranından yapılabilir.',
  },
  {
    lead: "Kusuru önceden yaz.",
    rest: " Sunumda belirttiğin her kusur seni korur; belirtmediğin her kusur itirazda aleyhine işler.",
  },
  {
    lead: "3 gün kuralını ciddiye al.",
    rest: " Süre dolarsa satış otomatik iptal olur ve ödeme alıcıya döner; yetişemeyeceksen alıcıyla sohbetten iptali konuş.",
  },
];

const kirmiziBayraklar = [
  '"WhatsApp/Telegram\'dan devam edelim" — sohbeti platformdan çıkarma isteği',
  '"Kaparo gönderin, ürünü ayırayım" — her türlü ön ödeme talebi',
  'Sunumda piyasanın çok altında fiyat + "hemen karar ver" baskısı — aciliyetle karar aldırma',
  'Ek fotoğraf/video isteğine sürekli bahane — "kamera bozuk, şehir dışındayım"',
];

export default function GuvenliAlisverisPage() {
  return (
    <main className="mx-auto max-w-[880px] px-6 pb-16 pt-[18px]">
      {/* Breadcrumb */}
      <div className="py-[10px] text-[12.5px] font-medium text-ink-400">
        <Link href="/yardim" className="text-ink-400">
          Yardım
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-semibold text-ink-900">
          Güvenli Alışveriş Rehberi
        </span>
      </div>

      <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-[-0.8px] text-ink-900">
        Güvenli Alışveriş Rehberi
      </h1>
      <p className="mb-6 mt-2.5 text-pretty text-sm font-medium leading-[1.6] text-ink-500">
        Bulbana Güvencesi ödemeni korur — bu rehber ise güvenceyi tamamlayan
        alışkanlıkları anlatır. Beş dakikada oku, her işlemde uygula.
      </p>

      {/* Altın kural — koyu kart */}
      <section className="mb-4 rounded-[18px] bg-ink-900 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent text-[18px] font-extrabold text-ink-900">
            ₺
          </div>
          <h2 className="text-[19px] font-extrabold leading-[1.25]">
            Altın kural: Ödeme asla platform dışına çıkmaz
          </h2>
        </div>
        <p className="mt-3 text-pretty text-[13px] font-medium leading-[1.65] text-[#cfc5e8]">
          IBAN&apos;a havale, kapıda ödeme, &quot;kaparo&quot; — hiçbiri Bulbana
          Güvencesi kapsamında değildir. Ödeme yalnızca sipariş ekranından
          yapılır; sen ürünü onaylayana kadar paran Bulbana güvencesinde beklemede
          tutulur. Platform dışı ödeme isteyen herkesi, konuşma ne kadar ikna
          edici olursa olsun,{" "}
          <strong className="text-accent">bildir ve işlemi durdur</strong>.
        </p>
      </section>

      {/* Alıcılar için */}
      <section className="mb-4 rounded-[18px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[19px] font-extrabold text-ink-900">
          Alıcılar İçin
        </h2>
        <div className="flex flex-col gap-3">
          {aliciIpuclari.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-soft text-[11.5px] font-extrabold text-primary-hover">
                {i + 1}
              </span>
              <span className="text-[13.5px] font-medium leading-[1.6] text-ink-700">
                <strong className="font-bold text-ink-900">{item.lead}</strong>
                {item.rest}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Satıcılar için */}
      <section className="mb-4 rounded-[18px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[19px] font-extrabold text-ink-900">
          Satıcılar İçin
        </h2>
        <div className="flex flex-col gap-3">
          {saticiIpuclari.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-soft text-[11.5px] font-extrabold text-accent-ink">
                {i + 1}
              </span>
              <span className="text-[13.5px] font-medium leading-[1.6] text-ink-700">
                <strong className="font-bold text-ink-900">{item.lead}</strong>
                {item.rest}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Kırmızı bayraklar */}
      <section className="rounded-[18px] border border-border bg-card p-6">
        <h2 className="mb-1 text-[19px] font-extrabold text-ink-900">
          Kırmızı Bayraklar
        </h2>
        <p className="mb-4 text-[12.5px] font-medium leading-[1.5] text-ink-400">
          Bunlardan birini görürsen işlemi durdur, sohbetteki &quot;Bildir&quot;
          bağlantısını kullan.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {kirmiziBayraklar.map((bayrak, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-[12px] bg-danger-soft px-3.5 py-3"
            >
              <span className="flex-none text-[13px] font-extrabold text-danger">
                ⚑
              </span>
              <span className="text-[12.5px] font-medium leading-[1.55] text-[#6e3a36]">
                {bayrak}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-[18px] text-[12.5px] font-medium leading-[1.55] text-ink-500">
          Şüpheli bir durumla karşılaştın mı?{" "}
          <Link href="/destek" className="font-bold">
            Destek talebi aç
          </Link>{" "}
          — Trust &amp; Safety ekibi 24 saat içinde inceler. Kurallar için{" "}
          <Link href="/ilan-kurallari" className="font-bold">
            İlan Kuralları
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
