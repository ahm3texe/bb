import Link from "next/link";

/** Varsayılan aktif sekme rengi: patlıcan moru dolgu, beyaz yazı. */
const AKTIF_VARSAYILAN = "bg-ink-900 text-white";

const items: { label: string; href: string; aktifCls?: string }[] = [
  { label: "Profilim", href: "/profil" },
  { label: "Mali Tablom", href: "/cuzdan" },
  { label: "Aldıklarım", href: "/aldiklarim" },
  // Satış tarafı yeşille anılır — aktifken lime dolgu, patlıcan moru yazı.
  { label: "Sattıklarım", href: "/sattiklarim", aktifCls: "bg-accent text-footer" },
];

/**
 * Hesap sayfaları arası ortak üst menü
 * (Profilim · Mali Tablom · Aldıklarım · Sattıklarım).
 */
export function HesapNav({ active }: { active: string }) {
  return (
    <nav className="mb-5 flex flex-wrap gap-1.5">
      {items.map((n) => {
        const isActive = n.href === active;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-[15px] py-[10px] text-[13px] font-bold transition-colors ${
              isActive
                ? (n.aktifCls ?? AKTIF_VARSAYILAN)
                : "bg-card text-ink-500 ring-1 ring-inset ring-border hover:text-primary"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
