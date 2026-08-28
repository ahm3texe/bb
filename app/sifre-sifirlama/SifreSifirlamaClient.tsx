"use client";

import { useState } from "react";
import Link from "next/link";

const inputCls =
  "w-full box-border rounded-control border-[1.5px] border-border-input px-3.5 py-3 text-[13.5px] font-semibold text-ink-900 outline-none focus:border-primary";

function BrandLogo() {
  return (
    <Link href="/" className="mb-[26px] flex items-center gap-2.5 no-underline">
      <span className="flex h-[42px] w-10 items-center justify-center rounded-[10px] bg-primary text-[20px] font-extrabold text-white">
        b
      </span>
      <span>
        <span className="block text-2xl font-extrabold leading-none tracking-[-0.5px] text-ink-900">
          bul<span className="text-primary">bana</span>
        </span>
        <span className="mt-[3px] block text-[9.5px] font-semibold tracking-[0.8px] text-ink-400">
          SEN İSTE, SATICI BULSUN
        </span>
      </span>
    </Link>
  );
}

/**
 * Parola sıfırlama.
 *
 * BU SAYFA TAMAMEN SAHTEYDİ: 231 satır, sıfır sunucu çağrısı. Giriş
 * ekranındaki "Şifremi unuttum" buraya götürüyordu ama parolasını unutan
 * kullanıcının hesabına dönmesinin hiçbir yolu yoktu.
 *
 * Kimlik KULLANICI ADIYLA sorulur, e-postayla değil: giriş de kullanıcı
 * adıyla yapılıyor ve iki farklı tanımlayıcı kullanmak kafa karıştırırdı.
 * Kod, hesabın doğrulanmış e-posta adresine gider.
 */
