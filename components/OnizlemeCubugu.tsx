"use client";

import { useEffect, useState } from "react";

type Hesap = { kullanici: string; ad: string; harf: string };

/**
 * ÖNİZLEME ÇUBUĞU — geçici geliştirme aracı.
 *
 * Prototipi alıcı ve satıcı gözünden hızlıca denemek için, parola sormadan
 * demo hesapları arasında geçiş yaptırır. Yalnızca
 * `BULBANA_ONIZLEME_GECISI=1` iken render edilir.
 *
 * ÇUBUK BİLEREK GÖRÜNÜR VE ÇİRKİN. Sarı zemin ve "ÖNİZLEME" etiketi
 * kazara üretime çıkmasını zorlaştırmak için: parola sormadan oturum veren
 * bir kısayolun sessizce yaşaması, kaldırdığımız hesap değiştirici açığının
 * geri gelmesi demek olurdu.
 */
export function OnizlemeCubugu({ aktif }: { aktif: string | null }) {
  const [hesaplar, setHesaplar] = useState<Hesap[]>([]);
  const [isliyor, setIsliyor] = useState("");
  const [kapali, setKapali] = useState(false);

  useEffect(() => {
    let iptal = false;
    fetch("/api/oturum/gecis")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: { hesaplar?: Hesap[] } | null) => {
        if (!iptal && v?.hesaplar) setHesaplar(v.hesaplar);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, []);

  async function gec(kullanici: string) {
    if (isliyor) return;
    setIsliyor(kullanici);
    try {
      const r = await fetch("/api/oturum/gecis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kullanici }),
      });
      if (!r.ok) {
        setIsliyor("");
        return;
      }
      // Tam sayfa yüklemesi: oturum kök yerleşimde sunucuda çözülüyor,
      // istemci yönlendirmesi yerleşimi önbellekten alırdı.
      window.location.reload();
    } catch {
      setIsliyor("");
    }
  }

  async function cik() {
    if (isliyor) return;
    setIsliyor("cikis");
    try {
      await fetch("/api/oturum", { method: "DELETE" });
      window.location.reload();
    } catch {
      setIsliyor("");
    }
  }

  if (!hesaplar.length) return null;

  if (kapali)
    return (
      <button
        type="button"
        onClick={() => setKapali(false)}
        aria-label="Önizleme çubuğunu aç"
        className="fixed bottom-3 left-3 z-[90] rounded-full bg-[#b45309] px-3 py-2 text-[11px] font-extrabold text-white shadow-lg"
      >
        ÖNİZLEME
      </button>
    );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] flex flex-wrap items-center gap-2 border-t-2 border-[#b45309] bg-[#fef3c7] px-3 py-2 text-ink-900 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
      <span className="rounded bg-[#b45309] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white">
        Önizleme
      </span>
      <span className="text-[11.5px] font-semibold">
        Parolasız hesap geçişi açık — üretimde kapatılmalı.
      </span>

      <span className="mx-1 h-4 w-px bg-[#b45309]/40" aria-hidden />

      {hesaplar.map((h) => {
        const secili = h.kullanici === aktif;
        return (
          <button
            key={h.kullanici}
            type="button"
            disabled={isliyor !== "" || secili}
            onClick={() => gec(h.kullanici)}
            title={h.ad}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold transition-colors disabled:cursor-default ${
              secili
                ? "bg-[#b45309] text-white"
                : "bg-white text-ink-900 hover:bg-[#fde68a]"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[8.5px] font-extrabold ${
                secili ? "bg-white text-[#b45309]" : "bg-[#b45309] text-white"
              }`}
            >
              {h.harf}
            </span>
            {h.kullanici}
            {secili && " ✓"}
          </button>
        );
      })}

      <button
        type="button"
        disabled={isliyor !== ""}
        onClick={cik}
        className="rounded-full bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-ink-900 hover:bg-[#fde68a] disabled:cursor-default"
      >
        Çıkış (ziyaretçi)
      </button>

      <button
        type="button"
        onClick={() => setKapali(true)}
        aria-label="Önizleme çubuğunu gizle"
        className="ml-auto rounded-full px-2 py-1 text-[13px] font-bold text-[#b45309] hover:bg-[#fde68a]"
      >
        ×
      </button>
    </div>
  );
}
