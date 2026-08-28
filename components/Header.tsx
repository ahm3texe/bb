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
        <Link href="/" className="flex flex-none items-center gap-3">
          <Image
            src="/logo.png"
            alt=""
            width={46}
            height={48}
            className="block h-[46px] w-[46px]"
            priority
          />
          <span className="leading-none">
            <span className="block text-[23px] font-extrabold tracking-[-0.5px] text-ink-900 sm:text-[26px]">
              bul<span className="text-primary">bana</span>
            </span>
            <span className="mt-1 hidden text-[10.5px] font-semibold tracking-[0.9px] text-ink-400 sm:block">
              SEN İSTE, SATICI BULSUN
            </span>
          </span>
        </Link>

        <HeaderSearch />

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
