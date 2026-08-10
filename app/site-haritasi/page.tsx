import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Site Haritası",
  description:
    "BulBana'nın tüm ekranları, kullanıcı yolculuğu sırasına göre gruplanmış tıklanabilir bir hub.",
};

type Kart = { href: string; ad: string; aciklama: string; ok?: boolean };
type Grup = {
  no: string;
  baslik: string;
  altbaslik?: string;
  renk: string;
  kartlar: Kart[];
};

const gruplar: Grup[] = [
  {
    no: "1",
    baslik: "Keşif & Katılım",
    renk: "bg-primary text-white",
    kartlar: [
      {
        href: "/",
        ad: "Ana Sayfa",
        aciklama: "Hero, kategoriler, güncel talepler, değer önerisi",
      },
      {
        href: "/giris",
        ad: "Giriş / Kayıt",
        aciklama: "Tek hesap: hem al, hem sat",
      },
      {
        href: "/sifre-sifirlama",
        ad: "Şifre Sıfırlama",
        aciklama: "E-posta → OTP → yeni şifre",
      },
      {
        href: "/hos-geldin",
        ad: "Hoş Geldin (Onboarding)",
        aciklama: "Rol + ilgi alanı seçimi",
      },
    ],
  },
  {
    no: "2",
    baslik: "Alıcı Yolculuğu",
    altbaslik: "ilan aç → sunumları incele → teklif iste → anlaş → öde → onayla",
    renk: "bg-primary text-white",
    kartlar: [
      {
        href: "/ilan-ac",
        ad: "İlan Aç",
        aciklama: "4 adımlı talep formu + önizleme",
        ok: true,
      },
      {
        href: "/ilan/dawn-fm-imzali-cd",
        ad: "İlan Sayfası",
        aciklama: "Çift görünüm: satıcı + ilan sahibi, sunum modali",
        ok: true,
      },
      {
        href: "/sunum-detay",
        ad: "Sunum Detay",
        aciklama: "Galeri + video + satıcı güven kartı",
        ok: true,
      },
      {
        href: "/sunum-karsilastirma",
        ad: "Sunum Karşılaştırma",
        aciklama: "3 sunum yan yana, \"En iyi\" rozetleri",
        ok: true,
      },
      {
        href: "/mesajlar",
        ad: "Mesajlar / Pazarlık",
        aciklama: "Teklif kartları, kabul/revize/reddet, kargo alanı",
        ok: true,
      },
      {
        href: "/siparis",
        ad: "Sipariş / Satış Takibi",
        aciklama: "Çift görünüm: ödeme→onay / kargola→tahsilat",
        ok: true,
      },
      {
        href: "/itiraz",
        ad: "İtiraz / İade",
        aciklama: "Kanıt yükleme + süreç takibi",
      },
      {
        href: "/ilan-yonetimi",
        ad: "İlan Yönetimi",
        aciklama: "Görüntülenme grafiği, huni, süre uzat/duraklat",
      },
    ],
  },
  {
    no: "3",
    baslik: "Satıcı Yolculuğu",
    altbaslik: "talebi bul → sunum gönder → teklif ver → kargola → kazan",
    renk: "bg-accent text-ink-900",
    kartlar: [
      {
        href: "/kesfet",
        ad: "Talepleri Keşfet",
        aciklama: "Filtreli talep listesi, kart formatı tweaki",
        ok: true,
      },
      {
        href: "/talep-alarmlari",
        ad: "Talep Alarmları",
        aciklama: "Kayıtlı arama + eşleşme bildirimi",
        ok: true,
      },
      {
        href: "/satici-performansi",
        ad: "Satıcı Performansı",
        aciklama: "Sunum→satış hunisi, kazanç grafiği, seviye",
      },
      {
        href: "/satici-profili",
        ad: "Satıcı Profili (herkese açık)",
        aciklama: "Puan dağılımı, değerlendirmeler, açık talepler",
      },
    ],
  },
  {
    no: "4",
    baslik: "Hesap & Para",
    renk: "bg-ink-900 text-white",
    kartlar: [
      {
        href: "/profil",
        ad: "Profilim",
        aciklama: "Taleplerim · Sunumlarım · Takip Ettiklerim · Değerlendirmeler",
      },
      {
        href: "/cuzdan",
        ad: "Cüzdan",
        aciklama: "Bakiye, komisyon dökümü, IBAN çekim",
      },
      {
        href: "/bildirimler",
        ad: "Bildirimler",
        aciklama: "Sunum, teklif, kargo, sistem bildirimleri",
      },
      {
        href: "/ayarlar",
        ad: "Ayarlar",
        aciklama: "Hesap, adresler, kartlar, bildirim tercihleri",
      },
      {
        href: "/kimlik-dogrulama",
        ad: "Kimlik Doğrulama (KYC)",
        aciklama: "Belge + selfie ile doğrulama rozeti",
      },
      {
        href: "/davet-et",
        ad: "Davet Et",
        aciklama: "Referans programı: %2 komisyon hakkı",
      },
    ],
  },
  {
    no: "5",
    baslik: "Destek, Güven & Kurumsal",
    renk: "bg-ink-400 text-white",
    kartlar: [
      {
        href: "/nasil-calisir",
        ad: "Nasıl Çalışır?",
        aciklama: "Ters pazar modeli + %4 komisyon",
      },
      {
        href: "/yardim",
        ad: "Yardım Merkezi",
        aciklama: "SSS + kategori bazlı makaleler",
      },
      {
        href: "/destek",
        ad: "Destek Talebi",
        aciklama: "Form + açık talepler listesi",
      },
      {
        href: "/guvenli-alisveris",
        ad: "Güvenli Alışveriş",
        aciklama: "Altın kural + kırmızı bayraklar",
      },
      {
        href: "/ilan-kurallari",
        ad: "İlan Kuralları",
        aciklama: "Yasaklı ürünler + yaptırım kademeleri",
      },
      {
        href: "/sozlesmeler",
        ad: "Sözleşmeler",
        aciklama: "Kullanıcı sözleşmesi, KVKK, çerez",
      },
      {
        href: "/hakkimizda",
        ad: "Hakkımızda",
        aciklama: "Vizyon, ekip, iletişim",
      },
    ],
  },
];

export default function SiteHaritasiPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-14 pt-[26px]">
      <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-[-0.8px] text-ink-900">
        Site Haritası
      </h1>
      <p className="mb-[26px] mt-2 max-w-[660px] text-pretty text-sm font-medium leading-relaxed text-ink-500">
        Tüm ekranlar, kullanıcı yolculuğu sırasına göre. Karta tıklayarak ekrana
        git; ok işaretleri ana akış yönünü gösterir.
      </p>

      {gruplar.map((g) => (
        <section key={g.no} className="mb-[26px] last:mb-0">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[12.5px] font-extrabold ${g.renk}`}
            >
              {g.no}
            </span>
            <h2 className="text-[17px] font-extrabold text-ink-900">
              {g.baslik}
            </h2>
            {g.altbaslik && (
              <span className="text-xs font-medium text-ink-400">
                {g.altbaslik}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {g.kartlar.map((k) => (
              <Link
                key={k.href + k.ad}
                href={k.href}
                className="block rounded-[14px] border border-border bg-card p-[15px] no-underline hover:border-primary"
              >
                <div className="text-[13.5px] font-bold leading-snug text-ink-900">
                  {k.ad}{" "}
                  {k.ok && <span className="text-ink-300">→</span>}
                </div>
                <div className="mt-[5px] text-[11.5px] font-medium leading-normal text-ink-400">
                  {k.aciklama}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
