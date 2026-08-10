"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

type Madde = { baslik: string; metin: ReactNode };
type Dokuman = { ad: string; ozet: string; maddeler: Madde[] };

const dokumanlar: Dokuman[] = [
  {
    ad: "Kullanıcı Sözleşmesi",
    ozet: "BulBana'yı kullanırken alıcı ve satıcı olarak hak ve yükümlülüklerin.",
    maddeler: [
      {
        baslik: "Tek hesap, iki rol",
        metin:
          "Her üyelik hem alıcı hem satıcı işlemleri için geçerlidir. Hesap bilgilerinin doğruluğundan üye sorumludur; kimlik doğrulaması yapılmamış hesaplarda bazı özellikler kısıtlanabilir.",
      },
      {
        baslik: "Ters pazar işleyişi",
        metin:
          "İlanlar alıcı tarafından tek fiyatla açılır. Satıcı sunumları yalnızca ilan sahibine gösterilir. Fiyat pazarlığı, teklif isteği sonrasında açılan sohbet üzerinden yürütülür.",
      },
      {
        baslik: "Komisyon",
        metin:
          "Üyelik, ilan, sunum, teklif ve pazarlık ücretsizdir. BulBana yalnızca gerçekleşen satışta, anlaşılan bedelin %4'ünü satış bedelinden düşerek komisyon olarak alır.",
      },
      {
        baslik: "Kargo yükümlülüğü",
        metin:
          "Ödemenin BulBana güvencesine (escrow) alınmasından itibaren satıcı ürünü 3 gün içinde kargoya vermek ve takip numarasını sohbete işlemekle yükümlüdür. Süre aşımında işlem iptal edilir ve güvencedeki ödeme alıcıya iade edilir.",
      },
      {
        baslik: "Yasaklı ürünler ve yaptırım",
        metin:
          "Sahte, çalıntı ya da mevzuata aykırı ürünlerin sunumu yasaktır. Sahtecilik ve dolandırıcılıkta kademeli yaptırım beklenmeden hesap kalıcı olarak kapatılır.",
      },
    ],
  },
  {
    ad: "KVKK Aydınlatma Metni",
    ozet: "Kişisel verilerinin hangi amaçla işlendiği ve haklarına dair özet bilgilendirme.",
    maddeler: [
      {
        baslik: "İşlenen veriler",
        metin:
          "Ad soyad, e-posta, teslimat adresi, işlem geçmişi ve platform içi mesajlaşma kayıtları; üyelik ve alım-satım süreçlerinin yürütülmesi amacıyla işlenir.",
      },
      {
        baslik: "İşleme amaçları",
        metin:
          "İlan-sunum eşleştirmesi, güvenli ödeme ve teslimat süreçleri, itiraz incelemeleri ve yasal yükümlülüklerin yerine getirilmesi.",
      },
      {
        baslik: "Aktarım",
        metin:
          "Veriler; ödeme kuruluşları, kargo firmaları ve yasal merciler dışında üçüncü taraflarla paylaşılmaz. Kart bilgileri BulBana sistemlerinde saklanmaz.",
      },
      {
        baslik: "Saklama süresi",
        metin:
          "Veriler, üyelik süresince ve yasal saklama yükümlülükleri kapsamında gerekli süre boyunca muhafaza edilir; sonrasında silinir ya da anonim hale getirilir.",
      },
      {
        baslik: "Hakların",
        metin:
          "KVKK madde 11 kapsamında verilerine erişme, düzeltme, silme ve işlemeye itiraz etme haklarına sahipsin. Başvurular destek@bulbana.com üzerinden alınır.",
      },
    ],
  },
  {
    ad: "Çerez Politikası",
    ozet: "Platformda kullanılan çerezler ve tercihlerini nasıl yöneteceğin.",
    maddeler: [
      {
        baslik: "Zorunlu çerezler",
        metin:
          "Oturum güvenliği, giriş durumu ve sepet/sohbet bütünlüğü için gereklidir; devre dışı bırakılamaz.",
      },
      {
        baslik: "Performans çerezleri",
        metin:
          "Sayfaların kullanım istatistiklerini anonim olarak ölçer; deneyimi iyileştirmek için kullanılır.",
      },
      {
        baslik: "Tercih çerezleri",
        metin:
          "Dil, konum ve filtre tercihlerini hatırlayarak tekrar eden ayarları azaltır.",
      },
      {
        baslik: "Tercih yönetimi",
        metin: (
          <>
            Çerez tercihlerini tarayıcı ayarlarından ya da{" "}
            <Link href="/ayarlar" className="font-bold">
              Hesap Ayarları
            </Link>
            &apos;ndaki Gizlilik bölümünden dilediğin zaman güncelleyebilirsin.
          </>
        ),
      },
    ],
  },
];

export function SozlesmelerDocs() {
  const [aktif, setAktif] = useState(0);
  const dokuman = dokumanlar[aktif];

  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sol doküman menüsü */}
      <aside className="flex flex-col gap-1 rounded-[16px] border border-border bg-card p-2.5 md:sticky md:top-[150px]">
        {dokumanlar.map((d, i) => {
          const active = i === aktif;
          return (
            <button
              key={d.ad}
              type="button"
              onClick={() => setAktif(i)}
              aria-current={active ? "true" : undefined}
              className={`cursor-pointer rounded-[10px] px-3.5 py-3 text-left text-[13px] leading-[1.3] transition-colors ${
                active
                  ? "bg-primary-soft font-bold text-primary-hover"
                  : "font-semibold text-ink-500 hover:bg-page"
              }`}
            >
              {d.ad}
            </button>
          );
        })}
      </aside>

      {/* Sağ içerik */}
      <section className="rounded-[18px] border border-border bg-card p-7">
        <h2 className="mb-1.5 text-[20px] font-extrabold leading-[1.2] text-ink-900">
          {dokuman.ad}
        </h2>
        <p className="mb-[18px] text-[12.5px] font-medium leading-[1.5] text-ink-400">
          {dokuman.ozet}
        </p>
        <div className="flex flex-col gap-3.5">
          {dokuman.maddeler.map((m, i) => (
            <div
              key={m.baslik}
              className="flex items-start gap-3 border-t border-hairline pt-3.5"
            >
              <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] bg-page text-[12px] font-extrabold text-primary-hover">
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-bold leading-[1.3] text-ink-900">
                  {m.baslik}
                </div>
                <p className="mt-1.5 text-pretty text-[13px] font-medium leading-[1.6] text-ink-700">
                  {m.metin}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[22px] rounded-[12px] bg-page px-4 py-3.5 text-[12px] font-medium leading-[1.55] text-ink-500">
          Sorular için{" "}
          <Link href="/yardim" className="font-bold">
            Yardım Merkezi
          </Link>
          &apos;ne başvurabilir ya da destek@bulbana.com adresine yazabilirsin.
        </div>
      </section>
    </div>
  );
}
