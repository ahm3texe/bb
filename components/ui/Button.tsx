import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant =
  | "primary"
  | "secondary"
  | "sellerOutline"
  | "lime"
  | "eggplant"
  | "danger"
  | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-bold leading-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary:
    "bg-card text-ink-900 border border-border-input hover:border-primary hover:text-primary",
  // Satıcı yönlü ikincil buton — yeşil (satıcı=yeşil eşlemesi).
  sellerOutline:
    "bg-accent-soft text-accent-ink border border-accent hover:border-accent-ink hover:brightness-95",
  lime: "bg-accent text-ink-900 hover:brightness-95",
  // Footer ile aynı patlıcan moru — ağır/kapanış eylemleri için.
  eggplant: "bg-footer text-white hover:bg-footer-line",
  danger:
    "bg-card text-danger border border-danger-line hover:bg-danger-soft",
  ghost: "bg-transparent text-ink-500 hover:text-ink-900",
};

const sizes: Record<Size, string> = {
  sm: "px-[14px] py-[9px] text-[13px]",
  md: "px-[18px] py-3 text-sm",
  lg: "px-6 py-[15px] text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${buttonClass(variant, size)} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: BaseProps & { href: string }) {
  return (
    <Link href={href} className={`${buttonClass(variant, size)} ${className}`}>
      {children}
    </Link>
  );
}
