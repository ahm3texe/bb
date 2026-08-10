import Link from "next/link";
import Image from "next/image";

type Col = { title: string; links: { label: string; href: string }[] };

const columns: Col[] = [
  {
    title: "Pazar Yeri",
    links: [
      { label: "Talepleri keşfet", href: "/kesfet" },
      { label: "Aradığını ilan et", href: "/ilan-ac" },
      { label: "Nasıl çalışır?", href: "/nasil-calisir" },
      { label: "%4 komisyon modeli", href: "/nasil-calisir#komisyon" },
    ],
  },
  {
    title: "Hesap",
    links: [
      { label: "Profilim", href: "/profil" },
      { label: "Bildirimler", href: "/bildirimler" },
      { label: "Mesajlar", href: "/mesajlar" },
      { label: "Hesap ayarları", href: "/ayarlar" },
      { label: "Giriş / Kayıt", href: "/giris" },
    ],
  },
  {
    title: "Destek & Kurumsal",
    links: [
      { label: "Hakkımızda", href: "/hakkimizda" },
      { label: "Yardım merkezi", href: "/yardim" },
      { label: "Güvenli alışveriş", href: "/guvenli-alisveris" },
      { label: "Kullanıcı sözleşmesi", href: "/sozlesmeler" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-8 bg-footer text-white">
      <div className="mx-auto max-w-[1180px] px-6 pt-12">
        <div className="grid gap-9 border-b border-footer-line pb-9 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-white">
                <Image
                  src="/logo.png"
                  alt=""
                  width={26}
                  height={28}
                  className="block"
                />
              </div>
              <div className="leading-none">
                <div className="text-xl font-extrabold">
                  bul<span className="text-[#a78bfa]">bana</span>
                </div>
                <div className="mt-[3px] text-[9px] font-semibold tracking-[0.8px] text-[#8b7bb0]">
                  SEN İSTE, SATICI BULSUN
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-[280px] text-[12.5px] font-medium leading-relaxed text-[#b4a8d6]">
              Türkiye&apos;nin ters pazar platformu: Talebi alıcı oluşturur,
              satıcılar ise uygun ürünleriyle doğrudan teklif sunar.
            </p>
            <div className="mt-3.5 text-[12px] font-semibold leading-relaxed text-[#8b7bb0]">
              İstanbul, Türkiye
              <br />
              destek@bulbana.com
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-[11px]">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[1.4px] text-[#8b7bb0]">
                {col.title}
              </div>
              {col.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[13px] font-medium text-[#d9d2ea] hover:text-white hover:underline"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-6 text-[12px] text-[#8b7bb0]">
          <span>© 2026 BulBana Teknoloji A.Ş. — Tüm hakları saklıdır.</span>
          <span className="text-[11.5px] font-semibold">
            Ödemeler 256-bit SSL ile korunur · Alıcı onayına kadar BulBana
            güvencesinde
          </span>
        </div>
      </div>
    </footer>
  );
}
