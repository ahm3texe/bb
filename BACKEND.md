# Backend bağlama rehberi

Bu dosya, sabit veriyle çalışan arayüzü gerçek bir backend'e bağlarken nereye
dokunulacağını anlatır. Amaç: **değişecek yerleri iki dosyaya hapsetmek.**

## İki sınır dosyası

| Dosya | Sorumluluk | Backend gelince |
|---|---|---|
| `lib/oturum.ts` | "Kim giriş yapmış?" | İçi auth oturumundan okuyacak şekilde değişir |
| `lib/veri.ts` | Tüm sunucu tarafı okuma | İçi fetch / Supabase / Prisma çağrılarına döner |

Bu iki dosyanın **gövdesi** değişir; imzaları ve çağıran sayfalar değişmez.

### `lib/veri.ts`

Fonksiyonlar bilerek `async`. Bugün beklenecek bir şey yok ama çağrı yerleri
zaten `await` ile yazıldı — gerçek ağ çağrısına geçerken tek satır düzeltme
gerekmeyecek.

**Kural:** bu modülü yalnızca Server Component'ler (`app/**/page.tsx`) çağırır.
Client bileşenler veriyi **prop olarak** alır. Böylece veri katmanı istemciye
taşınmaz, API anahtarları sızmaz.

Şu an bu sınırdan geçen sayfalar:

- `app/page.tsx`
- `app/ilan/[id]/page.tsx`
- `app/profil/[kullanici]/page.tsx`
- `app/sunum-yap/[id]/page.tsx`
- `app/sunumum/[id]/page.tsx`

### `lib/oturum.ts`

Burada iki kavram ayrıdır ve karıştırılmamalıdır:

1. **Oturum sahibi** — gerçekten giriş yapmış hesap. Yetki kontrolü buna bakar.
2. **Aktif hesap** (`lib/aktif-kullanici.ts`) — önizlemedeki hesap değiştirici,
   `localStorage` tabanlı. Yalnızca demo içindir.

Gerçek auth geldiğinde hesap değiştirici **kaldırılmalı** veya yönetici
"impersonation" özelliğine dönüştürülmelidir. Yetkilendirme asla aktif hesaba
bakarak yapılmamalıdır.

## Render stratejisi

`/ilan/[id]`, `/profil/[kullanici]`, `/sunum-yap/[id]`, `/sunumum/[id]`
sayfalarından `generateStaticParams` **bilerek kaldırıldı**: ilanlar ve üyeler
sürekli değiştiği için build anında sabitlemek yanlış olur. Bu sayfalar istek
anında sunucuda render edilir (`ƒ`). Trafik arttığında ilgili sayfaya
`export const revalidate = 60` ekleyerek ISR'ye geçilebilir.

## Hata ve yükleme

- `app/error.tsx` — sayfa render hatası; `reset()` ile tekrar dener.
- `app/global-error.tsx` — kök layout patlarsa; kendi `<html>`/`<body>`'si var.
- `app/loading.tsx` — segment beklerken iskelet.

`error.tsx` içindeki `console.error` üretimde hata toplama servisine
bağlanmalıdır.

## Kalan işler

Bunlar henüz yapılmadı; backend bağlanırken sırayla ele alınmalı.

### 1. Client bileşenler hâlâ veriyi doğrudan okuyor

Aşağıdaki bileşenler `lib/*` dizilerini kendileri import ediyor. Hedef: veriyi
sayfadan **prop olarak** almaları.

- `components/KesfetClient.tsx` → `talepler`
- `components/ProfilClient.tsx` → `talepler`, `gelenSunumlar`, `sunumlarim`
- `components/SunumKarsilastirmaClient.tsx` → `gelenSunumlar`
- `components/BildirimlerClient.tsx`, `components/NotificationBell.tsx` → `bildirimler`
- `components/MesajlarClient.tsx` → `sohbetlerimFor`
- `components/IlanYonetimiClient.tsx`, `components/SunumDetayClient.tsx` → `getTalep`

### 2. localStorage kalıntıları gerçek veriyi gölgeler

`bb:aktif-kullanici`, `bb:hesap-profil`, `bb:ilan_taslak`. Profil API'den
gelmeye başladığında bu anahtarlar hâlâ okunuyorsa kullanıcı kendi eski
verisini görür. Sürüm ön eki ekleyip eski anahtarları geçersiz kılın.

### 3. Tipler sunum ile veriyi karıştırıyor

`Kullanici.harf` (avatar baş harfleri), `Kullanici.chipler`, `Bildirim.avatar`
gibi alanlar tamamen görüntüleme amaçlı. Veritabanı şemasını bu tiplere birebir
uydurmayın; sunum alanlarını türetilmiş hale getirin.

### 4. Kodda gömülü ilişkiler

- `SUNUM_YAPTIGIM_TALEPLER` (`lib/data.ts`) — aslında bir veritabanı ilişkisi.
- `GORSEL_ADEDI` (`lib/data.ts`) — `talepGorselleri()` bundan
  `/talepler/{id}-{n}.jpg` yolu üretiyor; gerçek yüklemede depolama URL'lerine
  dönecek.
- ID'ler başlıktan türetilmiş slug'lar. Veritabanı UUID/seri verecekse
  `talepNo()` ve tüm bağlantılar etkilenir.

### 5. Formlar

`components/IlanAcForm.tsx` 775 satır ama içinde `<form>` etiketi yok; Enter ile
gönderim ve tarayıcı otomatik doldurma çalışmıyor. Server Action kullanılacaksa
bu form baştan kurulmalı. Alan bazlı hata mesajı da yok — buton kapalıyken
kullanıcı hangi alanın eksik olduğunu göremiyor.

### 6. Demo kurgusu kalan ekranlar

`/siparis`, `/sunum-detay`, `/itiraz` sayfaları veri katmanından değil kendi
içlerindeki sabit örneklerden besleniyor. Gerçek sipariş/sunum/itiraz kayıtları
gelince bu bileşenler `id` propu alıp veriyi `lib/veri.ts` üzerinden okumalı.
