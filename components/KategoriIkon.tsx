// Kategori rozetleri için elle çizilmiş, marka renkleriyle uyumlu ikon seti.
// Her ikon aynı görsel imzayı taşır: lacivert (ink-900) çizgi + lime (accent) çapraz vurgu.

type IkonProps = { className?: string };

function Elektronik({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="5" width="16" height="11" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 7H11L6.5 11.5V7Z" className="fill-accent-hover" />
      <path
        d="M2 17.5h20l-1.1 1.8a1.3 1.3 0 0 1-1.1.7H4.2a1.3 1.3 0 0 1-1.1-.7L2 17.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KitapDergi({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 6.5C10.5 5.3 8 4.8 4.5 5.2V17c3.3-.5 5.8 0 7.5 1.3C13.7 17 16.2 16.5 19.5 17V5.2c-3.5-.4-6 .1-7.5 1.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 6.5v11.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.3" y="15.6" width="1.7" height="3.6" className="fill-accent-hover" />
    </svg>
  );
}

function GiyimAksesuar({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8.5 4 5 6.2 3 9l2.5 1.6 1-1V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9.4l1 1L21 9l-2-2.8L15.5 4c-.6 1-1.9 1.7-3.5 1.7S9.1 5 8.5 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.2 8H11.5L8.2 11.3V8Z" className="fill-accent-hover" />
    </svg>
  );
}

function EvYasam({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4.5 13V9.8a1.4 1.4 0 0 1 2.8 0V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16.7 13V9.8a1.4 1.4 0 0 1 2.8 0V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M4.5 13h15v2.9a1.3 1.3 0 0 1-1.3 1.3H5.8a1.3 1.3 0 0 1-1.3-1.3V13Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M4.8 17.2v2.3M19.2 17.2v2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6.6" y="10.8" width="4.3" height="3.4" rx="0.9" className="fill-accent-hover" />
    </svg>
  );
}

function MuzikPlak({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* plak (arkada) */}
      <circle cx="9" cy="14.3" r="7.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="14.3" r="5.3" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="9" cy="14.3" r="3.5" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="9" cy="14.3" r="1.9" className="fill-accent-hover" />
      <circle cx="9" cy="14.3" r="0.6" fill="currentColor" />
      {/* cd (önde) */}
      <circle cx="16.4" cy="7.6" r="5.2" className="fill-primary-soft" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.4" cy="7.6" r="1.4" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="16.4" cy="7.6" r="0.6" fill="currentColor" />
      <path d="M13.7 5.3 17.5 4 18.9 6.6 15.1 8Z" className="fill-accent-hover" />
    </svg>
  );
}

function OyunKonsol({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6.5 8.5h11a3.2 3.2 0 0 1 3.1 3.9l-.7 3a2.2 2.2 0 0 1-3.8 1L15 15H9l-1.1 1.4a2.2 2.2 0 0 1-3.8-1l-.7-3a3.2 3.2 0 0 1 3.1-3.9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.5 11v2.4M7.3 12.2h2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="16.5" cy="11.3" r="0.85" className="fill-accent-hover" />
      <circle cx="14.7" cy="13" r="0.85" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function Saat({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 4.5h6l.6 3.1H8.4L9 4.5ZM9 19.5h6l.6-3.1H8.4L9 19.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 9.2v2.8l1.9 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.4 8.4 11 11H8.4V8.4Z" className="fill-accent-hover" />
    </svg>
  );
}

function Koleksiyon({ className }: IkonProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8 5h8v3.4a4 4 0 0 1-8 0V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.3H6.1a1.6 1.6 0 0 0 0 3.2H8M16 6.3h1.9a1.6 1.6 0 0 1 0 3.2H16"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 12.4v2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M9.6 19.3h4.8l-.55-1.9a1 1 0 0 0-.96-.72h-2.8a1 1 0 0 0-.96.72l-.55 1.9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 5h3.6L8 8.6V5Z" className="fill-accent-hover" />
    </svg>
  );
}

export const kategoriIkonlar: Record<string, (props: IkonProps) => React.JSX.Element> = {
  "Elektronik": Elektronik,
  "Kitap & Dergi": KitapDergi,
  "Giyim & Aksesuar": GiyimAksesuar,
  "Ev & Yaşam": EvYasam,
  "Müzik & Plak": MuzikPlak,
  "Oyun & Konsol": OyunKonsol,
  "Saat": Saat,
  "Koleksiyon": Koleksiyon,
};
