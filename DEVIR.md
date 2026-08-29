# Yeni sohbete devir — Bulbana

Bu dosya, sohbet kotası dolduğunda yeni bir oturuma geçmek için yazıldı.
Aşağıdaki metni yeni sohbete olduğu gibi yapıştır.

---

Bulbana projesinde çalışıyoruz: `/Users/Furkan/Projeler/bb-main`
Next.js 16 App Router + React 19 + Tailwind 4, TypeScript, Türkçe isimlendirme.

**ÖNEMLİ — önce şunları oku:**
1. `AGENTS.md` — bu Next sürümü eğitim verinden farklı; kod yazmadan önce
   `node_modules/next/dist/docs/` içindeki ilgili rehberi oku.
2. `BACKEND.md` (1474 satır) — mimari ve şimdiye kadarki TÜM kararlar burada.
   Her düzeltmenin gerekçesi yazılı; yeni iş yaparken önce oraya bak.

## Durum

- **Git var**, 32 commit, çalışma alanı temiz, ana dal `main`.
- `npm test` → **202/202 geçiyor** (25 test dosyası)
- `npx tsc --noEmit`, `npm run lint`, `npm run build` → temiz
- Veri hâlâ `.veri/*.json` dosyalarında (25 tablo karşılığı)
- Demo hesaplar: `melih.k` (alıcı), `plakdukkani34` (satıcı),
  `ayse.demir` (destek/admin). Parola hepsinde: `bulbana-demo-2026`
- `.env.local`'da `BULBANA_ONIZLEME_GECISI="1"` — sitenin altında sarı çubuk,
  tek tıkla hesap değiştirme (parolasız ama çerez sunucuda imzalı).
  **Üretimde kapatılacak.**
- **Veri temizlendi, sonra kullanıcı yeni içerik girmeye başladı.**
  Temizlikte talepler, sunumlar, mesajlar, anlaşmalar, favoriler, teslimat,
  okundu, bildirimler, e-posta kuyruğu, destek kaydı ve yüklenen görseller
  silindi; hesap verisi (profil, adres, kart, IBAN, e-posta hesabı, bildirim
  tercihleri, alarm, parolalar) korundu. Depoda şu an kullanıcının elle
  açtığı yeni talep(ler) var — **oradaki veri kullanıcıya ait, test için
  silme.**
  Yedek: `/private/tmp/claude-502/-Users-Furkan-Projeler-bb-main/223bd51f-8cef-4f0c-b14c-976130b05f62/scratchpad/temizlik-oncesi`
  (geçici dizin — makine yeniden başlarsa gider).

## Bu oturumda ne yapıldı

### Faz 0 (dürüstlük temizliği) — dokuz tarama turu

Ölçüt: *"kullanıcı bir şey yapıyor, ekran 'oldu' diyor, ortada kayıt yok."*
Bulgu eğrisi: 15 → 11 → 4 → 1 → 1 → 3 → 4 → 5 → 1.

Kapatılan başlıca sahtelikler:

- `/hos-geldin` kaldırıldı (576 satır, 0 fetch, herkese "Hazırsın, melih.k!")
- Destek formundaki sahte "Ekler" düğmesi → gerçek dosya yükleme;
  uydurma destek kayıtları → gerçek uç; moderasyon paneline destek kuyruğu
- Bildirimlerde "okundu" sunucuda kayıt oldu (zil rozeti hiç sıfırlanmıyordu)
- `/sunum-detay` id'siz açılınca kodda yazılı Beyblade sunumunu gerçek
  talebin üstüne bindiriyordu → `?id` zorunlu
- Uydurma güven sinyalleri silindi: "Ort. kargolama · 1 gün",
  "Yanıt süresi · ~1 saat", "%1 iptal", "Güvenilir Satıcı" rozeti,
  "2023'ten beri üye", "Son 90 gün"
- `Talep.eklendi` hep 0 yazılıyordu → ilan tarihi hep bugün, Keşfet
  sıralaması ölü. `gecenGun`/`yayinZamani` ile damgadan türetildi
- Sunum videosu sahte oynatıcıydı ("temsili", 42 sn sahte çubuk) → gerçek
  `<video>`; fotoğraf/video ayrımı `lib/gorsel.ts`'e alındı
- Sunumdaki `fotolar`/`video` beyandan geliyordu → yüklenen dosyalardan sayılıyor
- Mesajlar ekranında 4 sessiz başarısızlık (teklif kabul/ret geri alınmıyor,
  mesaj gönderilemeyince kutu temizleniyordu)
- Ayarlar'da 4 sessiz başarısızlık (adres/kart silme "silindi" diyordu)
- Başkasının görselini sildirme açığı kapatıldı (`kullanimDisiYollar`)
- Logo bozuktu: `proxy.ts` matcher'ı `public/` dosyalarını oturum kapısına
  sokuyordu → uzantı bazlı muafiyet

### Ölçülen metrikler eklendi

- `lib/olcum.ts`: `ortalamaYanitSaati` (mesaj bloğu → ilk cevap) ve
  `ortalamaKargoSaati` (ödemeden kargoya). Ölçüm yoksa `null` → "—".
