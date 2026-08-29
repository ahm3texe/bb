import Link from "next/link";
import Image from "next/image";
import { HeaderSearch } from "@/components/HeaderSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { MesajRozeti } from "@/components/MesajRozeti";
import { KategoriMenu } from "@/components/KategoriMenu";
import { MobileMenu } from "@/components/MobileMenu";
import { HesapMenu } from "@/components/HesapMenu";
import { ButtonLink } from "@/components/ui/Button";

// İkincil (kurumsal) linkler — nav'ın sağında.
const ikincilNav = [
  { label: "Nasıl Çalışır?", href: "/nasil-calisir" },
  { label: "Yardım/Sorular", href: "/yardim" },
  { label: "Hakkımızda", href: "/hakkimizda" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      {/* Üst satır — logo · arama · hesap */}
      <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-6 py-[18px] sm:gap-6">
        {/* MARKA KİLİDİ TEK PARÇA GÖRSEL.
            Önceden büyüteç PNG'si + HTML metniyle kuruluyordu: yazı tipi,
            harf aralığı ve slogan burada elle taklit ediliyordu, marka
            dosyası değişince ikisi ayrışıyordu. Artık tek SVG — hem keskin
            hem tek kaynak (public/logo.svg). Mobilde biraz küçülür, oran
            (1200×320) korunur. */}
        <Link href="/" className="flex flex-none items-center">
          <Image
            src="/logo.svg"
            alt="bulbana — sen iste, satıcı bulsun"
            width={1200}
            height={320}
            className="block h-10 w-auto sm:h-[52px]"
            priority
          />
        </Link>

        {/* Arama MOBİLDE ALT SATIRA iner.
            375px'te logo ve üç ikonla aynı satırda `flex-1` olarak
            duruyordu: forma 72px, input'a 11px kalıyordu — büyüteç ikonu ve
            iki karakterlik bir alan. Yani telefondan arama fiilen
            kullanılamıyordu. */}
        <div className="hidden flex-1 sm:flex">
          <HeaderSearch />
        </div>

        <div className="ml-auto flex flex-none items-center gap-2.5 sm:gap-3.5">
          <NotificationBell />
          <MesajRozeti />
          <HesapMenu />
          <div className="hidden md:block">
            <ButtonLink href="/ilan-ac" variant="primary" size="lg">
              + Aradığını İlan Et
            </ButtonLink>
          </div>
          <MobileMenu />
        </div>
      </div>

      {/* Arama satırı — yalnızca mobil */}
      <div className="mx-auto flex max-w-[1180px] px-6 pb-3.5 sm:hidden">
        <HeaderSearch />
      </div>

      {/* Alt satır — gezinme (masaüstü) */}
      <div className="hidden border-t border-hairline md:block">
        <nav className="mx-auto flex max-w-[1180px] items-center gap-7 px-6 py-3">
          <KategoriMenu />
          <Link
            href="/kesfet"
            className="text-[14.5px] font-semibold text-ink-900 hover:text-primary"
          >
            Talepleri Keşfet
          </Link>

          <div className="ml-auto flex items-center gap-6">
            {ikincilNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[13.5px] font-semibold text-ink-500 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
