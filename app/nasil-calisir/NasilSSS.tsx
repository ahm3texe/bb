"use client";

import { useState } from "react";

const sorular = [
  {
    soru: "Neden ilanı alıcı açıyor?",
    cevap:
      "BulBana ters pazardır: bulunamayan, nadir ya da stoku bitmiş ürünlerde asıl kıt olan taleptir. Alıcı ne istediğini ve ödeyeceği fiyatı ilan eder; elinde o ürün olan satıcılar doğrudan gerçek bir müşteriyle karşılaşır.",
  },
  {
    soru: "Sunumumu kimler görebilir?",
    cevap:
      "Yalnızca ilan sahibi. Diğer satıcılar sunumunu, fotoğraflarını ve fiyat beklentini göremez — rekabet bilgin sana kalır. İlan sayfasında herkes yalnızca toplam sunum sayısını görür.",
  },
  {
    soru: "Pazarlık ya da revize teklif için ücret öder miyim?",
    cevap:
      "Hayır. Sunum göndermek, teklif vermek, revize teklif ve pazarlık tamamen ücretsizdir. BulBana yalnızca satış gerçekleşirse, anlaşılan fiyat üzerinden %4 komisyon alır.",
  },
  {
    soru: "Ürün anlatıldığı gibi çıkmazsa ne olur?",
    cevap:
      "Ödemen satıcıya geçmeden BulBana güvencesinde tutulduğu için itiraz başlatabilirsin. Destek ekibi sunum fotoğrafları ve sohbet kaydı üzerinden inceler; haklıysan ödemen iade edilir.",
  },
  {
    soru: "Komisyon kimden ve ne zaman alınır?",
    cevap:
      "Satıcıdan, yalnızca gerçekleşen satışta. Alıcı ürünü teslim alıp onayladığında, anlaşılan fiyatın %4'ü düşülür ve kalan tutar satıcıya aktarılır. Alıcı ek ücret ödemez.",
  },
];

export function NasilSSS() {
  const [acik, setAcik] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2.5">
      {sorular.map((s, i) => {
        const isAcik = acik === i;
        return (
          <div
            key={s.soru}
            className={`rounded-card bg-card ${
              isAcik ? "border-[1.5px] border-primary" : "border border-border"
            }`}
          >
            <button
              type="button"
              onClick={() => setAcik(isAcik ? null : i)}
              aria-expanded={isAcik}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="text-[14.5px] font-bold leading-snug text-ink-900">
                {s.soru}
              </span>
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                  isAcik
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary-hover"
                }`}
              >
                {isAcik ? "−" : "+"}
              </span>
            </button>
            {isAcik && (
              <p className="px-5 pb-4 text-[14px] font-medium leading-relaxed text-ink-700">
                {s.cevap}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
