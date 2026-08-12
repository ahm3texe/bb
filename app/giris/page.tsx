"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Sekme = "giris" | "kayit";
type Done = null | "giris" | "kayit";

const emailOk = (e: string) => e.includes("@") && e.includes(".") && e.length >= 6;

// Ortak stiller
const inputCls =
  "w-full box-border rounded-xl border border-border-input bg-white px-4 py-2.5 text-[14px] font-medium text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary focus:ring-4 focus:ring-primary/10";
const labelCls = "mb-1.5 block text-[12.5px] font-semibold text-ink-700";
const sosyalBtn =
  "flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-border-input bg-white py-2.5 text-[13.5px] font-semibold text-ink-900 transition-colors hover:bg-page";

// Resmi marka logoları (inline SVG — dış kaynak yüklemeden).
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px] flex-none" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      viewBox="0 0 384 512"
      className="h-[18px] w-[18px] flex-none text-ink-900"
      fill="currentColor"
      aria-hidden
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export default function GirisPage() {
  const [sekme, setSekme] = useState<Sekme>("giris");
  const [gEmail, setGEmail] = useState("");
  const [gPw, setGPw] = useState("");
  const [kAd, setKAd] = useState("");
  const [kEmail, setKEmail] = useState("");
  const [kPw, setKPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [kosul, setKosul] = useState(false);
  const [sosyal, setSosyal] = useState("");
  const [done, setDone] = useState<Done>(null);

  const girisOk = emailOk(gEmail.trim()) && gPw.length >= 6;
  const kPwOk = kPw.length >= 8;
  const kayitOk =
    kAd.trim().length >= 3 && emailOk(kEmail.trim()) && kPwOk && kosul;
  const pwType = showPw ? "text" : "password";
  const pwBtn = showPw ? "Gizle" : "Göster";

  const primaryBtn = (ok: boolean) =>
    `w-full rounded-xl py-3 text-[14.5px] font-bold transition-colors ${
      ok
        ? "cursor-pointer bg-primary text-white shadow-[0_6px_16px_-6px_rgb(124_58_237/0.5)] hover:bg-primary-hover"
        : "cursor-not-allowed bg-[#efebf5] text-ink-300"
    }`;

  function gecis(s: Sekme) {
    setSekme(s);
    setSosyal("");
    setShowPw(false);
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center self-stretch overflow-hidden bg-page px-6">
      {/* Arka plan: çok hafif marka parıltısı */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[90px]"
      />

      {/* Logo */}
      <Link href="/" className="mt-[3vh] flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white shadow-[0_2px_10px_rgb(46_26_71/0.08)]">
          <Image
            src="/logo.png"
            alt=""
            width={24}
            height={25}
            className="block h-auto w-6"
          />
        </span>
        <span className="text-[19px] font-extrabold leading-none tracking-[-0.4px] text-ink-900">
          bul<span className="text-primary">bana</span>
        </span>
      </Link>

      {done === null && (
        <div
          key={sekme}
          className="animate-step-in relative mt-5 w-[420px] max-w-full rounded-2xl border border-border bg-white p-6 shadow-[0_2px_4px_rgb(46_26_71/0.03),0_24px_48px_-24px_rgb(46_26_71/0.22)]"
        >
          <h1 className="text-center text-[21px] font-extrabold leading-tight tracking-[-0.3px] text-ink-900">
            {sekme === "giris" ? "Hesabına giriş yap" : "Hesabını oluştur"}
          </h1>
          <p className="mt-1.5 text-center text-[13px] font-medium text-ink-400">
            {sekme === "giris"
              ? "Taleplerini ve sunumlarını yönet."
              : "Ücretsiz — komisyon yalnızca gerçekleşen satıştan."}
          </p>

          {/* Sosyal girişler önde — kurumsal standart */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSosyal("Google")}
              className={sosyalBtn}
            >
              <GoogleIcon />
              Google ile devam et
            </button>
            <button
              type="button"
              onClick={() => setSosyal("Apple")}
              className={sosyalBtn}
            >
              <AppleIcon />
              Apple ile devam et
            </button>
          </div>
          {sosyal !== "" && (
            <p className="mt-2.5 text-center text-[11.5px] font-semibold leading-[1.5] text-ink-400">
              {sosyal} ile {sekme === "giris" ? "giriş" : "kayıt"} çok yakında
              aktif olacak.
            </p>
          )}

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[1px] text-ink-300">
              veya e-posta ile
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* ── GİRİŞ ── */}
          {sekme === "giris" && (
            <div>
              <div>
                <label className={labelCls}>E-posta</label>
                <input
                  value={gEmail}
                  onChange={(e) => setGEmail(e.target.value.slice(0, 60))}
                  placeholder="ornek@eposta.com"
                  className={inputCls}
                />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label className="text-[12.5px] font-semibold text-ink-700">
                    Şifre
                  </label>
                  <Link
                    href="/sifre-sifirlama"
                    className="text-[11.5px] font-semibold"
                  >
                    Şifremi unuttum
                  </Link>
                </div>
                <div className="flex items-center rounded-xl border border-border-input bg-white pr-2 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    value={gPw}
                    onChange={(e) => setGPw(e.target.value.slice(0, 40))}
                    type={pwType}
                    placeholder="••••••••"
                    className="min-w-0 flex-1 border-none bg-transparent px-4 py-2.5 text-[14px] font-medium text-ink-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="flex-none cursor-pointer rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-500 hover:text-ink-900"
                  >
                    {pwBtn}
                  </button>
                </div>
              </div>

              <div className="mb-4 mt-3.5 flex items-center gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={remember}
                  onClick={() => setRemember((v) => !v)}
                  className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md text-[10px] font-extrabold transition-colors ${
                    remember
                      ? "bg-primary text-white"
                      : "border-[1.5px] border-[#cdc2e0] bg-white"
                  }`}
                >
                  {remember ? "✓" : ""}
                </button>
                <span className="text-[12.5px] font-medium text-ink-500">
                  Beni hatırla
                </span>
              </div>

              <button
                type="button"
                onClick={() => girisOk && setDone("giris")}
                disabled={!girisOk}
                className={primaryBtn(girisOk)}
              >
                Giriş Yap
              </button>
            </div>
          )}

          {/* ── KAYIT ── */}
          {sekme === "kayit" && (
            <div>
              <div>
                <label className={labelCls}>Ad Soyad</label>
                <input
                  value={kAd}
                  onChange={(e) => setKAd(e.target.value.slice(0, 50))}
                  placeholder="Adın Soyadın"
                  className={inputCls}
                />
              </div>
              <div className="mt-4">
                <label className={labelCls}>E-posta</label>
                <input
                  value={kEmail}
                  onChange={(e) => setKEmail(e.target.value.slice(0, 60))}
                  placeholder="ornek@eposta.com"
                  className={inputCls}
                />
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label className="text-[12.5px] font-semibold text-ink-700">
                    Şifre
                  </label>
                  {kPwOk ? (
                    <span className="text-[11.5px] font-semibold text-primary-hover">
                      Güçlü ✓
                    </span>
                  ) : (
                    <span className="text-[11.5px] font-semibold text-ink-300">
                      en az 8 karakter
                    </span>
                  )}
                </div>
                <div className="flex items-center rounded-xl border border-border-input bg-white pr-2 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    value={kPw}
                    onChange={(e) => setKPw(e.target.value.slice(0, 40))}
                    type={pwType}
                    placeholder="••••••••"
                    className="min-w-0 flex-1 border-none bg-transparent px-4 py-2.5 text-[14px] font-medium text-ink-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="flex-none cursor-pointer rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-500 hover:text-ink-900"
                  >
                    {pwBtn}
                  </button>
                </div>
              </div>

              <div className="mb-4 mt-3.5 flex items-start gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={kosul}
                  onClick={() => setKosul((v) => !v)}
                  className={`mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md text-[10px] font-extrabold transition-colors ${
                    kosul
                      ? "bg-primary text-white"
                      : "border-[1.5px] border-[#cdc2e0] bg-white"
                  }`}
                >
                  {kosul ? "✓" : ""}
                </button>
                <span className="text-[12px] font-medium leading-[1.5] text-ink-500">
                  <Link href="/sozlesmeler" className="font-semibold">
                    Kullanıcı Sözleşmesi
                  </Link>
                  &apos;ni ve{" "}
                  <Link href="/sozlesmeler" className="font-semibold">
                    KVKK Aydınlatma Metni
                  </Link>
                  &apos;ni okudum, kabul ediyorum.
                </span>
              </div>

              <button
                type="button"
                onClick={() => kayitOk && setDone("kayit")}
                disabled={!kayitOk}
                className={primaryBtn(kayitOk)}
              >
                Hesabımı Oluştur
              </button>
            </div>
          )}

          {/* Mod değiştirici */}
          <div className="mt-4 border-t border-hairline pt-4 text-center text-[13px] font-medium text-ink-500">
            {sekme === "giris" ? (
              <>
                Bulbana&apos;da yeni misin?{" "}
                <button
                  type="button"
                  onClick={() => gecis("kayit")}
                  className="cursor-pointer font-bold text-primary hover:text-primary-hover"
                >
                  Kayıt ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{" "}
                <button
                  type="button"
                  onClick={() => gecis("giris")}
                  className="cursor-pointer font-bold text-primary hover:text-primary-hover"
                >
                  Giriş yap
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Başarı ── */}
      {done !== null && (
        <div className="animate-step-in relative mt-7 w-[420px] max-w-full rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-[0_2px_4px_rgb(46_26_71/0.03),0_24px_48px_-24px_rgb(46_26_71/0.22)]">
          <div className="mx-auto flex h-[56px] w-[56px] items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white shadow-[0_10px_24px_-8px_rgb(124_58_237/0.6)]">
            ✓
          </div>
          {done === "giris" ? (
            <>
              <h1 className="mt-[18px] text-[21px] font-extrabold leading-tight text-ink-900">
                Tekrar hoş geldin, Melih!
              </h1>
              <p className="mt-2 text-[13.5px] font-medium leading-[1.55] text-ink-500">
                2 talebinde yeni sunum, 1 sohbette yanıt bekleyen teklif var.
              </p>
              <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/kesfet"
                  className="rounded-xl bg-primary px-5 py-3 text-[13.5px] font-bold text-white hover:bg-primary-hover"
                >
                  Talepleri Keşfet
                </Link>
                <Link
                  href="/profil"
                  className="rounded-xl border border-border-input bg-white px-5 py-3 text-[13.5px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                >
                  Profilim
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-[18px] text-[21px] font-extrabold leading-tight text-ink-900">
                Hesabın hazır!
              </h1>
              <p className="mt-2 text-[13.5px] font-medium leading-[1.55] text-ink-500">
                Birkaç soruyla Bulbana&apos;yı sana göre kuralım — 1 dakika
                sürer.
              </p>
              <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/hos-geldin"
                  className="rounded-xl bg-primary px-5 py-3 text-[13.5px] font-bold text-white hover:bg-primary-hover"
                >
                  Hadi Başlayalım
                </Link>
                <Link
                  href="/kesfet"
                  className="rounded-xl border border-border-input bg-white px-5 py-3 text-[13.5px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                >
                  Atla, Keşfet&apos;e Geç
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Alt bilgi */}
      <div className="mb-4 mt-auto flex items-center gap-4 pt-5 text-[11.5px] font-medium text-ink-400">
        <span>© 2026 Bulbana</span>
        <span className="h-1 w-1 rounded-full bg-ink-300/50" />
        <Link href="/" className="text-ink-400 hover:text-ink-900">
          Ana sayfa
        </Link>
        <Link href="/sozlesmeler" className="text-ink-400 hover:text-ink-900">
          Sözleşmeler
        </Link>
        <Link href="/yardim" className="text-ink-400 hover:text-ink-900">
          Yardım
        </Link>
      </div>
    </main>
  );
}
