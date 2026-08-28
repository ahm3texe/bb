# Bulbana

Ters yönlü pazar yeri: alıcı ne aradığını **talep** olarak yayınlar,
satıcılar o talebe **sunum** gönderir. Alıcı bir sunumu kabul edince
pazarlık kapanır ve sipariş akışı başlar — ödeme, kargo, teslim, onay ve
gerekirse itiraz/iade.

Next.js 16 (App Router) + React 19 + Tailwind 4.

## Kurulum

```bash
npm install
```

```bash
cp .env.example .env.local
```

`.env.local` içindeki değişkenlerin ne işe yaradığı dosyanın içinde yazıyor.

**`BULBANA_OTURUM_ANAHTARI` zorunludur** (en az 32 karakter): oturum çerezi
bununla imzalanıyor ve tanımlı değilse kimse giriş yapamaz.

```bash
openssl rand -base64 48
```

Kalan değişkenler isteğe bağlıdır; boş bırakılırsa yerel geliştirme çalışır
ama destek/yönetici yetkisi kimsede olmaz.

## Giriş

Kendi kendine üyelik akışı henüz yok — hesaplar `lib/kullanicilar.ts`
içindeki listeden geliyor. Bir hesaba parola vermek için:

```bash
npm run parola -- melih.k
```

Parolası olan hesapları görmek için:

```bash
npm run parola -- --liste
```

Vitrin (ana sayfa, keşfet, ilan detayı, ziyaretçi profili) girişsiz gezilir;
hesap sayfaları giriş ister.

## Çalıştırma

```bash
npm run dev
```

`http://localhost:3000` adresini açın.

## Diğer komutlar

```bash
npm run build
```

```bash
npm test
```

```bash
npm run lint
```

## Bakım betikleri

Kaydı olmayan yüklemeleri siler (varsayılan: 24 saatten eski yetimler):

```bash
npm run temizle:gorsel -- --kuru
```

Sunum kayıtlarında donmuş satıcı metriklerini temizler — bu değerler artık
okuma anında hesaplanıyor, kayda yazılmıyor:

```bash
npm run temizle:sunum -- --kuru
```

`--kuru` yalnızca rapor verir, hiçbir şey yazmaz. İkisi de idempotenttir ve
yazmadan önce yedek alır.

## Veri

Prototipte tüm kalıcı veri proje kökündeki `.veri/*.json` dosyalarında tutulur
ve yalnızca `lib/depo.ts` üzerinden okunup yazılır. Yüklenen görseller
`public/yuklemeler/` altına iner. İkisi de `.gitignore`'da.

Gerçek bir veritabanına ve nesne deposuna geçiş için **`BACKEND.md`** dosyasını
okuyun: hangi sınır dosyasının değişeceği, hangi işlerin bağlanmadığı ve
üretime çıkmadan kapatılması gereken açıklar orada listelidir.