- Satıcı metrikleri okuma anında tazeleniyor (kayda donmuyor)

### Telefon doğrulama (e-postayla aynı desen)

`lib/telefon.ts` + `lib/sms.ts` + `/api/telefon` + `/api/sms-kuyrugu`.
Kod 6 haneli, 15 dk geçerli, SMS kuyrukta bekliyor (sağlayıcı Faz 2'de).
Numara profilden ayrı tutuluyor; doğrulanınca "Telefon onaylı" rozeti.

### Ürün değişiklikleri

- **Teslim akışı:** alıcıya "ürünü teslim aldın mı?" ARTIK SORULMUYOR.
  Kargo firması teslimi bildirince doğrudan "ürün anlatıldığı gibi mi?"
  adımına geçiliyor. Bedeli bilinçli: kargo API'si (Faz 4) bağlanana kadar
  akışın son üçte biri ilerlemiyor.
- **Talep silme iki aşamalı:** dondurma = yayından çekme (talep "Yayından
  Kalkanlar" bölümüne düşer) → oradan "Talebi sil" ile kalıcı silinir.
  İlan sayfasında ayrı "yayından kaldır" düğmesi yok.
  Alışverişe dönüşmüş talep kalıcı silinemez (sipariş/para geçmişi).
- **Profilim:** "Yayından Kalkanlar" ve "Taslaklar" bölümleri (sekme olarak,
  pencere değil). Eylem çubuğu yalnızca Taleplerim sekmesinde.
  Her kaldırılan talebin gerekçesi kartın altında yazılı.
- **Taslaklar:** `lib/taslak.ts`, Profilim'den erişilebilir,
  "Düzenlemeye devam et" → `/ilan-ac?taslak=yukle` ile otomatik yükleniyor.
- **Arayüz düzeltmeleri:** ilan kartları eşit yükseklikte (muadil rozeti
  asimetri yaratıyordu), künyede uyuşmayan kriter kırmızı üçgen ünlem
  (cümle değil), kesilen metinler için `components/ui/Baloncuk.tsx`.

## SIRADA NE VAR

### 1. Faz 0'ı bir kez daha gözden geçir (kullanıcının isteği)

Dokuz tur yapıldı ama **yöntem değişince yeni bulgu çıkıyor**: 8. turda
grep yerine büyük bileşenleri baştan sona okuyunca 5 bulgu daha çıktı.
Denenmemiş açılar:

- `SiparisPaneli.tsx` ve `MesajlarClient.tsx` dışındaki akışları uçtan uca
  yürütmek (itiraz/iade süreci hiç canlı test edilmedi)
- Moderasyon paneli (`/admin`) akışlarını uçtan uca denemek
- `lib/depo.ts` (2500+ satır) baştan sona okumak
- Erişilebilirlik: klavyeyle tüm akışları yürütmek
- Mobil genişlikte (375px) ekranları gözden geçirmek

**Not:** Akış testleri veri üretmeyi gerektirir. Depodaki mevcut kayıtlar
KULLANICIYA ait — test için silme. Önce `.veri/` yedeği al, testi yap,
sonra yedekten geri yükle.

### 2. Faz 1 — Supabase geçişi

Öncesinde iki hazırlık önerildi:
- **Yüklemeye sahiplik kaydı** (kim yükledi, hangi kayda bağlı) — görsel
  silme açığının kalıcı çözümü; Storage'a geçerken o tablo zaten gerekecek
- **`lib/depo.ts`'i bölmek** — bugün dosya erişimi, iş kuralları ve zaman
  aşımı işleri iç içe; geçişte yalnızca ilki değişecek

Sonra üç adımda: şema + içe aktarma → tek tabloyla pilot (`favoriler`) →
kalan tablolar riske göre sıralı, **para en sonda**.

### 3. Kullanıcının kararına bırakılanlar

- `/hakkimizda` içindeki uydurma ekip isimleri ve `kurumsal@bulbana.com`
- Destek sayfasındaki "hafta içi 09.00–18.00 · ortalama yanıt 2 saat"
  (ölçülmüyor, hedeflenen bir söz)

## Çalışma tarzı (bu oturumda oturmuş kurallar)

- Her iş sonunda: `npm test && npx tsc --noEmit && npm run lint && npm run build`
- Her değişiklik ayrı commit, gerekçesi commit mesajında
- Kod yorumları "ne" değil "neden" anlatır; düzeltilen hatanın kendisi yazılır
- Gerçek veriyle test edilecekse önce `.veri/` yedeği al, sonra geri yükle
- Tarayıcı testinde: gizli sekmede `requestAnimationFrame` çalışmaz, React
  render'ı ekrana yansımaz — ölçmeden önce ekran görüntüsü alıp sekmeyi
  canlandır, ya da mantığı saf fonksiyona çıkarıp birim testiyle doğrula
- `.veri/` altına Bash ile yazma korumaya takılıyor; `Write` aracı çalışıyor
