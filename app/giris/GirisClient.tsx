"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Sekme = "giris" | "kayit";
type Done = null | "giris" | "kayit";

// Ortak stiller
const inputCls =
  "w-full box-border rounded-xl border border-border-input bg-white px-4 py-2.5 text-[14px] font-medium text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary focus:ring-4 focus:ring-primary/10";
const labelCls = "mb-1.5 block text-[12.5px] font-semibold text-ink-700";
// SOSYAL GİRİŞ KALDIRILDI.
//
// Ekranın en üstünde, birincil konumda "Google ile devam et" ve "Apple ile
// devam et" düğmeleri duruyordu; tıklayınca altta "çok yakında aktif
// olacak" yazan bir satır çıkıyordu. OAuth diye bir mekanizma yok — yani
// giriş ekranının ilk gördüğün iki düğmesi çalışmıyordu ve asıl yol
// (kullanıcı adı + parola) bir ayracın altında ikincil görünüyordu.
//
// Sağlayıcı bağlandığında düğmeler ikonlarıyla birlikte geri gelir.

export function GirisClient() {
  const [sekme, setSekme] = useState<Sekme>("giris");
  const [gKullanici, setGKullanici] = useState("");
  const [gPw, setGPw] = useState("");
  const [gHata, setGHata] = useState("");
  const [gIsliyor, setGIsliyor] = useState("" as "" | "giris");
  const [kAd, setKAd] = useState("");
  const [kEmail, setKEmail] = useState("");
  const [kPw, setKPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [kosul, setKosul] = useState(false);
  const [done, setDone] = useState<Done>(null);

  const girisOk = gKullanici.trim().length >= 3 && gPw.length >= 8;
  const kPwOk = kPw.length >= 8;
  // NOT: kayıt formunun kendi geçerlilik hesabı kaldırıldı — üyelik ucu
  // olmadığı için gönderim düğmesi zaten devre dışı (aşağıdaki nota bkz.).
  const pwType = showPw ? "text" : "password";
  const pwBtn = showPw ? "Gizle" : "Göster";

  const primaryBtn = (ok: boolean) =>
    `w-full rounded-xl py-3 text-[14.5px] font-bold transition-colors ${
      ok
        ? "cursor-pointer bg-primary text-white shadow-[0_6px_16px_-6px_rgb(124_58_237/0.5)] hover:bg-primary-hover"
        : "cursor-not-allowed bg-[#efebf5] text-ink-300"
    }`;

  /**
   * Giriş sonrası gidilecek yer.
   *
   * Kapı, oturumsuz isteği girişe yollarken hedefi `?devam=` ile taşıyor
   * (bkz. proxy.ts). Değer gönderim anında okunuyor — bu kod yalnızca
   * tarayıcıda çalışır, dolayısıyla state ya da effect gerekmiyor.
   */
  function devamYolu(): string {
    const ham = new URLSearchParams(window.location.search).get("devam");
    // Yalnızca site içi göreli yol kabul edilir: `//baska-site` ya da
    // `https://…` gibi bir değer açık yönlendirme açığı olurdu.
    if (ham && ham.startsWith("/") && !ham.startsWith("//")) return ham;
    return "/";
  }

  async function girisYap() {
    if (!girisOk || gIsliyor) return;
    setGIsliyor("giris");
    setGHata("");
    try {
      const r = await fetch("/api/oturum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kullanici: gKullanici.trim(), parola: gPw }),
      });
      const v = (await r.json().catch(() => ({}))) as { hata?: string };
      if (!r.ok) {
        setGHata(v.hata ?? "Giriş yapılamadı.");
        return;
      }
      setDone("giris");
      // TAM SAYFA YÜKLEMESİ — istemci yönlendirmesi DEĞİL.
      //
      // Oturum, kök yerleşimde sunucuda çözülüp ağaca prop olarak veriliyor.
      // `router.push()` ise istemci yönlendirmesi yapıyor ve yerleşimi
      // router önbelleğinden alıyordu: giriş başarılı olsa bile hedef sayfa
      // hâlâ oturumsuz yerleşimle çiziliyor, başlıkta "Giriş yap" kalıyor ve
      // korumalı ekranlar "oturum bulunamadı" diye patlıyordu.
      // `router.refresh()` beklenebilir bir söz döndürmediği için sırayı
      // garanti etmenin yolu yok. Giriş seyrek bir işlem; tam yükleme doğru
      // maliyet.
      window.location.assign(devamYolu());
    } catch {
      setGHata("Sunucuya ulaşılamadı. Bağlantını kontrol et.");
    } finally {
      setGIsliyor("");
    }
  }

  function gecis(s: Sekme) {
    setSekme(s);
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
      {/* Tek parça marka kilidi (bkz. components/Header.tsx). */}
      <Link href="/" className="mt-[3vh] flex items-center">
        <Image
          src="/logo.svg"
          alt="bulbana — sen iste, satıcı bulsun"
          width={1200}
          height={320}
          className="block h-[52px] w-auto"
          priority
        />
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

          {/* ── GİRİŞ ── */}
          {sekme === "giris" && (
            <div>
              <div>
                <label className={labelCls} htmlFor="giris-kullanici">
                  Kullanıcı adı
                </label>
                <input
                  id="giris-kullanici"
                  value={gKullanici}
                  onChange={(e) => setGKullanici(e.target.value.slice(0, 60))}
                  autoComplete="username"
                  placeholder="ornek: melih.k"
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
                    onChange={(e) => setGPw(e.target.value.slice(0, 200))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void girisYap();
                    }}
                    autoComplete="current-password"
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

              {gHata && (
                <p
                  role="alert"
                  className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[12.5px] font-semibold text-danger"
                >
                  {gHata}
                </p>
              )}

              <button
                type="button"
                onClick={girisYap}
                disabled={!girisOk || gIsliyor !== ""}
                className={primaryBtn(girisOk && gIsliyor === "")}
              >
                {gIsliyor ? "Giriş yapılıyor…" : "Giriş Yap"}
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

              {/*
                Kendi kendine üyelik akışı henüz YOK: hesaplar
                `lib/kullanicilar.ts` içindeki listeden geliyor ve parolaları
                `npm run parola` ile veriliyor. Bu düğme bir dönem sahte bir
                başarı ekranı açıyordu — kullanıcı hesabı açıldı sanıyor ama
                ortada ne hesap ne oturum vardı.
              */}
              <p
                role="note"
                className="mb-3 rounded-xl bg-primary-soft px-3.5 py-2.5 text-[12.5px] font-semibold leading-[1.5] text-primary-hover"
              >
                Yeni hesap açma henüz kullanıma açık değil. Hesabın varsa “Giriş
                yap” sekmesinden devam edebilirsin.
              </p>

              <button type="button" disabled className={primaryBtn(false)}>
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
                Aradığın ürünü ilan olarak aç ya da açık talepleri gezmeye
                başla.
              </p>
              {/*
                Buradaki birincil düğme /hos-geldin'e götürüyordu: 5 adımda
                rol, kategori, bütçe, il ve bildirim kanalı soran ama HİÇBİR
                yanıtı kaydetmeyen bir ekran (bkz. BACKEND.md → Kaldırılan
                sahte ekranlar).
              */}
              <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/kesfet"
                  className="rounded-xl bg-primary px-5 py-3 text-[13.5px] font-bold text-white hover:bg-primary-hover"
                >
                  Talepleri Keşfet
                </Link>
                <Link
                  href="/ilan-ac"
                  className="rounded-xl border border-border-input bg-white px-5 py-3 text-[13.5px] font-bold text-ink-900 hover:border-primary hover:text-primary"
                >
                  İlk İlanını Aç
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