export function SifreSifirlamaClient() {
  const [adim, setAdim] = useState<1 | 2 | 3>(1);
  const [kullanici, setKullanici] = useState("");
  const [kod, setKod] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [isliyor, setIsliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");

  const adOk = kullanici.trim().length >= 3;
  const eslesir = p1.length >= 8 && p1 === p2;
  const uyusmuyor = p2.length >= 8 && p1 !== p2;

  const bar = (n: number) =>
    adim > n ? "bg-primary" : adim === n ? "bg-accent" : "bg-border-input";

  const primaryBtn =
    "w-full rounded-control py-[15px] text-[14.5px] font-extrabold cursor-pointer bg-primary text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-[#efebf5] disabled:text-ink-300";

  async function koduIste() {
    if (!adOk || isliyor) return;
    setIsliyor(true);
    setHata("");
    try {
      const r = await fetch("/api/sifre-sifirlama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kullanici: kullanici.trim() }),
      });
      const v = (await r.json().catch(() => ({}))) as {
        hata?: string;
        mesaj?: string;
      };
      if (!r.ok) {
        setHata(v.hata ?? "Kod gönderilemedi.");
        return;
      }
      // Yanıt hesabın var olup olmadığını SÖYLEMEZ — bu bilinçli.
      setBilgi(v.mesaj ?? "");
      setAdim(2);
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setIsliyor(false);
    }
  }

  async function parolayiSifirla() {
    if (!kod.trim() || !eslesir || isliyor) return;
    setIsliyor(true);
    setHata("");
    try {
      const r = await fetch("/api/sifre-sifirlama", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kullanici: kullanici.trim(),
          token: kod.trim(),
          yeni: p1,
        }),
      });
      const v = (await r.json().catch(() => ({}))) as { hata?: string };
      if (!r.ok) {
        setHata(v.hata ?? "Parola sıfırlanamadı.");
        return;
      }
      setAdim(3);
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setIsliyor(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col items-center px-6 py-12">
      <BrandLogo />

      <div className="w-full rounded-panel border border-border bg-card p-[26px]">
        <div className="mb-5 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${bar(n)}`} />
          ))}
        </div>

        {adim === 1 && (
          <>
            <h1 className="text-[20px] font-extrabold leading-tight text-ink-900">
              Parolanı sıfırla
            </h1>
            <p className="mb-3 mt-2 text-[13px] font-medium leading-relaxed text-ink-500">
              Kullanıcı adını gir; hesabının doğrulanmış e-posta adresine tek
              kullanımlık bir kod çıkaralım.
            </p>
            {/* PROTOTİP UYARISI: gerçek gönderim yok, kod e-posta
                kuyruğuna yazılıyor (bkz. lib/eposta.ts). Bunu söylemezsek
                parolasını unutan kullanıcı gelen kutusunu bekler. */}
            <p
              role="note"
              className="mb-4 rounded-xl bg-primary-soft px-3.5 py-2.5 text-[12px] font-semibold leading-[1.5] text-primary-hover"
            >
              Prototip: e-posta gönderimi henüz bağlı değil. Kod gelen kutuna
              düşmez; e-posta kuyruğuna yazılır ve destek ekibi oradan iletir.
            </p>
            <label className="mb-1.5 block text-[12.5px] font-bold text-ink-900" htmlFor="ss-kullanici">
              Kullanıcı adı
            </label>
            <input
              id="ss-kullanici"
              autoComplete="username"
              value={kullanici}
              onChange={(e) => setKullanici(e.target.value.slice(0, 60))}
              placeholder="ornek: melih.k"
              className={inputCls}
            />
            <button
              type="button"
              disabled={!adOk || isliyor}
              onClick={koduIste}
              className={`${primaryBtn} mt-4`}
            >
              {isliyor ? "Gönderiliyor…" : "Kod Gönder"}
            </button>
          </>
        )}

        {adim === 2 && (
          <>
            <h1 className="text-[20px] font-extrabold leading-tight text-ink-900">
              Kodu gir ve yeni parolanı belirle
            </h1>
            {bilgi && (
              <p className="mb-4 mt-2 rounded-control bg-primary-soft px-3.5 py-2.5 text-[12.5px] font-semibold leading-relaxed text-primary-hover">
                {bilgi}
              </p>
            )}

            <label className="mb-1.5 block text-[12.5px] font-bold text-ink-900" htmlFor="ss-kod">
              Sıfırlama kodu
            </label>
            <input
              id="ss-kod"
              value={kod}
              onChange={(e) => setKod(e.target.value.slice(0, 80))}
              placeholder="Sıfırlama kodu"
              className={`${inputCls} font-mono`}
            />

            <label className="mb-1.5 mt-3.5 block text-[12.5px] font-bold text-ink-900" htmlFor="ss-p1">
              Yeni parola
            </label>
            <input
              id="ss-p1"
              type="password"
              autoComplete="new-password"
              value={p1}
              onChange={(e) => setP1(e.target.value.slice(0, 200))}
              placeholder="En az 8 karakter"
              className={inputCls}
            />

            <label className="mb-1.5 mt-3.5 block text-[12.5px] font-bold text-ink-900" htmlFor="ss-p2">
              Yeni parola (tekrar)
            </label>
            <input
              id="ss-p2"
              type="password"
              autoComplete="new-password"
              value={p2}
              onChange={(e) => setP2(e.target.value.slice(0, 200))}
              className={inputCls}
            />
            {uyusmuyor && (
              <p className="mt-1.5 text-[12px] font-bold text-danger">
                Parolalar eşleşmiyor.
              </p>
            )}

            <button
              type="button"
              disabled={!kod.trim() || !eslesir || isliyor}
              onClick={parolayiSifirla}
              className={`${primaryBtn} mt-4`}
            >
              {isliyor ? "Sıfırlanıyor…" : "Parolayı Sıfırla"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdim(1);
                setHata("");
              }}
              className="mt-2.5 w-full cursor-pointer text-[12.5px] font-semibold text-ink-400 hover:text-primary"
            >
              ‹ Kullanıcı adını değiştir
            </button>
          </>
        )}

        {adim === 3 && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-extrabold text-ink-900">
              ✓
            </div>
            <h1 className="mt-4 text-center text-[20px] font-extrabold leading-tight text-ink-900">
              Parolan güncellendi
            </h1>
            <p className="mb-4 mt-2 text-center text-[13px] font-medium leading-relaxed text-ink-500">
              Yeni parolanla giriş yapabilirsin.
            </p>
            <Link
              href="/giris"
              className="block w-full rounded-control bg-primary py-[15px] text-center text-[14.5px] font-extrabold text-white hover:bg-primary-hover"
            >
              Giriş Yap
            </Link>
          </>
        )}

        {hata && (
          <p role="alert" className="mt-3 text-[12.5px] font-bold text-danger">
            {hata}
          </p>
        )}
      </div>

      <p className="mt-5 text-center text-[12.5px] font-medium leading-relaxed text-ink-400">
        Hesabında doğrulanmış e-posta yoksa kod gönderilemez.{" "}
        <Link href="/destek" className="font-bold text-primary">
          Destek ekibine yaz
        </Link>
        .
      </p>
    </main>
  );
}
