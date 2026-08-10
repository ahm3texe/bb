import type { ReactNode } from "react";

type ChipVariant =
  | "muted" // category / condition — neutral grey pill
  | "violet" // informational (soft violet)
  | "lime" // positive / count (soft lime)
  | "dark" // en yüksek vurgu: koyu mor zemin + lime yazı
  | "acil" // seller signal: urgent (dark + lime, high emphasis)
  | "pazarlik" // seller signal: open to negotiate (soft lime)
  | "good"
  | "danger";

const variants: Record<ChipVariant, string> = {
  muted: "bg-page text-ink-500",
  violet: "bg-primary-soft text-primary-hover",
  lime: "bg-accent-soft text-accent-ink",
  dark: "bg-ink-900 text-accent",
  acil: "bg-danger-soft text-danger", // yumuşak kırmızı
  pazarlik: "bg-accent-soft text-accent-ink",
  good: "bg-accent-soft text-accent-ink",
  danger: "bg-danger-soft text-danger",
};

// "md" — okunurluk öncelikli yerlerde (profil kartı gibi) daha iri rozet.
const sizes = {
  sm: "px-[9px] py-[6px] text-[10.5px]",
  md: "px-[10px] py-[7px] text-[11.5px]",
} as const;

export function Chip({
  children,
  variant = "muted",
  size = "sm",
  className = "",
}: {
  children: ReactNode;
  variant?: ChipVariant;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold leading-none ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
