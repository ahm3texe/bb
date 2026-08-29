# Backend bağlama rehberi

Bu dosya, sabit veriyle çalışan arayüzü gerçek bir backend'e bağlarken nereye
dokunulacağını anlatır. Amaç: **değişecek yerleri iki dosyaya hapsetmek.**

## İki sınır dosyası

| Dosya | Sorumluluk | Backend gelince |
|---|---|---|
| `lib/oturum-sunucu.ts` | "Kim istek yapıyor?" | Gerçek kullanıcı tablosuna bağlanır |
| `lib/veri.ts` | Tüm sunucu tarafı okuma | İçi fetch / Supabase / Prisma çağrılarına döner |

Bu iki dosyanın **gövdesi** değişir; imzaları ve çağıran sayfalar değişmez.

### `lib/veri.ts`

Fonksiyonlar bilerek `async`. Bugün beklenecek bir şey yok ama çağrı yerleri
zaten `await` ile yazıldı — gerçek ağ çağrısına geçerken tek satır düzeltme
gerekmeyecek.

**Kural:** bu modülü yalnızca Server Component'ler (`app/**/page.tsx`) çağırır.
Client bileşenler veriyi **prop olarak** alır. Böylece veri katmanı istemciye
taşınmaz, API anahtarları sızmaz.

**İkinci kural:** hiçbir sayfa `lib/depo.ts`'i doğrudan çağırmaz. Bir süre 9
sayfa çağırıyordu (`odeme`, `sunum-yap`, `aldiklarim`, `profil`, `sattiklarim`,
`cuzdan`, `islem`, `ilan`, `profil/[kullanici]`) — yani "veri katmanı tek
dosyada" iddiası doğru değildi. Eksik okuma fonksiyonları `veri.ts`'e eklendi;
depo artık yalnızca `veri.ts` ve API uçları tarafından okunuyor.

Kuralı doğrulamak için:

```bash
grep -l "@/lib/depo" app/**/page.tsx
```

Çıktı boş olmalı.

### Kimlik doğrulama

Kimliğin belirlendiği zincir — her halka tek bir soruyu yanıtlar:

| Dosya | Sorusu |
|---|---|
| `lib/parola.ts` | Parola nasıl saklanır? (scrypt, tuzlu, sabit zamanlı) |
| `lib/kimlik.ts` | Bu parola bu hesaba ait mi? |
| `lib/oturum-imza.ts` | Bu çerez sahte mi? (HMAC-SHA256) |
| `app/api/oturum` | İkisi tamamsa çerezi basar; çıkışta siler |
| `lib/oturum-sunucu.ts` | Sunucunun okuma kapısı |
| `lib/korumali-yollar.ts` | Hangi sayfa oturumsuz görülebilir? |
| `proxy.ts` | Oturumsuz isteği korumalı yollardan çevirir |

**Neden bu kadar dağınık görünüyor:** "çerez sahte değil" ile "bu kişi çerezi
hak ediyor" ayrı sorulardır ve ikisi de gerekir. İmza tek başına kimlik
doğrulaması değildir — imzayı dağıtan uç kimliği doğrulamazsa imza hiçbir işe
yaramaz.

#### Kurulum

`BULBANA_OTURUM_ANAHTARI` **zorunludur** (en az 32 karakter). Tanımlı değilse
oturum üretimi ve doğrulaması tamamen kapanır — kimse giriş yapamaz. Bu
bilinçli: anahtar unutulduğunda oturumun imzasız çalışmaya devam etmesi,
kapatmaya çalıştığımız açığın kendisi olurdu. Görünür bir arıza, sessiz bir
açıktan iyidir.

```bash
openssl rand -base64 48
```

Hesaplar `lib/kullanicilar.ts` içindeki sabit listeden geliyor; kendi kendine
üyelik akışı **yok**. Parola vermek için:

```bash
npm run parola -- melih.k
```

Parola hash'leri `.veri/kimlikler.json` içinde, kullanıcı kaydından AYRI
tutulur: `lib/kullanicilar.ts` profil ekranlarına gidiyor ve client
bileşenlere prop olarak geçiyor, parola türevinin o yolun yanına bile
uğramaması gerekir.

#### Kaldırılan hesap değiştirici

Önizlemede hesaplar arasında geçiş yapan bir menü vardı; seçim `localStorage`
ve **imzasız bir çereze** yazılıyor, sunucu kimliği o çerezden okuyordu. Yani
"hesap seçmek" ile "kimlik seçmek" aynı şeydi: tarayıcı konsoluna tek satır
yazan herkes istediği hesap olabiliyordu. Üstelik çerez yoksa sabit bir
varsayılan hesaba düşülüyordu — anonim bir istemci bile bir hesap adına iş
yapabiliyordu.

İkisi de kaldırıldı. `lib/oturum.ts` bilerek boş bırakıldı; oraya bir
"varsayılan hesap" geri **eklenmemeli**.

#### İki okuma kapısı

`lib/oturum-sunucu.ts` iki fonksiyon sunar ve aralarındaki fark önemlidir:

- `istekOturumu()` → `string | null`. Oturumsuzluğun **normal** olduğu yerler
  için: ana sayfa, keşfet, ilan detayı, ziyaretçi profili.
- `istekKullaniciAdi()` → `string`, oturum yoksa **hata fırlatır**. Korumalı
  sayfa ve uçlar için. Kapı `proxy.ts` içinde olduğu için oraya oturumsuz bir
  istek ulaşmamalı; fırlatma, kapı yanlış yapılandırılırsa isteğin sessizce
  yanlış hesap adına çalışmasını engelleyen ikinci katmandır.

İstemci tarafında aynı ayrım `useAktifKullanici()` (null olabilir) ve
`useOturumSahibi()` (fırlatır) olarak sürer.

### Moderasyon paneli

`/admin` (destek/yönetici) iki kuyruğu yönetir ve ikisi de GERÇEK uçlara
bağlıdır:

| Kuyruk | Okuma | Eylem |
|---|---|---|
| İtirazlar | `GET /api/moderasyon` | `PATCH /api/anlasmalar/<sunumId>/iade` |
| IBAN aktarımları | `GET /api/moderasyon` | `PATCH /api/aktarimlar` |

Panel bir dönem tamamen sahteydi — boş sabit diziler ve tek bir `fetch` bile
olmayan düğmeler. Görünürdeki bedeli boş bir ekrandı ama gerçek bedeli
şuydu: itiraz sürecinin destek yetkisi isteyen üç adımı (`karar`,
`ikinci-karar`, `odeme`) ve aktarım sonuçlandırma, uçlarda doğru
korunuyordu ama onları çağıran hiçbir ekran yoktu. Açılan itiraz
"inceleme" adımında sonsuza kadar kalıyor, para havuzda asılı duruyor,
ilan `itiraz-suruyor` gerekçesiyle kilitleniyordu.

Karşılığı olmayan bölümler (ilan onayı, kullanıcı yönetimi) kaldırıldı:
veri modelinde ilan onayı diye bir kavram yok.

### Bildirimler ve e-posta

| Dosya / uç | Sorumluluk |
|---|---|
| `/api/eposta` | Adresi kaydeder, doğrulama kodunu kuyruğa atar, kodu işler |
| `/api/tercihler` | Hangi olayda bildirim çıkacağı |
| `lib/depo.ts` → `bildirimEkle` | Tercihi sorar, doğrulanmış adrese posta kuyruklar |

**Adres doğrulanmadan oraya posta çıkmaz.** `hesapEpostasi()` bir dönem
adresi kullanıcı adından UYDURUYORDU (`melih.k@eposta.com`); önüne konan
"doğrulanmış mı?" kapısı hiçbir hesapta açılmadığı için e-posta bildirimi
diye bir özellik vardı ve hiç çalışmıyordu. Artık adres kullanıcıdan
alınıyor ve tek kullanımlık kodla doğrulanıyor.

Gerçek gönderim servisi bağlanana kadar doğrulama postası da diğerleri gibi
kuyrukta bekler; destek ekibi `/api/eposta-kuyrugu` üzerinden okuyabilir.

### Telefon doğrulama: `lib/telefon.ts` + `lib/sms.ts`

E-posta doğrulamasıyla **birebir aynı desen**: numara kaydedilir, tek
kullanımlık kod SMS ile gider, kod girilince numara doğrulanır. Doğrulanan
numara profilde "Telefon onaylı" rozeti olarak görünür.

| Uç | Ne yapar |
|---|---|
| `GET /api/telefon` | Kayıtlı numara ve doğrulama durumu |
| `PUT /api/telefon` | Numarayı kaydeder, kodu SMS kuyruğuna atar |
| `POST /api/telefon` | Kodu tüketip numarayı doğrular |
| `DELETE /api/telefon` | Numarayı ve doğrulamasını siler |
| `GET /api/sms-kuyrugu` | Bekleyen mesajlar — yalnızca destek/yönetici |

**Numara profilde DEĞİL.** Telefon bir dönem `profiller.json` içindeydi ve
hiç doğrulanmıyordu; `telefonOnayli` rozeti de bu yüzden hiçbir zaman
render edilmiyordu. E-posta için verilen kararın aynısı geçerli: doğrulama
gerektiren iletişim bilgisi profil alanlarına karışırsa "hangi numara
geçerli?" sorusu belirsizleşir. Adres kayıtlarındaki telefon başka bir
şeydir — teslimat için kargo firmasına verilir, doğrulama istemez.

E-postadan ayrıldığı üç nokta ve gerekçeleri:

1. **Kod 6 haneli sayı**, UUID değil: kullanıcı kodu ELLE yazacak.
   Kısalığın bedeli tahmin edilebilirlik, o yüzden deneme tavanı daha sıkı
   (saatte 5 deneme, e-postada 10).
2. **Süre 15 dakika**, 24 saat değil: SMS anında ulaşır; 6 haneli bir kodu
   uzun süre geçerli tutmak tahmin penceresini gereksiz büyütür.
3. **Gönderim tavanı daha düşük** (saatte 3): gerçek sağlayıcıda her
   mesajın parası var.

Numara **her değiştiğinde doğrulama sıfırlanır** — doğrulanmış bir numarayı
başkasınınkiyle değiştirip rozeti taşımak mümkün olmamalı. Numaranın tamamı
yalnızca sahibine iner; başka yerlerde maskeli (`+90 5•• ••• •• 67`).

**Gerçek gönderim yok** (Faz 2): mesajlar `.veri/sms-kuyrugu.json` dosyasında
bekler ve moderasyon panelindeki "SMS Kuyruğu" sekmesinden okunur. Bağlanacak
tek yer `lib/sms.ts` → `smsGonder()`. Ekranda prototip uyarısı var; kod
telefona gelmediği hâlde "gönderildi" demek, e-postada düzeltilen hatanın
aynısı olurdu.

**Teklif, kargo ve sistem bildirimleri kapatılamaz** (`KAPATILAMAZ`):
paranın ve ürünün yerini söylerler, sipariş akışının parçasıdırlar.
Tercihler bir dönem yalnızca ekranın belleğindeydi ve onlara BAKAN kod
yoktu — anahtar açık da olsa kapalı da olsa aynı bildirim çıkıyordu.

Doğrulama rozeti (`E-posta onaylı`) bu kayıttan beslenir. Yanında bir de
"Cep telefonu onaylı" rozeti vardı; telefon doğrulaması diye bir mekanizma
hiç olmadığı için o dal hiçbir zaman render edilmiyordu — kaldırıldı.

### Teslim bilgisi nereden geliyor

Teslim damgası (`teslimZamani`) YALNIZCA kargo firmasından gelir:
`POST /api/anlasmalar/<sunumId>/teslim` (imzalı webhook) ya da
`SORGULAYICILAR` üzerinden sorgulama.

Bir dönem alıcının "ürünü teslim aldım" beyanı da damga basıyordu; o adım
kaldırıldı (bkz. "Teslim sonrası tek adım"). Aynı firma bağlantısı
gönderinin OLUŞTURULMASI için de gerekli — adres artık kimseye
gösterilmediğinden kargo adımı da firmaya bağlı (bkz. "Adres kimseye
gösterilmez — sipariş kodu"). Dolayısıyla firma bağlanana
kadar akışın son üçte biri ilerlemez — bu bilinçli bir tercih, ölçülmeyen
bir olayı kullanıcıya doğrulatmaktansa eksik bırakmak yeğlendi.

### Yükleme sınırları neden düşük

Proxy varken Next istek gövdesini **bellekte tamponlar** ve tavanı aşan
gövdeyi sessizce kırpar — istek hataya bile dönüşmez, yalnızca bozuk bir
multipart gövde ulaşır ve `formData()` çöker. Arayüz 100 MB video vaat
ederken 10 MB üstü her yükleme "geçersiz form verisi" diye başarısız
oluyordu.

Üç sayı hizalı tutulmalı:

| Yer | Değer |
|---|---|
| `next.config.ts` → `proxyClientMaxBodySize` | 26 MB |
| `proxy.ts` → `MAX_YUKLEME_BYTE` | 26 MB |
| `app/api/yukle` → `MAX_TOPLAM_BYTE` | 24 MB |

Büyük dosya yüklemesinin doğru yolu nesne deposuna **doğrudan** yüklemektir;
o gün bu sınırlar kalkar.

Ayrıca dosya türü artık İÇERİKTEN doğrulanıyor (`lib/dosya-imza.ts`):
`dosya.type` istemcinin beyanıdır ve beyaz liste yalnızca beyanı süzüyordu,
yani `.exe` içeriği `image/png` diye gönderilip `public/` altına
yazılabiliyordu.

### Para akışı — tek gerçek kaynak

| Fonksiyon | Ne söyler |
|---|---|
| `bakiyedekiTutar` | Satıştan kazanılan TOPLAM net gelir |
| `cekilebilirTutar` | Bakiye − bekleyen aktarım − tamamlanan aktarım |
| `paraDurumlari` | Ekrandaki "Bakiyede / IBAN'a aktarıldı" etiketi (türetilmiş) |

**Kural: para yalnızca `cekilebilirTutar` içinde düşülür.** Bir dönem ikinci
bir mekanizma daha vardı — aktarım tamamlanınca işlem kaydına `paraDurumu:
"IBAN'a aktarıldı"` yazılıyor ve `bakiyedekiTutar` onu eliyordu. Aynı para
iki kez düşüldüğü için satıcının bakiyesinin bir kısmı kalıcı olarak
çekilemez hâle geliyordu (600 + 500 TL'lik iki satışta 500 TL çekildikten
sonra kalan 600 TL, ekranda 100 TL görünüyordu).

`paraDurumu` artık kayda YAZILMAZ; aktarım defterinden türetilir. Buraya
saklanan bir durum alanı geri eklenmemeli.

Aktarımın gideceği IBAN da istemciden gelmez: `aktarimTalebiOlustur`
kayıtlı hesabı sunucudan okur (`ibanOku`). Cüzdan ekranı gövdeyi boş
gönderdiği için her aktarım talebi bir dönem hedefsiz kaydediliyordu.
IBAN'ın tam hâli istemciye hiç inmez — `/api/iban` yalnızca maskeli döner.

### GEÇİCİ: önizleme hesap geçişi

`BULBANA_ONIZLEME_GECISI=1` iken sitede sarı bir çubuk çıkar ve demo
hesapları arasında **parolasız** geçiş yapılabilir (`/api/oturum/gecis`).
Prototipi alıcı ve satıcı gözünden hızlıca denemek içindir.

**Bu, kaldırılan hesap değiştiricinin geri gelmesi DEĞİLDİR.** Fark önemli:

| | Eski hesap değiştirici | Önizleme geçişi |
|---|---|---|
| Çerezi kim yazıyor | İstemci (`document.cookie`) | Sunucu, HMAC ile imzalı |
| İstemci kimlik seçebiliyor mu | **Evet** — konsoldan tek satır | Hayır |
| Kapatılabilir mi | Hayır, koda gömülüydü | Evet, ortam değişkeni |
| Varsayılan | Her zaman açık | **Kapalı** |

Atlanan tek şey parola sorusudur; imza katmanı yerinde durur. Yine de
**üretimde açılmamalı**: parola sormadan oturum veren bir uç, adresi bilen
herkesin demo hesaplarına girmesi demektir.

Üç koruma:

1. Değişken tam olarak `"1"` değilse özellik yok sayılır — `"true"`, `"0"`
   ve tanımsız hepsi kapalı. Bir kolaylık unutulunca **kapalı** kalmalı.
2. Kapalıyken uç `404` döner; varlığı bile belli olmaz.
3. Yalnızca `lib/kullanicilar.ts` içindeki tohum hesaplar kabul edilir.
   Serbest metin kabul etmek, gerçek kullanıcılar eklendiğinde herhangi bir
   hesaba parolasız giriş anlamına gelirdi.

Çubuk bilerek çirkin ve her sayfada görünür: sessizce üretime çıkmasını
zorlaştırmak için. Kalıcı çözüm gerçek kayıt akışıdır.

### Kaldırılan sahte ekranlar

Aşağıdaki sayfalar hiçbir sunucu çağrısı yapmıyordu: kullanıcı bir şey
yapıyor, ekran "oldu" diyor, hiçbir kayıt oluşmuyordu.

| Ekran | Ne yapılıyordu | Karar |
|---|---|---|
| `/satici-performansi` | Kazanç grafiği, huni, seviye tablosu — hepsi koda gömülü sabit sayı. 0 satışı olan hesap "38.720 TL net kazanç" görüyordu | **Gerçek veriye bağlandı** |
| `/itiraz` | 339 satır, 0 fetch. İtiraz açılmıyordu | Kaldırıldı — gerçek akış `SiparisPaneli` içinde |
| `/siparis` | 654 satır, 0 fetch, satıcı adı koda gömülü | Kaldırıldı — gerçeği `SiparisPaneli` |
| `/davet-et` | Sabit davet linki, uydurma davetliler, "%2 komisyon" vaadi, kırık `/davet/` rotası | Kaldırıldı — referans programı bir ürün kararı |
| Ayarlar › Güvenlik | "SMS kodu" tarayıcıda üretilip tarayıcıda karşılaştırılıyordu; parola hiç değişmiyordu | **Gerçek yapıldı** (`POST /api/parola`) |
| Ayarlar › Gizlilik | Üç anahtar da yerel state; öneri motoru, analitik ve görünürlük kontrolü yok | Kaldırıldı |
| `/hos-geldin` | 576 satır, 0 fetch. Beş adımda rol, kategori, bütçe, il ve bildirim kanalı topluyor, hiçbirini kaydetmiyordu; bitişte herkese "Hazırsın, melih.k!" diyordu | Kaldırıldı — ayrıntı aşağıda, "Faz 0 ikinci geçişi" |

`/api/parola` mevcut parolayı **her zaman** doğrular: oturum açık olsa bile,
çerezi ele geçiren biri parolayı değiştirip hesabı devralamamalı.

Dekoratif düğmeler ya kaldırıldı ("Takip et" — takip diye bir kavram yok) ya
da gerçek destek kaydına bağlandı ("Profili bildir", "Sunumu bildir",
"Hesabı kapat").

### Parola sıfırlama

| Uç | Ne yapar |
|---|---|
| `POST /api/sifre-sifirlama` | Kullanıcı adı alır, doğrulanmış e-postaya tek kullanımlık kod yollar |
| `PUT /api/sifre-sifirlama` | Kodu tüketip yeni parolayı yazar |

`/sifre-sifirlama` sayfası bir dönem 231 satırdı ve **sıfır sunucu çağrısı**
yapıyordu; giriş ekranındaki "Şifremi unuttum" oraya götürüyordu ama
parolasını unutan kullanıcının hesabına dönmesinin hiçbir yolu yoktu.

Üç kural:

1. **Hesabın varlığı sızdırılmaz.** İstek her hâlükârda aynı yanıtı döner —
   "böyle bir kullanıcı yok" demek, saldırgana hangi kullanıcı adlarının
   gerçek olduğunu söylemekten başka işe yaramaz.
2. **Kod tek kullanımlıktır** ve doğrulandığı anda silinir; süresi dolmuş kod
   da tüketilir ki kayıt birikmesin.
3. **Doğrulanmış e-posta şart.** Adres yoksa kodun gideceği yer de yoktur;
   kullanıcı destek üzerinden çözer.

Kimlik KULLANICI ADIYLA sorulur, e-postayla değil: giriş de kullanıcı adıyla
yapılıyor ve iki farklı tanımlayıcı kafa karıştırırdı.

### Giriş akışı sayfaları sunucu/istemci olarak ayrıldı

`/giris` ve `/sifre-sifirlama` baştan sona `"use client"` olduğu için
`metadata` dışa aktaramıyor, sekme başlığı ve paylaşım kartı varsayılana
düşüyordu. İkisi de artık sunucu `page.tsx` + istemci bileşeni biçiminde.
Giriş akışı sayfaları `robots: { index: false }` taşır. (Aynı ayrım
`/hos-geldin` için de yapılmıştı; o sayfa sonradan tamamen kaldırıldı.)

### Profil bilgileri artık sunucuda

Ad, soyad, telefon, doğum tarihi ve "Hakkında" metni `.veri/profiller.json`
içinde (`app/api/profil`). Bunlar bir dönem yalnızca `localStorage`'daydı ve
iki şeyi birden bozuyordu: başka cihazdan girince kayboluyordu ve herkese
açık profildeki biyografi `lib/kullanicilar.ts`'teki sabit kayıttan
geliyordu — yani kullanıcının yazdığı metin **yalnızca kendisine**
görünüyordu. `kullaniciProfilGetir` artık kayıtlı profili sabit kaydın
üzerine bindiriyor.

E-posta profilde DEĞİL: bildirim adresi doğrulama gerektirdiği için ayrı
tutuluyor (`app/api/eposta`). İki yerde iki e-posta, hangisinin geçerli
olduğunu belirsizleştirirdi.

### Kaldırılan ölü kod

Aşağıdakiler tanımlıydı ama hiçbir yerden çağrılmıyordu. Zararsız
görünüyorlar; asıl maliyetleri sonraki okuyucuya var olmayan bir yetenek
vaat etmeleriydi.

| Ne | Neden kaldırıldı |
|---|---|
| `lib/bildirimler.ts` → `bildirimler`, `bildirimlerimFor` | Her zaman boş dizi; "ikinci bir bildirim kaynağı var" izlenimi veriyordu |
| `lib/gelen-sunumlar.ts` → `gelenSunumlar` | Hiç import edilmiyordu; aynı adlı yerel değişkenlerle karışıyordu |
| `lib/kart.ts` → `KayitliKart.token` | Hiç yazılmıyor/okunmuyordu; tahsilat bağlanınca eklenmesi tek satır |

Buna karşılık `SEBEP_METNI` ve `gizlenmeyeKalanSaat` **silinmedi** — ikisi
de ölü kod değil, yarım kalmış özellikti:

- `SEBEP_METNI` artık Profilim'deki kimlik kartında görünüyor. İptal SAYISI
  zaten gösteriliyordu ("2 iptal") ama gerekçesi hiçbir yerde yazmıyordu;
  kullanıcı puanının neden düştüğünü anlayamıyordu.
- `gizlenmeyeKalanSaat` ilan sayfasının üstünde: kapanan talep 12 saat daha
  görünür kalır, kalan süreyi söylemek bunu tahmin işi olmaktan çıkarır.

### Yinelenen webhook çağrıları

Kargo firmaları webhook'u yeniden dener; bu normaldir. `teslimIsaretle`
ilk teslim ile tekrarı artık AYIRT EDER (`isaretlendi` / `zaten-teslim`) ve
uç yalnızca ilkinde bildirim yazar. Eskiden her çağrı alıcıya yeni bir
"kargon teslim edildi" bildirimi üretiyordu ve her biri e-posta kuyruğuna
da giriyordu.

Aynı sebeple bildirim kimlikleri `Date.now() + rastgele` ile değil, depodaki
`kimlik()` ile üretilir — o fonksiyon süreç içinde monoton artar ve
çakışmaz.

### Hız sınırı sayacı

`lib/hiz-siniri.ts` bellekteki `Map`'i her N çağrıda bir temizler. Süresi
dolan kayıtlar hiç silinmiyordu; anahtar kullanıcı adı içerdiği için kayıt
sayısı hesap sayısıyla birlikte sınırsız büyüyordu.

Temizlik zamanlanmış bir işe bağlı değil — `anlasmalariTazele` ile aynı
desen: maliyet çağrılara dağılır, arka planda çalışan bir servise
bağımlılık doğmaz.

#### Açık yollar listesi neden "açık" tarafta tutuluyor

`lib/korumali-yollar.ts` korumalı değil **açık** yolları listeler. Böylece
listeye eklenmeyi unutulan yeni bir sayfa varsayılan olarak korumalı olur.
Tersi olsaydı, unutulan her yeni hesap sayfası sessizce herkese açık kalırdı.

## Render stratejisi

`/ilan/[id]`, `/profil/[kullanici]`, `/sunum-yap/[id]`, `/sunumum/[id]`
sayfalarından `generateStaticParams` **bilerek kaldırıldı**: ilanlar ve üyeler
sürekli değiştiği için build anında sabitlemek yanlış olur. Bu sayfalar istek
anında sunucuda render edilir (`ƒ`). Trafik arttığında ilgili sayfaya
`export const revalidate = 60` ekleyerek ISR'ye geçilebilir.

## Hata ve yükleme

- `app/error.tsx` — sayfa render hatası; `reset()` ile tekrar dener.
- `app/global-error.tsx` — kök layout patlarsa; kendi `<html>`/`<body>`'si var.
- `app/loading.tsx` — segment beklerken iskelet. (Belgede yazılıydı ama dosya
  yoktu; sayfaların çoğu `force-dynamic` olduğu için kullanıcı o sürede boş
  ekran görüyordu.)

**Uyarı — bunu ölçerken tuzağa düşmeyin:** React, Suspense içeriğini
`requestAnimationFrame` ile açar. Arka plandaki (görünmeyen) bir sekmede rAF
çalışmaz, dolayısıyla iskelet hiç kalkmaz ve sayfa "takılmış" görünür.
Otomasyonla test ederken sekmeyi öne alın; yoksa çalışan bir özelliği bozuk
sanırsınız.

`error.tsx` içindeki `console.error` üretimde hata toplama servisine
bağlanmalıdır.

## Kalan işler

Bunlar henüz yapılmadı; backend bağlanırken sırayla ele alınmalı.

### 0. Ödeme gerçek değil — ilk kapatılması gereken açık

`POST /api/anlasmalar/<sunumId>/odeme` ödemeyi yalnızca **işaretler**: parayı
tahsil eden bir sağlayıcı yok, isteği alıcının tarayıcısı gönderiyor. Yani
şu hâliyle alıcı ödemeden "ödedim" diyebilir ve satıcının kargo sayacını
başlatabilir.

Gerçek akış şöyle olmalı:

1. "Ödemeye Geç" alıcıyı sağlayıcının ödeme sayfasına götürür.
2. Ödeme başarılıysa sağlayıcı **imzalı webhook** ile Bulbana'yı uyarır.
3. `odemeIsaretle` yalnızca o webhook'tan çağrılır; imza doğrulanır ve
   tutar anlaşmadaki tutarla karşılaştırılır.

Kargo sayacı (`kargoSonTarih`) ödeme zamanından hesaplandığı için bu adım
doğru bağlanmadan süre de güvenilir değildir.

### 0b. Kargo teslim bilgisi firmaya bağlanmalı

Sipariş akışının son adımı (teslim → "ürün anlatıldığı gibi mi?") çalışıyor
ama teslim bilgisini bugün hiçbir kargo firması göndermiyor. İki yol var,
ikisi de `lib/kargo-durum.ts` arayüzüne bağlanır:

1. **Webhook (tercih edilen).** Firma teslim anında
   `POST /api/anlasmalar/<sunumId>/teslim` ucunu çağırır.
   İmza doğrulaması eklendi: `BULBANA_KARGO_ANAHTARI` tanımlıysa
   `x-bulbana-imza` başlığı sabit zamanlı karşılaştırmayla doğrulanır.
   Anahtar tanımlı değilse uç **üretimde tüm çağrıları reddeder**
   (geliştirmede kabul eder), yani env unutulduğunda açık kalmaz.
2. **Sorgulama.** Webhook desteklemeyen firmalar için
   `SORGULAYICILAR` tablosuna firma başına bir fonksiyon eklenir; anlaşma
   her okunduğunda yoldaki gönderiler sorulur.

Her iki yol da firmayla kurumsal sözleşme ve API anahtarı ister. Firmaların
takip sayfalarını kazımak bir seçenek değil: kullanım şartlarına aykırı,
bot korumasına takılır ve sayfa değişince sessizce bozulur.

### 0c. Süre aşımı kuralları çalışıyor, para hareketi çalışmıyor

Üç zaman aşımı da kodda uygulanıyor ve anlaşmalara her dokunuşta
çalışıyor (`lib/depo.ts`):

| Kural | Temizleyici |
|---|---|
| Alıcı 1 saat içinde ödemezse anlaşma düşer | `suresiDolanlariDusur` |
| Satıcı vaat ettiği sürede kargolamazsa sipariş iptal olur | `kargoGecikenleriDusur` |
| Alıcı 2 gün içinde sunuma yanıt vermezse sunum düşer | `yanitsizSunumlariDusur` |
| Teslimden 24 saat sonra alıcı yanıt vermediyse alışveriş otomatik onaylanır | `otomatikOnaylar` |
| "Alıcı haklı" kararından 2 gün sonra ürün iade kargosuna verilmediyse süreç satıcı lehine kapanır | `iadeKargosuGecikenler` |

İlk üçünde kayıt düşer, talep yeniden sunuma açılır ve taraflara bildirim
gider. Dördüncüsü tersi yönde çalışır: sipariş **tamamlanır**, işlem kaydı
oluşur ve para satıcının bakiyesine geçer.

### Teslim sonrası tek adım

Teslim bilgisi taşıyıcıdan gelir; alıcıya sorulan tek soru ürünün kendisi
hakkındadır:

```
kargo firması bildirir  →  teslimZamani  →  24 saatlik sayacı başlatır
  ↓ alıcı: "Anlatıldığı gibi mi?"   →  onay = evet | hayir
  ↓ 24 saat dolarsa                 →  onay = evet, otomatikOnay = true
```

**Araya bir adım daha giriyordu ve kaldırıldı.** Kargo firması teslimi
bildirdikten SONRA alıcıdan ayrıca "ürünü teslim aldım" onayı isteniyor
(`aliciTeslimZamani`), "anlatıldığı gibi mi?" sorusu ancak ondan sonra
açılıyordu. İki sebeple kalktı:

1. **Gereksiz.** Teslim bilgisi taşıyıcının kendi kaydından geliyor; aynı
   olayı bir de alıcıya doğrulatmak akışa hiçbir bilgi katmıyordu.
2. **Kötüye kullanılabilir.** Ürün eline ulaşmış bir alıcı "almadım"
   diyerek adımı hiç geçmeyebilir; sayaç dolana kadar hem süreci hem
   satıcının parasını bekletirdi.

**Sayacın tek kaynağı `teslimZamani`'dir** — yani taşıyıcının damgası.
Alıcının beyanı artık ne sayacı başlatır ne de uzatır.

**Bunun bir bedeli var ve bilinçlidir:** teslim damgası yalnızca kargo
firmasından gelebildiği için, firma bağlanana kadar akışın son üçte biri
ilerlemez. Eskiden bu boşluk alıcının beyanıyla doldurulyordu; o yol
kapandı. Kargo entegrasyonu (Faz 4) bu adımın önkoşuludur.

`otomatikOnay` alanı, onayın alıcıdan mı yoksa süre aşımından mı geldiğini
ayırt eder — sonradan çıkan bir anlaşmazlıkta bu ayrım önemlidir.

Ürün ve yardım metinleri bu kuralı yazıyor (`app/yardim`,
`app/guvenli-alisveris`); süreyi değiştirirseniz ikisini de güncelleyin. **Ama gerçek para iadesi yok:** ödeme havuzu olmadığı için "iade"
bugün yalnızca kaydın düşmesi demek. Ödeme sağlayıcısı bağlanınca iade
çağrısı `kargoGecikenleriDusur` içine gelmeli.

### 1. Client bileşenler hâlâ veriyi doğrudan okuyor

27 client bileşeni `lib/*` modüllerini kendisi import ediyor. Hedef: veriyi
sayfadan **prop olarak** almaları.

Güncel listeyi almak için:

```bash
grep -l '"use client"' components/*.tsx | xargs grep -l '@/lib/'
```

Öncelik sırası — en çok veri sızdıranlar:

- `components/KullaniciProfili.tsx`, `components/IlanDetay.tsx` →
  `lib/kullanicilar` tablosunun tamamını (gerçek adlar dâhil) tarayıcıya
  gönderiyor. **İlk bunlar ayrılmalı.**
- `components/KesfetClient.tsx`, `components/TalepCard.tsx` → `talepler`
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
- Kayıt kimlikleri `lib/depo.ts` içindeki `kimlik()` (sayısal, monoton) ve
  `metinKimlik()` (UUID) ile üretilir. `Date.now()` KULLANMAYIN: aynı
  milisaniyedeki iki kayıt aynı kimliği alıyor, silme çağrısı yanlış kaydı
  buluyordu. Veritabanına geçince ikisi de tablo kimliğine devreder.

### 5. Formlar

`components/IlanAcForm.tsx` 775 satır ama içinde `<form>` etiketi yok; Enter ile
gönderim ve tarayıcı otomatik doldurma çalışmıyor. Server Action kullanılacaksa
bu form baştan kurulmalı. Alan bazlı hata mesajı da yok — buton kapalıyken
kullanıcı hangi alanın eksik olduğunu göremiyor.

### 5b. Tarayıcı deposu sürümlendi

`bb:aktif-kullanici`, `bb:hesap-profil:*` ve `bb_ilan_taslak` anahtarları
`lib/yerel-depo.ts` üzerinden **sürümlü** hâle geldi: `bb:v1:…`. Veri şekli
değişince ya da profil sunucudan gelmeye başlayınca `YEREL_SURUM` artırılır;
eski önekli her kayıt ilk okumada silinir (`eskiYerelKayitlariTemizle`),
böylece kullanıcı kendi eski verisini sunucudan gelenin üstünde görmez.

Yeni bir tarayıcı anahtarı eklerken **doğrudan `localStorage` yazmayın**;
`yerelAnahtar("ad")` kullanın.

### 5c. E-posta kuyruğu görülebilir

`epostaKuyrukOku()` hiçbir yerden çağrılmıyordu: postalar birikiyor, kimse
görmüyor ve tavan (`EPOSTA_KUYRUK_TAVANI`, 500) aşılınca en eskiler sessizce
düşüyordu. Artık destek/yönetici `GET /api/eposta-kuyrugu` ile kuyruğu ve
durum özetini okuyabiliyor. Gerçek gönderim bağlanınca bu uç, gönderim
kayıtlarının izlendiği yere döner.

### 6. Demo kurgusu kalan ekranlar — kalmadı

`/siparis` ve `/itiraz` kaldırıldı (gerçek akış `SiparisPaneli` içinde).
`/sunum-detay` de bağlandı: `?id` artık ZORUNLU ve sayfa sunumu depodan
okuyor. Bileşendeki `varsayilanSunum` sabiti — kodda yazılı bir Beyblade
takımı — silindi; id'siz istek 404 döner. O sabit yalnızca "boş durum"
değildi: sayfa onu kullanıcının GERÇEK talebinin üstüne bindirip
gösteriyordu, yani ekranın yarısı gerçek yarısı kurgu oluyordu.

`/ilan-yonetimi` **bağlandı.** Ekran bir dönem tamamen kurguydu: "1.284
görüntülenme", 14 günlük çubuk grafik, dönüşüm hunisi ve "kategorisinin 2,1
katı sunum aldı" cümlesi sabit değerlerdi; dahası Duraklat / Kaldır düğmeleri
yalnızca yerel state'i değiştiriyor, sayfa yenilenince hiçbir şey olmamış
gibi görünüyordu.

Şimdi:

- sayılar `talepIstatistikleri()` ile gerçek kayıttan türer (takip =
  favoriler, açık sunum, teklif taşıyan sohbet sayısı),
- kalan gün `kalanGun(talep)` ile talebin kendi kaydından okunur,
- Duraklat / Yayına devam / Kaldır düğmeleri gerçek uçlara yazar,
- **görüntülenme ölçülmediği için o kart, grafik ve huni kaldırıldı.**

Görüntülenme sayacı istenirse ayrı bir iş: her ilan görüntülemede yazma
gerektirir; JSON depoda bu, her görüntülemede tüm dosyanın yeniden
yazılması demektir — veritabanına geçmeden yapılmamalı.

**Ölçülmeyen satıcı metrikleri.** `saticiTipi` ve `yanitSaat` bir dönem her
sunuma sabit ("Bireysel", 2) yazılıyordu. Uç artık yazmıyor, tip ikisini de
isteğe bağlı sayıyor ve arayüz boş değeri "—" gösteriyor. Eski kayıtlardaki
gömülü değerler için:

```bash
npm run temizle:sunum -- --kuru
```

Betik idempotenttir ve yazmadan önce yedek alır. Bu iki alanın gerçek
karşılığı (hesap türü, ölçülen ortalama yanıt süresi) backend'de üretilmeli;
üretilene kadar "—" doğru cevaptır.

`/sunum-karsilastirma` **bağlandı.** Eskiden `lib/gelen-sunumlar.ts` içindeki
boş sabit diziyi okuduğu için ekran her zaman boştu; artık sayfa
`gelenSunumlarGetir()` + `tumTaleplerGetir()` ile besleyip prop geçiyor.

## Paylaşım kartı (Open Graph)

`app/layout.tsx` içinde `metadataBase` + varsayılan `openGraph`/`twitter`
tanımlı; görselleri `app/opengraph-image.tsx` (site geneli) ve
`app/ilan/[id]/opengraph-image.tsx` (ilana özel: başlık, alıcının belirlediği
fiyat, konum) **istek anında** çizer — depoda PNG taşınmaz.

`metadataBase` `NEXT_PUBLIC_SITE_URL`'den okunur. Dağıtımda bu değişken
verilmezse adresler `https://bulbana.com` varsayılır ve önizleme yanlış
alan adını gösterir.

## Veri katmanı: `lib/depo.ts`

Prototipte tüm kalıcı veri `.veri/*.json` dosyalarında tutulur ve **tek
kapıdan** geçer: `lib/depo.ts`. Sayfalar ve API uçları dosya sistemine asla
doğrudan dokunmaz; yalnızca bu modülün fonksiyonlarını çağırır.

Backend'e geçerken bu dosyanın **gövdesi** SQL/ORM çağrılarına döner,
imzaları aynı kalır. Tablolar birebir dosyalarla eşleşir:

| Dosya | Tablo | Not |
|---|---|---|
| talepler.json | talepler | `silindi`, `donduruldu`, `kapandi` yumuşak silme damgaları |
| sunumlar.json | sunumlar | `sonuc`: beklemede/kabul/red/iptal/suresi-doldu/arsiv |
| anlasmalar.json | siparisler | `iade` alt nesnesi itiraz sürecini taşır |
| islemler.json | islemler | tamamlanan alışveriş; Aldıklarım/Sattıklarım/Cüzdan bunu okur |
| degerlendirmeler.json | degerlendirmeler | karşılıklı puan + 50 karakterlik yorum |
| destek.json | destek_kayitlari | itiraz/destek talepleri |
| teslimat.json | teslimat_adresleri | talebin tam adresi; ilanda ve KARŞI TARAFTA görünmez |
| mesajlar / okundu / favoriler / adresler / kartlar / alarmlar / bildirimler | aynı adla | — |

**Eşzamanlılık:** dosya yazımları `sirala()` kuyruğuyla serileştirilir. Bu
kilit tek süreç içindir; çok sunuculu ortamda yerini veritabanı işlemleri
(transaction / atomik UPDATE) almalıdır.

**Kural:** bakiye, sınır ve sahiplik kontrolleri kuyruğun **içinde** yapılır,
uçta değil. Aktarım talebi bir süre bunu ihlal ediyordu — çekilebilir tutar
uçta hesaplanıyordu ve eşzamanlı iki istek aynı bakiyeyi görüp ikisi de
geçebiliyordu. Doğrusu `aktarimTalebiOlustur()` gibi: doğrulama ve yazma tek
kuyruk adımında.

## İtiraz satıcı lehine kapanırsa

İtiraz iki yoldan satıcı lehine kapanabilir:

1. Destek "satıcı haklı" der (ya da karşı itirazı kabul edip "ret" verir),
2. Destek "alıcı haklı" der ama alıcı ürünü 2 gün içinde iade kargosuna
   vermez (`iade.kargoSuresiAsildi`).

İkisinde de ürün alıcıda kalır, yani **alışveriş tamamlanmıştır** ve bedeli
alıcı öder. Bu yüzden `saticiLehineOdemeKaydet()` işlem kaydını oluşturur ve
para satıcının bakiyesine geçer.

Bu adım eksikti: işlem kaydı yalnızca alıcının onay verdiği yoldan
oluşuyordu. Satıcı haklı çıksa bile parası ne alıcıya dönüyor ne kendi
bakiyesine geçiyordu — havuzda asılı kalıyordu.

İkinci yolda **destek kararı ezilmez**: `iade.karar` `"alici-hakli"` olarak
kalır, üstüne `kargoSuresiAsildi` damgası basılır. Kayıt, "alıcı haklı
bulundu ama ürünü göndermedi" gerçeğini olduğu gibi taşımalı; sonradan
çıkacak bir anlaşmazlıkta bu ayrım gerekir.

Yan etki: itiraz kapandığı için ilan da kilitten çıkar — silinebilir ve
yeniden siparişe dönebilir (`siparisSuruyor` artık `false`). Önceden süreç
hiç kapanmadığı için ilan kalıcı olarak donuyordu.

## Doğrulama kilidin içinde olmalı

Depo yazmaları `sirala()` kuyruğuyla serileştiriliyor. Bir kural kuyruğun
DIŞINDA kontrol edilirse eşzamanlı istekler onu birlikte aşar. Bu hata üç
ayrı yerde çıktı:

| Nerede | Ne oluyordu |
|---|---|
| Aktarım tutarı | Aynı bakiye iki kez çekilebiliyordu |
| Talep kimliği (`slugUret`) | Aynı başlıkla gelen iki talep **aynı kimliği** alabiliyordu |
| Açık sunum tavanı | 50'lik sınır eşzamanlı isteklerle aşılabiliyordu |

Kimlik çakışması en sinsisiydi: sunum, anlaşma, teslimat ve favori
kayıtlarının hepsi talep kimliğine bağlı, `find(t => t.id === id)` ise her
zaman ilkini döndürür — ilişkiler sessizce karışırdı.

**Kural:** kayıt yaratan/sayan/sınırlayan her kontrol `depo.ts` içinde,
`sirala()` geri çağrısının içinde olacak. Uç yalnızca biçim doğrular ve
sonucu HTTP'ye çevirir.

## Talep silme iki aşamalıdır

Talebi elden çıkarmak tek adımlık bir işlem değil:

| Adım | Ne olur | Nerede |
|---|---|---|
| 1. **Dondur** | Talep listelerden kalkar, yeni sunum almaz; süre sayacı durur ve yayına geri alınabilir | İlan sayfası → "Talebi dondur" |
| 2. **Talebi sil** | Kayıt ve bağlı her şey gider | Profilim → Yayından Kalkanlar → "Talebi sil" |

İlan sayfasında ayrı bir "yayından kaldır" düğmesi YOK: dondurma zaten
talebi yayından çekiyor ve kaydı "Yayından Kalkanlar" bölümüne taşıyor. İki
düğmenin ikisi de aynı sonuca çıkınca kullanıcı hangisinin ne yaptığını
bilemiyordu.

**Yayından Kalkanlar** üç durumu birden gösterir ve her birinin gerekçesi
kartın altında yazılıdır:

| Durum | Etiket | Silinebilir mi |
|---|---|---|
| Dondurulmuş (`donduruldu`) | "Sen dondurdun — yayına geri alabilirsin" | Evet |
| Kaldırılmış (`silindi` + `kullanici`) | "Yayından kaldırdın" | Evet |
| Alışverişe dönüşmüş (`silindi` + `alisveris`) | "Alışverişe dönüştüğü için yayından kalktı" | **Hayır** |

Eskiden tek adım vardı ve iki farklı şey yapıyordu: alışverişe dönüşmüş
talep arşivleniyor, dönüşmemiş talep ise sunumları, sohbetleri, favorileri
ve teslimat adresiyle birlikte TAMAMEN siliniyordu. Kullanıcının kendi
kaldırdığı talep hiçbir yerde görünmüyordu — "ben bu ilanı ne zaman
kaldırmıştım?" sorusunun cevabı yoktu ve o talebe sunum göndermiş
satıcının kaydı da sessizce yok oluyordu. Üstelik geri alınamaz bir işlem
tek tıkla yapılıyordu.

**Kaldırma gerekçesi kayda yazılır** (`Talep.kaldirmaSebebi`) ve ekranda
gösterilir:

- `alisveris` — talep bir siparişe dönüştüğü için kalktı,
- `kullanici` — sahibi kendi isteğiyle kaldırdı.

İki sebep çok farklı şeyler anlatıyor ve aynı ızgarada yan yana duruyorlar;
"neden listede yok?" sorusu ekranda yanıtlanmalı.

**Alışverişe dönüşmüş talep KALICI OLARAK SİLİNEMEZ.** Silmek iki tarafın
sohbetini, sipariş kaydını ve para geçmişini birden yok ederdi; satıcının
kaydı alıcının kararıyla ortadan kalkardı. Kural sunucuda uygulanır
(`talepKaliciSil` → `alisverise-donustu`); arayüz düğmeyi hiç göstermeyerek
kullanıcıyı boşuna denemekten kurtarır.

Kalıcı silme, **yayından kalkmamış** talepte de reddedilir (`yayinda`):
listelerde duran bir ilan tek adımda yok edilememeli.

## Adres kimseye gösterilmez — sipariş kodu

**Kural: hiçbir kullanıcı, hiçbir aşamada karşı tarafın adresini
göremez.** Ne alıcı satıcınınkini, ne satıcı alıcınınkini.

Burada bir dönem "adres paylaşımı zamanla sınırlıdır" yazıyordu ve kural
şuydu: alıcının adresi ödeme sonrası satıcıya açılır, satıcının adresi de
iade adımlarında alıcıya. İkisi de aynı varsayıma dayanıyordu — "kargoyu
hazırlayacak tarafın adresi bilmesi lazım". Varsayım yanlış: adresi
bilmesi gereken taraf gönderen değil, **kargo firmasıdır.**

### Akış

```
sipariş açılır       → sipariş kodu üretilir (SP-482913)
satıcı firmayı seçer → adres SUNUCUDAN FİRMAYA gider
firma gönderi numarası döner
satıcı şubeye gider  → adres değil, KODU verir
görevli adresi kendi sisteminde görür
```

Adres hiçbir aşamada karşı tarafın tarayıcısına inmez. Gönderenin
elindeki tek şey koddur ve kod tek başına adres bilgisi taşımaz — ele
geçmesi adresi açığa çıkarmaz.

### İki numara karıştırılmamalı

| | Kim üretir | Kaç tane |
|---|---|---|
| `siparisKodu` (`SP-482913`) | Bulbana | Sipariş başına **tek**, firmadan bağımsız, değişmez |
| `gonderiNo` | Kargo firması | Gönderi başına bir tane; firma başına farklı. Takip numarası da budur |

Bir sipariş birden çok gönderi doğurabilir (iade = ters yönde ikinci
gönderi), yani ilişki sipariş 1 → gönderi N.

**Sipariş kodu `talepNo` gibi türetilmez.** `talepNo` başlıktan hash
üretir ve çakışabilir; orada bedeli kozmetik. Burada değil: iki sipariş
aynı kodu alırsa kargo görevlisinin ekranına **yanlış adres** gelir. Kod
bu yüzden `destekNo`/`slugUret` deseninde — yazma kilidinin içinde,
mevcutlara bakılarak — üretilir (`lib/siparis-kodu.ts`).

Alan eklenmeden önce açılmış siparişlerde kod yok; `anlasmalariTazele`
ilk dokunuşta eksikleri tamamlar (`siparisKodlariniTamamla`). Ayrı bir
göç betiği değil, çünkü desen zaten var: maliyet çağrılara dağılır ve
arka planda çalışan bir servise bağımlılık doğmaz.

### Dosyalar

| Dosya | Sorumluluk |
|---|---|
| `lib/kargo-gonderi.ts` | Firmada gönderi oluşturur — bağlanacak tek yer (`SAGLAYICILAR`) |
| `lib/siparis-kodu.ts` | Kodu üretir |
| `lib/depo.ts` → `gonderiHazirla` | Yetki + adres okuma + yazma; iki yönü de yürütür |
| `/api/anlasmalar/<id>/kargo` | Gidiş yönü (satıcı) |
| `/api/anlasmalar/<id>/iade` `{adim:"kargo"}` | İade yönü (alıcı) |

`kargoBilgisiKaydet` kaldırıldı. `/api/teslimat` duruyor ama artık adresi
**yalnızca sahibine** döndürür: alıcı kendi adresini görür ("ürün nereye
gelecek?"), satıcı 403 alır. `?yon=iade` parametresi de kalktı.

`acikAdres()` (`lib/teslimat.ts`) artık yalnızca sunucuda, yalnızca
firmaya giden istekte kullanılır; hiçbir uç çıktısını yanıt gövdesine
koymamalı.

### Kargo firması sunumda seçilir ve bağlayıcıdır

Sunum formunda bir dönem iki pil vardı: **"Kargo satıcıya ait" /
"Kargo alıcıya ait"**. Yani sunumda sorulan şey ücretin kimde olduğuydu;
hangi firmayla gönderileceği ise sipariş açıldıktan sonra, kargo adımında
soruluyordu.

İkisi de kalktı, yerine tek bir zorunlu soru geldi: **hangi firma?**

- **Ücret sorusu düştü.** Gönderiyi satıcı yapar; alıcının kargo üzerinde
  söz hakkı olması, teslimatı satıcının yürüttüğü bir akışta karşılığı
  olmayan bir seçimdi.
- **Firma sorusu öne alındı.** Adres kapatıldıktan sonra gönderi firmada
  oluşturuluyor. Alıcı sunumu değerlendirirken ürünün hangi firmayla
  geleceğini bilmeli — şubesi uzak bir firma alıcı için gerçek bir
  maliyet.

`GelenSunum.kargoFirma` zorunludur ve `KARGO_FIRMALARI` listesinden
gelmelidir; uç listede olmayan adı reddeder (400). Ekranda görünen etiket
(`kargo`) gövdeden okunmaz, seçimden **türetilir** — istemci "Aras Kargo
ile gönderilecek" yazıp `kargoFirma` göndermeyebilirdi ve alıcı, kayıtta
karşılığı olmayan bir firma sözü görürdü.

**Seçim bağlayıcıdır.** `anlasmaOlustur` firmayı `kargoSaat` ile aynı
gerekçeyle anlaşmaya taşır: satıcının kendi vaadi, sipariş açıldıktan
sonra değiştirilemez. `gonderiHazirla` gövdeden gelen firma adını yok
sayar ve anlaşmadaki firmayı kullanır; sipariş panelinde de seçim kutusu
yerine sabit ad görünür ("PTT Kargo · sunumunda seçtin"). Aksi hâlde
satıcı, alıcının gördüğü ve kabul ettiği koşulu tek taraflı
değiştirebilirdi.

Alan eklenmeden önceki sunumlarda firma yok; o siparişlerde firma gönderi
adımında seçilir (panelde seçim kutusu çıkar). `kargoKimden()` →
`kargoFirmasi()` oldu.

**Firma künyede durur**, yani satıcının süre sözünün ("Kargoya verme")
hemen yanında — sunum detayında, gelen sunumlar listesinde ve satıcının
canlı önizlemesinde aynı satır. Bir dönem yalnızca sunum detayındaki
satıcı panelindeydi; alıcı listede, satıcı da kendi önizlemesinde
göremiyordu. Karşılaştırma tablosunda ayrıca kendi satırı var.

İki ayrıntı bilinçli:

- **Kriter sayımına girmez** (`sayilmaz`). Alıcı ilanında kargo firması
  diye bir beklenti belirtmiyor; tartılacak bir şey yok. Sayıma katmak
  paydayı bozar ve her sunumu haksız yere eksik gösterirdi.
- **Eski `kargo` etiketine düşülmez.** O alan eski kayıtlarda "Kargo
  satıcıya ait" gibi bir ÜCRET ifadesi taşıyor; onu "Kargo firması"
  başlığının altına koymak, firma olmayan bir değeri firma diye
  göstermek olurdu. Firma bilinmiyorsa satır hiç çıkmaz.

### Takip numarası: firmadan mı, beyandan mı?

Hiçbir firmayla canlı bağlantı yok (`SAGLAYICILAR` boş), dolayısıyla
gönderen takip numarasını **elle** girer. Numara hiçbir yerde
doğrulanmıyor, o yüzden kayıt bunun beyan olduğunu taşır
(`Gonderi.beyan`) ve arayüz de söyler: *"Numara gönderenin beyanı —
firmadan doğrulanmadı."*

Ayrımı tutmak şart: doğrulanmış bir gönderi numarası ile "satıcı böyle
yazdı" aynı şey değildir ve sonradan çıkacak bir anlaşmazlıkta bu fark
gerekir. Firma bağlandığı gün beyan dalı kendiliğinden devre dışı kalır —
sağlayıcı varsa beyan hiç okunmaz.

**Adresin kapalı olması bu daldan bağımsızdır:** numara elle girilse de
adres karşı tarafa gösterilmez.

**Bunun bilinçli bedeli:** sağlayıcı bağlanana kadar satıcı, elindeki
kodun karşılığını gösterecek bir şube bulamaz — yani akış gerçek dünyada
kargo adımında durur. Eskiden bu boşluk satıcıya adresi göstererek
dolduruluyordu; o yol kapandı. Aynı tercih teslim damgasında da yapıldı
(bkz. "Teslim bilgisi nereden geliyor").

### Takip bağlantısı iki yönde de aynı

`TakipSatiri` (`components/SiparisPaneli.tsx`) firma + numarayı gösterir
ve numarayı firmanın takip sayfasına bağlar (`takipAdresi`). İade yönünde
bu bilgi düz metindi — alıcı iade kargosunu izlemek için numarayı elle
kopyalayıp firmanın sitesini kendi bulmak zorundaydı, oysa gidiş yönünde
bağlantı zaten vardı. Aynı bilgi iki yönde iki farklı şekilde
sunuluyordu.

## Kenar korumaları: `proxy.ts`

> Dosyanın adı **`proxy.ts`** (kök dizinde). Bu bölüm bir dönem
> `middleware.ts` diyordu; bu Next sürümünde kenar katmanının adı değişti
> ve build çıktısında da `ƒ Proxy (Middleware)` diye görünür.

İki kontrol de uçlara tek tek eklenemez; ikisi de gövde ayrıştırılmadan
önce çalışmalı.

### İstek kaynağı (CSRF)

Oturum çerezle taşınıyor, yani tarayıcı isteği kendiliğinden kimlik
doğrulanmış hale getiriyor. Üç şey birleşince başka bir sitedeki sayfa
ziyaretçinin adına durum değiştirebiliyordu:

1. `istek.json()` gövdeyi Content-Type'a bakmadan ayrıştırıyor —
   `text/plain` ile gönderilen JSON da kabul ediliyor ve o tür tarayıcının
   CORS ön-uçuşu **yapmadığı** "basit istek" sınıfında.
2. Üç uç (`odeme`, `teslim-aldim`, `teslim`) gövde bile okumuyor; karşı
   sayfanın düz bir `<form method=POST>` koyması yeterli.
3. Çerez yoksa `istekKullaniciAdi()` **varsayılan hesaba düşüyor** — yani
   çerezsiz gelen cross-site istek bile bir hesap adına iş yapıyor.

En ağır örnek `POST /api/anlasmalar/<id>/odeme`: gövdesiz çalışıyor ve
siparişi "ödendi" işaretliyor, satıcının kargo sayacını başlatıyor.

Artık durum değiştiren her istek (GET/HEAD/OPTIONS dışı) aynı kökenden
gelmek zorunda: `Sec-Fetch-Site: same-origin`, yoksa `Origin` başlığı ana
makineyle eşleşmeli. **İmzalı webhook'lar muaf** (`x-bulbana-imza`) —
sunucudan sunucuya gelirler, Origin göndermezler ve imzayla doğrulanırlar.

Gerçek auth bağlanınca 3. madde kendiliğinden kapanır (çerez yoksa 401),
ama kaynak kontrolü yine de kalmalı.

### Statik dosyalar kapının dışında

`matcher` verilmezse proxy `_next/static` ve `public/` dâhil HER isteğe
çalışır. Next belgeleri bunu açıkça uyarıyor: oturum mantığı ya da
yönlendirmeler CSS, JS ve görsellerin yüklenmesini engelleyebilir.

Liste bir dönem yalnızca `_next/`, `yuklemeler/` ve birkaç üstveri
dosyasını dışarıda bırakıyordu; `public/` altındaki diğer her şey korumalı
yol sayılıyordu. Sonuç görünür bir arızaydı: `/logo.png` isteği `/giris`'e
**307** dönüyor, Next'in görsel iyileştiricisi dosyayı çekemiyor ("The
requested resource isn't a valid image", **400**) ve site başlığındaki logo
HERKESTE kırık görünüyordu. Oturum açmak da çözmüyordu — iyileştirici
dosyayı sunucu tarafından, çerezsiz istiyor.

Muafiyet artık yol adına değil UZANTIYA bakıyor: `public/` altına yarın
eklenecek bir dosya için listeyi güncellemek gerekmez. Aynı desen
`testler/korumali-yollar.test.ts` içinde de yazılı; ikisi birlikte
güncellenmeli.

**Muafiyet oturum kapısını zayıflatmaz:** `/profil.png` gibi bir yol
desene uyar ama öyle bir rota olmadığı için 404 döner; `/api/*` yolları
zaten uzantısız olduğundan muafiyete hiç girmez. Doğrulandı — korumalı
sayfalar 307, korumalı uçlar 401, yabancı kökenli POST 403.

### İstek gövdesi sınırı

App Router'da route handler'lar için varsayılan gövde sınırı **yok**.
Uçlardaki alan sınırları ancak `istek.json()` gövdeyi belleğe ayrıştırdıktan
sonra devreye giriyor — 100 MB'lık bir JSON önce belleğe açılıp sonra
reddediliyordu. Sınır artık ayrıştırmadan önce, kenar katmanında:

- `/api/*` → 128 KB
- `/api/yukle` → 650 MB (kendi dosya sınırları ayrıca uygulanır)

## Metin alanları `lib/metin.ts` üzerinden geçer

`tekSatir(deger, maks)` ve `cokSatir(deger, maks)`. Uçlarda ham
`trim().slice()` KULLANMAYIN — üç şeyi birden kaçırır:

1. **Görünmez karakterler.** `trim()` yalnızca boşluk sayılanları siler;
   sıfır genişlikli boşluk (U+200B) boşluk sayılmaz. Beş tanesi "en az 5
   karakter" kuralını geçiyordu ve ilan bomboş görünüyordu.
2. **Yön değiştiriciler.** U+202E metni ekranda ters çevirir; içeriği
   olduğundan farklı göstermek için kullanılır.
3. **Satır sonları.** Başlık, marka, ad gibi tek satırlık alanlarda düzeni
   bozar.

`tekSatir` tüm boşlukları tekleştirir; `cokSatir` paragrafları korur ama
üst üste boş satırları ikiye indirir. Hangi alanın hangisi olduğu uçta
seçilir (açıklama, not, mesaj metni ve adres tarifi çok satırlı).

## Form alanları kendiliğinden biçimlenir

Kart numarası (`1234 5678 9012 3456`), son kullanma tarihi (`12/28`) ve
telefon (`0555 123 45 67`) kullanıcı yazarken gruplanır. Biçimlendiriciler
`lib/kart.ts` ve `lib/telefon.ts` içinde, saf fonksiyon ve testli.

**Ayraç koyan her biçimlendiricide silme ayrıca ele alınmalı, yoksa alan
KİLİTLENİR.** "12/" yazan kullanıcı geri sildiğinde tarayıcı "/" işaretini
kaldırıp "12" bırakır; biçimlendirici onu görüp yeniden "12/" yapar ve
silme hiç ilerlemez. İki çözüm var ve ikisi de kullanıldı:

- **Ayracı sona koyma** (kart numarası, telefon): son gruptan sonra
  boşluk bırakılmaz, sorun hiç doğmaz.
- **Ayraçtan silerken bir rakam düşürme** (son kullanma): ayraç ayın
  tamamlandığını göstermek için gerekli, o yüzden silme özel olarak
  ele alınır — kullanıcının silmek istediği zaten ondan önceki rakamdı.

Kart biçimlendiricisi bir dönem iki yerde ayrı ayrı yazılıydı (ödeme
ekranı ve ayarlardaki kart formu); tek kaynağa alındı.

## Telefon numarası Profil bilgilerinde

Numara **Profil bilgileri** sekmesinde, kendi bölümünde duruyor. Bir
iletişim bilgisi; Bildirim tercihleri ise "hangi olayda haber ver" ayarı.
E-posta orada kalıyor çünkü kayıtlı adres doğrudan bir bildirim kanalı —
telefonun böyle bir karşılığı yok (SMS sağlayıcısı bağlı değil).

Profilin diğer alanlarıyla aynı forma KARIŞMIYOR: biri "Kaydet" ile
yazılır, öteki SMS koduyla doğrulanır. Aynı sekmede ama ayrı bölümde —
kullanıcı için bir yerde, kayıt olarak ayrı (bkz. "Telefon doğrulama").

**Kart formundan telefon alanı kaldırıldı.** Form numarayı ZORUNLU
tutuyordu ("geçerli bir telefon numarası gir" demeden kaydı geçirmiyordu)
ama hiçbir yere YAZMIYORDU: `onKaydet` yalnızca numara, isim, son kullanma
ve varsayılan alanlarını taşıyor. Kullanıcı numarasını giriyor,
doğrulanıyor, sonra atılıyordu. Üstelik uyarı metni kaldırılmış bir vaadi
tekrarlıyordu ("SMS şifresi için") — sahte SMS doğrulama akışı o dosyadan
çıkarılmıştı, geriye yalnızca hata mesajı kalmıştı.

## Başlık sınırı tek sabitten okunur

`lib/metin.ts` → **`BASLIK_SINIR` (105)** ve `BASLIK_EN_AZ` (5). Talep ve
sunum başlıkları için form da uç da bu sabiti okur — `YORUM_SINIR` ile
aynı desen.

Üç yerde üç farklı sayı vardı: talep ucu 70, sunum ucu 90, sunum formu
80'de kesiyordu. Formun uçtan dar olması veri kaybettirmez ama sayılar
birbirinden bağımsız yaşadığı sürece ters yönde kayması an meselesiydi —
ve o yön, kullanıcının yazdığının sessizce kırpılması demek (sunum
açıklamasında ve adres tarifinde çıkan hatanın aynısı).

Sunum formunda ayrıca **sayaç yoktu**: alan 80'de sessizce kesiyor,
kullanıcı ne kadar yeri kaldığını hiçbir yerden göremiyordu. Eklendi.

**Alt sınır düzenleme yolunda da uygulanıyor.** `POST /api/talepler`
başlığı en az 5 karakter isterken `PATCH /api/talepler/<id>` hiçbir
kontrol yapmıyordu: yayındaki bir ilanın başlığı tek harfe
indirilebiliyordu ve kart, arama sonucu, sohbet başlığı ve paylaşım
kartı hepsi o harfi gösteriyordu.

## Gövdeden gelen her şey düşmandır

Uçlarda tekrarlayan üç hata sınıfı çıktı; yeni uç yazarken üçünü de kontrol
edin:

1. **Dizi sayısı sınırlı ama öğe uzunluğu değil.** `kriterler`, `durumlar`
   gibi alanlarda "en fazla 12 öğe" yazılmış ama her öğe megabaytlarca metin
   olabiliyordu. Hem sayıyı hem uzunluğu sınırlayın.
2. **Yol/kimlik alanları doğrulanmıyor.** `gorseller` alanı gövdeden gelen
   keyfi metni kabul ediyordu; oysa yalnızca `/api/yukle`'nin ürettiği
   `/yuklemeler/<ad>` biçimi geçerli. Süzgeç: `lib/gorsel.ts`.
3. **Biçim doğrulanıyor ama içerik değil.** Kart son kullanma tarihi
   `AA/YYYY` kalıbına uyuyor mu diye bakılıyor ama "99/1999" geçiyordu.
   Kalıp yetmez; anlamı da doğrulanmalı (`sktGecerliMi`).

## Sınırsız yazma uçları

JSON depoda her yazma dosyanın TAMAMINI yeniden yazıyor. Bu yüzden "kaç
kayıt açılabilir" sorusu sadece depolama değil, işlemci sorusu. Kayıt
yaratan her ucun ya doğal bir sınırı ya açık bir tavanı olmalı:

| Uç | Sınır |
|---|---|
| kartlar | `EN_FAZLA_KART` (5) |
| adresler | `EN_FAZLA_ADRES` (5) |
| alarmlar | `EN_FAZLA_ALARM` (20) |
| favoriler | Talep var olmalı |
| okundu | Sohbet var olmalı + isteyen tarafı olmalı |
| degerlendirmeler | Alışveriş başına kişi başı bir tane |
| talepler / sunumlar / mesajlar / destek / yukle / aktarimlar | Hız sınırı |

Alarm tavanı özellikle önemli: her yeni talep yayına girdiğinde **tüm**
alarmlar taranıyor (`alarmlariTetikle`), yani sınırsız alarm her ilan
açılışını yavaşlatır.

## Sunum durumları

`GelenSunum.sonuc` bir sunumun akıbetini tutar. Ayrımlar bilerek incedir;
satıcıya gösterilen gerekçe buradan türetiliyor (`lib/veri.ts`):

| Durum | Anlamı |
|---|---|
| `beklemede` | Alıcı henüz karar vermedi |
| `kabul` | Alıcı bu sunumu seçti |
| `red` | Alıcı bu sunuma bakıp hayır dedi |
| `kapandi` | Alıcı **başka** bir sunumu kabul etti |
| `iptal` | Satıcı geri çekti ya da kabul sonrası ödeme yapılmadı |
| `suresi-doldu` | Alıcı 2 gün içinde hiç yanıt vermedi |
| `arsiv` | Talep yeniden yayına alındı; sunum önceki döneme ait |

**Kabul tek kapıdan geçer.** Bir sunumu kabul etmek = sipariş açmak, ve bunu
yapan tek yer `POST /api/anlasmalar`'dır. `PATCH /api/sunumlar/<id>` yalnızca
**reddi** kabul eder.

Bu uç bir dönem "kabul" de alıyordu: o dalda sunum kabul edilmiş olup talep
kapanıyor ama sipariş açılmıyordu — ödenecek, kargolanacak hiçbir şey yok,
diğer sunumlar da düşmüyordu. Arayüz bu yolu hiç kullanmıyordu ama kapı
açıktı. Aynı işi yapan iki yoldan eksik olanı kapatıldı; "kabul" gönderen
istek artık 400 ile doğru uca yönlendiriliyor.

`kapandi` sonradan eklendi. Kabul edilen sunum dışındakilere dokunulmuyordu:
ilan kapandığı hâlde diğer satıcılar iki gün daha "beklemede" görüyor,
ürünlerini kenarda tutuyorlardı. İki gün sonra da yanlış gerekçe düşüyordu
("alıcı 2 gün içinde yanıt vermedi") — oysa alıcı yanıt vermişti.

`red` ile karıştırmayın: reddedilmek, alıcının o sunuma bakıp hayır
demesidir. `kapandi`'da tercih başkasına gitmiştir. Satıcı performansı
hesaplanacaksa bu ayrım gerekir.

Sipariş düşüp talep yeniden açılırsa kapatılan sunumlar **diriltilmez**;
aradan zaman geçmiş olabilir. O satıcılar isterlerse yeni sunum yapar —
`red` için de kural budur.

## Kimlikler kilidin içinde üretilir

Kullanıcıya görünen ya da kayıt eşleştiren her numara/kimlik, yazma
kilidinin **içinde** ve mevcutlara bakılarak üretilir:

| Kimlik | Üreten |
|---|---|
| Talep kimliği (slug) | `talepEkle` → `slugUret` |
| Destek kayıt numarası | `destekKaydiEkle` → `destekNo` |
| Kayıt kimlikleri (kart, adres, alarm…) | `metinKimlik` (UUID) |
| Bildirim kimliği | `kimlik()` (monoton) |

Destek numarası bir dönem yalnızca `1000-9999` arası rastgele bir sayıydı:
9000 olası değer, **100 kayıtta %42 çakışma**. Numara hem kullanıcının
referansı hem de listede React anahtarı olduğu için çakışma iki kaydı
birbirine karıştırıyordu.

## Türkçe karşılaştırma tuzağı

`toLocaleLowerCase("tr")` **karşılaştırma için kullanılmaz.** Türkçe küçük
harf dönüşümü `I` → `ı` ve `İ` → `i` yapar; aynı kelimenin farklı yazımları
eşleşmez:

```
"IPHONE"   → "ıphone"    "iPhone"   → "iphone"    ✗
"Istanbul" → "ıstanbul"  "İstanbul" → "istanbul"  ✗
"NIKE"     → "nıke"      "Nike"     → "nike"      ✗
```

Sonuç **sessiz**: alarm kurulur ama hiç ateşlenmez, arama sonuç döndürmez,
kullanıcı nedenini asla anlayamaz.

Karşılaştırma için `karsilastirmaAnahtari()` / `ayniMi()` kullanın
(`lib/metin.ts`). Türkçe harfleri ASCII'ye katlar, büyük/küçük harf ve
boşluk farklarını siler.

**Sadece karşılaştırma içindir** — ekranda gösterilecek metni bundan
üretmeyin, "Şişli" burada "sisli" olur.

Düzeltilen yerler: alarm eşleşmesi, ürün durumu karşılaştırması, Keşfet
araması, seçim kutusu araması, sunum künye karşılaştırması, mahalle ucu.

## Sohbet listesi gerçek hareketten türer

`sohbetlerGetir` üç şeyi sabit veriyordu:

- **saat** her sohbette `"Az önce"` — bir aylık yazışmada bile,
- **önizleme** hep `"Sunum gönderildi — X TL"` — hiçbir zaman son mesaj,
- **sıralama** yok; liste sunum ekleme sırasına göre geliyordu, yani az önce
  konuşulan sohbet aşağıda kalabiliyordu.

Üçü de artık son mesajdan geliyor. Sohbette hiç mesaj yoksa açılış olayına
ve sunumun gönderilme zamanına düşülür. Sıralama için `Sohbet.sonHareket`
(ham ISO damga) eklendi — `saat` göreli metin olduğu için sıralamada
kullanılamaz.

Göreli zaman `gecenSureIso` ile üretiliyor; bildirim listesiyle aynı
biçimlendirme.

## Talep süresi: dondurma sayacı durdurur

`kalanGun` dondurulmuş talepte de akıp gidiyordu. 25 gün kalmışken donduran
kullanıcı bir ay sonra "0 gün kaldı" görüyordu — oysa depo `dondurmaKalanGun`
alanında doğru değeri saklıyor ve yayına dönünce oradan devam ediyor.
Fonksiyon artık dondurulmuş talepte saklanan değeri döndürür.

Yan etki: çifte dondurma da düzeldi. `talepYayinDurumu` dondururken
`kalanGun`'u çağırıp saklıyor; ikinci kez dondurmak eskiden kalan süreyi
eritiyordu.

**Not:** Kapanan talebin görünürlük süresi 12 saat (`GIZLENME_SURESI_MS`).
Üç ayrı yorumda "bir gün" yazıyordu; düzeltildi.

## Kullanıcı metrikleri gerçek veriden gelir

Profil, hesap menüsü, işlem dökümü ve **ilan sayfası** beş sayı gösteriyor.
Bunlar `lib/kullanicilar.ts` içindeki sabit kayıtta 0 yazılıydı ve hiçbir
yerden hesaplanmıyordu — yani on alışveriş yapmış bir alıcı, sunum yapmayı
düşünen satıcıya **"0 alım tamamladı"** diye görünüyordu. Kullanıcı Kalitesi
seviyesi de bu sayılardan besleniyor.

`kullaniciMetrikleriGetir()` dördünü gerçek kayıttan türetir:

| Metrik | Kaynak |
|---|---|
| `tamamlananAlim` | `islemler` (alıcı tarafı) |
| `tamamlananSatis` | `islemler` (satıcı tarafı) |
| `sunumYanitOrani` | Kendi taleplerine gelen sunumlar: kabul+ret / (kabul+ret+süresi dolan) |
| `zamanindaKargo` | Anlaşmalar: `kargoZamani <= kargoSonTarih` olanların oranı |

**Ölçüm yoksa `null` döner, 0 değil.** Hiç kargolamamış satıcıya "%0
zamanında kargo" yazmak, sözünde durmamış gibi göstermek olurdu. Arayüz
`null` için "—" gösterir.

### Ölçüm yokluğu puanı düşürmez

`aliciKalitesi()` artık puanı YALNIZCA ölçümü olan sinyaller üzerinden ve
100'e ölçekleyerek hesaplar (`KaliteSinyal.veriVar`). Eskiden veri yokluğu
ile kötü performans aynı şeydi: hiç sunum almamış kullanıcı "Sunumlara
yanıt" sinyalinden sıfır alıyor, üstüne o sinyal "zayıf yan" listesine
giriyordu.

Ölçülen fark:

```
sunum verisi YOK       → 95 puan · zayıf yan yok
hepsine yanıt vermiş   → 96 puan · zayıf yan yok
hiç yanıt vermemiş     → 83 puan · zayıf: Sunumlara yanıt
```

### İptaller ve kusur: `lib/iptal.ts`

Düşen sipariş kaydı siliniyor ama **kusur izi kalıyor**: sipariş düştüğü anda
`iptaller.json`'a tek satır yazılıyor (sipariş başına tek kayıt, tekrar
çalışması zararsız).

| Sebep | Kusur |
|---|---|
| Ödeme süresinde yapılmadı | Alıcı |
| Söz verilen sürede kargolanmadı | Satıcı |
| **İtiraz alıcı lehine sonuçlandı** | **Satıcı** |
| İtiraz satıcı lehine sonuçlandı | Alıcı |
| Ürün süresinde iade edilmedi | Alıcı |

Üçüncü satır ürün kararıdır: alıcı itiraz edip haklı çıktıysa ürün
anlatıldığı gibi değilmiş demektir, kusur satıcıdadır.

Kayıt noktaları: `anlasmalariTazele` (ödeme ve kargo zaman aşımları,
iade edilmeyen ürün) ve iade ucu (destek kararları). Hepsi yazma kuyruğunun
**dışında** — `iptalKaydet` de kuyruğa girer.

`kullaniciMetrikleriGetir` buradan `iptalEdilenAlim` ve `iptalEdilenSatis`
türetir.

## Değerlendirme ne zaman açılır

Ölçüt "alıcı onayladı" değil, **"sipariş bitti"** (`siparisSuruyor` false).
Kapsanan durumlar:

- alıcı ürünü onayladı (ya da 24 saat dolup otomatik onaylandı),
- itiraz satıcı lehine kapandı,
- ürün iade edilip para geri döndü,
- alıcı ürünü süresinde iade etmediği için süreç kapandı.

Eskiden yalnızca ilk durum değerlendirilebiliyordu; itirazla kapanan
siparişlerde iki taraf da birbirini puanlayamıyordu. Oysa değerlendirmenin
en çok gerektiği yer orası: bir sorun yaşanmış ve süreç sonuçlanmıştır.

Süren itiraz hâlâ engeller — karar verilmeden puan verilmesi, süreci
etkilemeye çalışan bir baskı aracına dönüşürdü.

## Kargo bedeli muhasebede yok

Kargoyu kimin göndereceği sunumda yazılı ("Kargo alıcıya ait" / "satıcıya
ait") ve bu bilgi kayıtta duruyor. **Tutarı ise Bulbana'dan geçmiyor** —
taraflar sohbette kendi aralarında anlaşıyor.

`Islem.kargo` alanı bu yüzden kaldırıldı. Alan zaten hep `0` yazılıyordu:
hesabı yapması gereken satırın iki dalı da sıfır döndürüyordu ve sistemde
kargo ücretinin sayısal karşılığı hiç yoktu. Sabit bir tarife uydurmak
(ör. "alıcıya aitse 150 TL") yanlış olurdu — muhasebede uydurulmuş rakam,
doğrudan kullanıcının cebine dokunur.

Alıcının toplam harcaması artık yalnızca ürün bedellerinin toplamı;
komisyon da ürün bedeli üzerinden hesaplanıyor.

**Kargo tahsilatı ileride Bulbana'ya alınırsa** alan geri gelir — ama gerçek
bir rakamla. O gün üç soru ayrıca karara bağlanmalı: komisyon kargoya
uygulanacak mı, iade halinde kargo bedeli kimde kalır, tutarı satıcı mı
girer yoksa tarife mi olur.

## Para tutarları tek kapıdan geçer

`lib/para.ts` → `paraTutari()`. Talep, sunum ve teklif uçlarının hepsi bunu
kullanır; üst bant (`MAX_FIYAT`) da orada tanımlıdır — eskiden üç dosyada
ayrı ayrı yazılıydı.

İki hatayı birden kapatır:

1. **Kesir.** `Number(govde.fiyatNum)` ondalık kabul ediyordu. 3333.3333 TL
   ekranda "3.333,333 TL" görünüyor ve kesir komisyondan bakiyeye kadar
   taşınıyordu. Bir uçta (`talepler` PATCH) yuvarlama vardı, diğerlerinde
   yoktu — aynı alan iki uçta farklı davranıyordu.
2. **Tip zorlaması.** `Number([5])` 5, `Number(true)` 1 döndürür. Dizi ya da
   mantıksal değer gönderen istek sessizce geçerli tutara dönüşüyordu.

**Ayrıca `anlasilanTutar()` de yuvarlar.** Uçlar artık kesir kabul etmiyor
ama orası paranın karara bağlandığı yer; kayıttan okuduğuna da körü körüne
güvenmemeli. Eski kayıtlardaki kesirli değerler bu sayede zincire sızmıyor.

## Para: tutar nereden gelir?

`Anlasma.tutar` bir dönem doğrudan istek gövdesinden okunuyordu. Tutar şu
zincirin başı olduğu için beyana bırakılamaz:

```
anlasma.tutar → Islem.fiyat → komisyon (%4) → bakiye → IBAN aktarımı
```

Yani 77.777 TL'lik bir sunum `{tutar: 1}` gönderilerek 1 TL'ye siparişe
çevrilebiliyordu; arayüz doğru sayıyı gönderiyordu ama sunucu onu hiçbir
şeyle karşılaştırmıyordu.

**Kural artık şu:** uç `tutar` alanını hiç okumaz. `anlasilanTutar()`
sohbetteki **karşı tarafın son teklifini** bulur; hiç teklif yoksa sunumun
ilan fiyatına düşer.

Neden "karşı tarafın": kendi teklifini kabul eden biri fiyatı tek taraflı
belirlemiş olurdu. Satıcı 60.000 teklif eder, alıcı 55.000'e çeker; satıcı
kabul ederse kayıt 55.000, alıcı kabul ederse 60.000 olur. İki durumda da
tutar, **karşı tarafın söylediği** rakamdır.

Teklif mesajlarının da üst sınırı var (`/api/mesajlar`, 10.000.000 TL) —
sınırsız bir teklif kabul edilirse kayıt da sınırsız olurdu.

**Bir ilana bir sipariş.** `anlasmaOlustur` artık talepte süren bir sipariş
olup olmadığına da bakar (`siparisSuruyor`). Kontrol yalnızca sunum başına
yapıldığı için alıcı aynı ilana gelen iki sunumu birden kabul edip iki
sipariş açabiliyordu. Biten siparişler engellemez: talep yeniden yayına
alınmışsa yeni bir alışverişe dönüşebilmeli.

## Yetki: `lib/roller.ts`

Destek ekibi ve yönetici, ortam değişkeninden okunur:

```
BULBANA_DESTEK="ayse.demir,destek1"
BULBANA_ADMIN="admin"
BULBANA_KARGO_ANAHTARI="<kargo firmasıyla paylaşılan gizli anahtar>"
```

- İtiraz kararı ve para iadesi adımları **yalnızca** `destekYetkisi()` geçen
  hesaplarca işlenir.
- Kargo firmasının teslim webhook'ları `x-bulbana-imza` başlığıyla doğrulanır
  (`kargoWebhookGecerli`, sabit zamanlı karşılaştırma). Anahtar tanımlı
  değilse: geliştirmede çağrı kabul edilir, **üretimde reddedilir.**
- `/admin` sayfası `destekYetkisi()` geçmeyene `notFound()` döner. Yetki
  kontrolü sunucuda, her istekte yapılır — `robots.ts` disallow listesi
  erişimi engellemez, yalnızca dizine girmeyi engeller.

## Henüz bağlanmamış işler

> Bu bölüm bir dönem belgenin geri kalanıyla ÇELİŞİYORDU: kimlik doğrulama
> yokmuş, `lib/oturum.ts` sabit hesap döndürüyormuş, `hesapEpostasi()`
> uydurma adres üretiyormuş ve `/admin`, `/itiraz`, `/siparis`, `/davet-et`
> veri katmanına bağlı değilmiş gibi yazıyordu — hepsi belgenin üst
> yarısında çözülmüş olarak anlatılıyor. Belgenin kendisi de dürüstlük
> denetiminin kapsamındadır: yanlış bir "kalan işler" listesi, olmayan bir
> açığı kovalatır ve gerçek olanı gizler.

Sırasıyla:

1. **Ödeme tahsilatı** — `POST /api/anlasmalar/<sunumId>/odeme` ödemeyi
   yalnızca işaretler; parayı tahsil eden sağlayıcı yok. Ödeme ekranı bunu
   artık kullanıcıya da SÖYLER (görünür prototip uyarısı, "Sipariş
   kaydedildi" başlığı). Ayrıntı: yukarıdaki "Ödeme gerçek değil" bölümü.
2. **Kargo teslim bilgisi** — webhook ucu ve imza doğrulaması hazır, firma
   bağlı değil. Bugün teslim damgası alıcının beyanından gelir.
3. **E-posta gönderimi** — `lib/eposta.ts` postaları kuyruğa yazar; gerçek
   servisin bağlanacağı tek yer `epostaGonder()`. Adres artık uydurulmuyor:
   kullanıcıdan alınır ve tek kullanımlık kodla doğrulanır; kuyruğa yalnızca
   doğrulanmış adresler için yazılır. Kuyruk `/api/eposta-kuyrugu` ve
   moderasyon panelinden okunabiliyor.
4. **Telefon doğrulama** — `Kullanici.telefonOnayli` alanı duruyor ama
   doğrulama akışı yok; rozet de render edilmiyor (bkz. "Bildirimler ve
   e-posta").
5. **Kayıt akışı** — hesaplar `lib/kullanicilar.ts` içindeki listeden gelir,
   parola `npm run parola` ile verilir. Giriş ekranındaki kayıt sekmesi
   bilinçli olarak `disabled` ve bunu yazıyor.
6. **Dosya deposu** — yüklenen görseller `public/yuklemeler/` altına yazılır;
   kalıcı nesne deposuna (S3/Supabase/Cloudinary) taşınmalı. Talep silinince
   ve düzenlemede listeden düşen görseller için temizlik yapılıyor; hiç kayda
   bağlanmamış yüklemeler için `npm run temizle:gorsel -- --kuru`.
7. **Client bileşenler hâlâ veriyi doğrudan okuyor** — bkz. yukarıdaki
   "Client bileşenler" maddesi.

### Faz 0 ikinci geçişi — kapatılanlar

Faz 0 bir kez bittikten SONRA yapılan ikinci taramada çıkanlar. Hepsi aynı
sınıftandı: kullanıcı bir şey yapıyor, ekran "oldu" diyor, ortada kayıt yok.

| Ne | Ne oluyordu | Karar |
|---|---|---|
| `/hos-geldin` | 576 satır, 0 fetch. Rol, kategori, bütçe, il ve bildirim kanalı topluyor, hiçbirini kaydetmiyordu; bitişte herkese "Hazırsın, melih.k!" diyordu; olmayan kanallar (SMS, WhatsApp, anlık bildirim) seçtiriyordu | **Kaldırıldı** |
| Destek formu › Ekler | Kırmızı yıldızlı ZORUNLU alan, ama dosya seçici yok: `+` kutusu yalnızca bir sayacı artırıyor, "ek 1 ✓" yazıyordu. Kullanıcı ekran görüntüsü iliştirdiğini sanıyor, destek ekibine hiçbir şey ulaşmıyordu | **Gerçek yükleme** (isteğe bağlı) |
| Destek › "Destek taleplerim" | Üç uydurma kayıt; biri olmayan bir özelliğe atıf ("şifre değişiminde SMS kodu gelmedi"). `/api/destek` GET vardı, çağıran yoktu | **Gerçek uca bağlandı** |
| Destek kayıtları kuyruğu | Kayıt yazılıyor ama okuyan ekran yok: durum sonsuza dek "İncelemede" kalıyordu | **Moderasyon paneline 3. kuyruk** |
| Bildirim "okundu" | `Bildirim.yeni` hiçbir yerde `false` olmuyordu: "Tümünü okundu say" yalnızca yerel state, zil rozeti hiç sıfırlanmıyordu | **Sunucuda kayıt** |
| `/sunum-detay` (id'siz) | Kodda yazılı bir Beyblade sunumunu kullanıcının GERÇEK talebinin üstüne bindiriyordu | **`?id` zorunlu, id'siz 404** |
| Sunum karşılaştırma › "Sunumu aç" | Bağlantı id taşımıyordu; gerçek sunumları karşılaştıran alıcı yukarıdaki kurgu ekrana düşüyordu | **`?id=<sunum>`** |
| Sunum detayı › "Sunum 1 / N" + ‹ › | Oklar düğme bile değildi (`title="Yakında"`); "1" hiç hesaplanmıyordu | **Kaldırıldı** |
| `/ilan-yonetimi` | Her zaman ilk talebi açıyordu; birden fazla ilanı olan diğerlerine ulaşamıyordu ve bağlantılar id taşımadığı için tıklanan ilan ile açılan ilan farklı olabiliyordu | **`?id` + ilan seçici** |
| Giriş › sosyal düğmeler | En üstte, birincil konumda "Google/Apple ile devam et"; tıklayınca "çok yakında". OAuth yok | **Kaldırıldı** |
| Ödeme ekranı | Gerçek kart no + CVV isteyip atıyor, "Ödeme alındı" diyordu. Prototip olduğu yalnızca kaynak kodun yorumundaydı | **Görünür uyarı** |
| "3 gün kargo kuralı" | Üç sayfada kesin kural gibi anlatılıyordu; gerçekte süre satıcının sunumdaki taahhüdünden gelir (18 ya da 72 saat) | **Metinler düzeltildi** |
| İtiraz inceleme SLA'sı | Hakkımızda "48 saat", güvenli alışveriş "24 saat"; kodda ikisi de yok. Ayrıca olmayan bir "Trust & Safety ekibi" | **Vaat kaldırıldı** |
| Site haritası | Kaldırılmış özellikleri vaat ediyordu (görüntülenme grafiği, huni, satıcı seviyesi) ve şifre sıfırlamayı e-posta ile anlatıyordu | **Gerçeğe çekildi** |
| `robots.ts` | Kaldırılmış `/siparis` yolu listede duruyordu | **Silindi** |

### Faz 0 üçüncü geçişi — kapatılanlar

İkinci geçişten sonra farklı eksenlerden (uç/metot kapsaması, depoda yazılıp
okunmayan alanlar, boş tohum dizisinden okuyan fonksiyonlar) yapılan taramada
çıkanlar.

| Ne | Ne oluyordu | Karar |
|---|---|---|
| `Kullanici.chipler` | Herkese açık profilde "Ort. kargolama · 1 gün", "Yanıt süresi · ~1 saat", "%1 iptal" yazıyordu; üçü de kodda yazılı sabitti ve alıcı satıcı seçerken bunlara bakıyordu | **Kaldırıldı; ikisi sonradan ÖLÇÜLEREK geri geldi** (aşağıya bak) |
| `Kullanici.rozet` | "Güvenilir Satıcı" — satıcı seviyesi mekanizması yok; seviye tablosu `/satici-performansi`'nden tam bu yüzden kaldırılmıştı | **Kaldırıldı** |
| `Kullanici.uyelik` | "2023'ten beri Bulbana'da" — kayıt akışı da hesap açılış damgası da yok | **Kaldırıldı** |
| Sunum detayı › "Ort. kargolama" | Değer kodda sabit `"1 gün"`di | **Kaldırıldı** |
| Satıcı performansı başlığı | "Son 90 gün" yazıyordu; sayfada öyle bir filtre yok | **"Tüm zamanlar"** |
| `Talep.eklendi` | Her zaman `0` yazılıp hiç güncellenmiyordu: ilan tarihi her ilanda bugünü gösteriyor, Keşfet'te "En yeni"/"En eski" aynı sonucu veriyor, kart tarihi hep "Bugün" yazıyordu | **`gecenGun` / `yayinZamani`** damgadan türetir |
| İlan tarihi | Gün sayısına çevirip geri tarihe dönmek bir gün KAYDIRIYORDU (20 Ağustos'ta açılan ilan 21 Ağustos görünüyordu) | Damga doğrudan biçimlenir |
| Keşfet sıralaması | Karşılaştırma bileşenin içine gömülüydü, test edilemiyordu | `talepleriSirala` ayrıldı, test edildi |
| Sunum videosu | Oynatıcı KURGUYDU: "oynatılıyor... (temsili)", 42 saniyeye ayarlı sahte ilerleme çubuğu, kodda yazılı süre ve içerik açıklaması. Satıcı kanıt videosu yüklüyor, alıcı hiç izleyemiyordu | **Gerçek `<video controls>`** |
| Fotoğraf/video ayrımı | İkisi aynı `gorseller` dizisinde ve ayrılmıyordu: video yolu `<Image>` içine girip kırık kapak üretiyordu | `lib/gorsel.ts` → `videoYoluMu` / `sadeceFotograflar` / `sadeceVideolar` |
| İlan videosu | Form video kabul ediyor ama ilan sayfasında oynatan hiçbir şey yoktu | Oynatıcı eklendi |
| Sunum künyesi | "1 gün önce gönderdi" kodda sabitti | Damgadan |
| Sunum formu › marka/model | Uç kabul ediyor, künye okuyor, form GÖNDERMİYORDU — alıcı tarafı `urun.split(" ")` tahminine düşüyordu | Gövdeye eklendi |
| Muadil marka listesi | HER ZAMAN boştu (`kategoriMarkalari` boş tohum dizisini tarıyordu); satıcı yalnızca "Diğer" görüyordu | Ürün ağacına (`markalarFor`) bağlandı |
| `satis` / `zamanindaKargo` | Sunum kaydına donuyordu: satıcı sonradan on satış yapsa da alıcı eski sayıyı görüyordu | **Okuma anında tazeleniyor** |
| `/sunumum/[id]` | Her istekte 404 (boş diziden okuyan `getSunumum`) ve hiçbir yerden bağlantısı yoktu | **Kaldırıldı** |
| Adres formu | "Bulbana bu numaraya ödeme onayı için SMS şifresi gönderir" — SMS servisi yok | Metin düzeltildi |
| E-posta doğrulama / şifre sıfırlama | "Gelen kutunu kontrol et" diyordu; gerçek gönderim yok, kod kuyrukta | **Görünür prototip uyarısı** |
| Aldıklarım | "Ortalama sipariş · Kargo dahil" — kargo bedeli sistemden geçmiyor | **"Yalnızca ürün bedeli"** |
| Ölü kod | `talepler`, `SUNUM_YAPTIGIM_TALEPLER`, `getTalep`, `kategoriSayilari`, `Kategori.sayi`, `sunumlarim`, `getSunumum` — hepsi boş tohum dizisine bağlıydı | Kaldırıldı |

**Otomasyonla test ederken:** tarayıcı paneli gizliyken `requestAnimationFrame`
çalışmaz, dolayısıyla React'in yeniden render'ı da EKRANA YANSIMAZ. Bu turda
Keşfet sıralaması bu yüzden "bozuk" göründü; oysa çalışıyordu. Aynı tuzak
Suspense iskeleti için de geçerli (bkz. "Hata ve yükleme"). Ölçüm yapmadan
önce sekmeyi öne alın ya da mantığı saf bir fonksiyona çıkarıp birim testiyle
doğrulayın — ikincisi bu turda `talepleriSirala` ile yapıldı.

### Ölçülen iki süre: `lib/olcum.ts`

"Yanıt süresi" ve "Ort. kargolama" önce kaldırıldı (ölçülmüyorlardı), sonra
gerçekten ölçülüp geri kondu. İkisi de saf fonksiyon; girdiyi dışarıdan alır,
depoya dokunmaz, test edilebilir.

| Metrik | Nasıl hesaplanır |
|---|---|
| `ortalamaYanitSaati` | Her sohbette karşı tarafın mesaj BLOĞU ile kullanıcının ilk cevabı arasındaki süre bir ölçümdür; ortalaması alınır |
| `ortalamaKargoSaati` | Ödemenin alındığı an ile gönderinin kargoya verildiği an arasındaki fark; ortalaması alınır |

Üç ayrım önemli:

1. **Blok sayımı.** Karşı taraf üst üste üç mesaj yazıp cevap aldıysa bu ÜÇ
   değil BİR bekleyiştir ve süre ilk mesajdan işler. Her mesajı ayrı saymak,
   çok yazan kişinin muhatabını haksız yere yavaş gösterirdi.
2. **Kendi başlattığı sohbet sayılmaz.** İlk mesaj kullanıcıdaysa ortada
   beklenen bir yanıt yoktur.
3. **`ortKargoSaat` ile `zamanindaKargo` ayrı sorulardır.** İkincisi sözünde
   durup durmadığını söyler (yüzde), birincisi ne kadar hızlı olduğunu
   (saat). 3 gün söz verip 3 günde gönderen sözünde durmuştur ama hızlı
   değildir.

**Ölçüm yoksa `null`, `0` değil** — "0 saatte yanıtlıyor" ile "hiç ölçemedik"
aynı şey değildir; arayüz ikincisinde "—" gösterir. Bir saatin altındaki
süreler `0` değil `1` saat görünür: "0 saat" ekranda ölçüm yokmuş gibi durur.

Değerler kayda YAZILMAZ, okuma anında hesaplanır (`saticiMetrikleriniTazele`)
— `paraDurumu` ile aynı kural. Sunum karşılaştırmasındaki "Ort. yanıt süresi"
satırı (`GelenSunum.yanitSaat`) da buradan beslenir; o alan bir dönem her
sunuma sabit `2` yazıyordu.

### Faz 0 dördüncü geçişi — kapatılanlar

Bu tur hata yolları, yetki kontrolleri ve istemci/sunucu sınır uyumu
eksenlerinden gitti. Yetki tarafı temiz çıktı: üçüncü bir hesap başkasının
siparişini ilerletemiyor, adresini/sohbetini okuyamıyor, alarmını/bildirimini
silemiyor; imzasız kargo webhook'u 401 alıyor.

| Ne | Ne oluyordu | Karar |
|---|---|---|
| Sunum ucu › `fotolar` / `video` | İkisi de GÖVDEDEN okunuyor, gerçek `gorseller` dizisiyle karşılaştırılmıyordu: `{fotolar: 6, video: true, gorseller: []}` gönderen bir istek karşılaştırma tablosunda "6 fotoğraf · 1 video" gösterebiliyordu — alıcının kanıt diye baktığı sayı uydurulabilirdi | **Yüklenen dosyalardan sayılıyor** |
| Sunum açıklaması | Form 800 karaktere izin veriyor ve sayaç "0/800" diyordu; uç 600'e kırpıyordu. Satıcının yazdığı son 200 karakter sessizce kayboluyordu | Sınır uçla hizalandı |
| Adres tarifi | Form 160, uç 120: son 40 karakter sessizce gidiyordu — kesilen yer tarifin SONU, yani "zil çalışmıyor, arayın" gibi kargonun ulaşmasını sağlayan kısım | Uç 160'a yükseltildi |
| Footer | HER SAYFANIN altında "Ödemeler 256-bit SSL ile korunur" yazıyordu; ortada tahsil edilen ödeme yok ve SSL ürünün vaat edeceği bir şey değil, dağıtıma bağlı | Metin gerçeğe çekildi |

### Faz 0 beşinci geçişi

Bu tur belgenin kendi kurallarını koda karşı doğrulamakla geçti; hepsi
tutuyor: sayfalar `lib/depo.ts` çağırmıyor, client bileşenler `lib/veri.ts`
import etmiyor, aktarım tutarı kuyruğun içinde çekilebilir bakiyeyle
karşılaştırılıyor, zaman aşımı temizleyicileri her okuma kapısında
tetikleniyor, komisyon tek yerde tanımlı ve kayda yazılmıyor. Sayfa
başlıkları, üstveri kapsaması ve okunmamış mesaj sayacı da gerçek.

Tek bulgu, önceki turda tespit edilip açık bırakılan dosya silme sorunuydu:

| Ne | Ne oluyordu | Karar |
|---|---|---|
| `gorselleriSil` | Verilen her yolu diskten siliyordu, dosyanın BAŞKA bir kayıtta geçip geçmediğine bakmadan. Yükleme kaydı "kim yükledi" bilgisini tutmuyor ve uçlar gövdeden gelen yolları biçimi doğruysa kabul ediyor; ikisi birleşince kötü niyetli bir kullanıcı hedefin görsel yolunu kendi ilanına yazıp o ilanı silerek **hedefin ilan kapağını sildirebiliyordu**. Aynı şey kazara paylaşımda da oluyordu | **Süzgeç eklendi** (`kullanimDisiYollar`, 4 test) |

Kural: silme yalnızca **artık hiçbir kaydın işaret etmediği** dosyaya uygulanır
— talep, sunum ve destek eki listeleri birlikte taranır. Çağıran taraf kendi
kaydını ÖNCE yazmalıdır, yoksa dosya "hâlâ kullanılıyor" görünür ve yetim
kalır. `talepKaliciSil` bu yüzden sunum kayıtlarını temizlikten önce düşürür.

Kalıcı çözüm yüklemeye sahiplik eklemektir (kim yükledi + hangi kayda bağlı);
nesne deposuna geçilirken (Faz 1) o kayıt zaten gerekecek.

### Faz 0 kapanış turu — uçtan uca akış

Son kontrol, tek tek ekran yerine BAŞTAN SONA bir alışveriş yürüterek
yapıldı: ilan aç → sunum gönder → pazarlık → kabul → ödeme → kargo →
teslim → onay → para → değerlendirme. Veri önce tamamen yedeklendi, test
sonunda yedekten geri yüklendi; depoda iz kalmadı.

Akış boyunca doğrulananlar:

- Görselsiz ilan reddediliyor.
- Sunumdaki `fotolar: 5, video: true` beyanı yok sayıldı, kayda gerçek
  sayım geçti (`fotolar: 1, video: false`).
- `marka`/`model` kayda düştü (bir dönem gönderilmiyordu).
- Sipariş açılırken gövdedeki `tutar: 1` yok sayıldı; kayıt karşı tarafın
  son teklifiyle (9000) açıldı.
- Ödeme alınmadan kargo bilgisi girilemedi (409).
- Ödeme sonrası alıcının adresi satıcıya açıldı. *(O tur böyleydi; adres
  paylaşımı sonradan tamamen kaldırıldı — bkz. "Adres kimseye
  gösterilmez".)*
- Onay sonrası para satıcıya geçti: 9000 − %4 = **8640**.
- Değerlendirme sipariş bitince açıldı.
- Ölçülen süreler doğru çıktı: yanıtlayan tarafta "1 saat", ilk yazan
  tarafta "—" (kural: ilk yazanda bekleyiş yoktur).

| Bulunan tek şey | Karar |
|---|---|
| `/api/sunumlar` GET metrikleri tazelemiyordu: aynı sunum, sayfadan okununca güncel (`satis: 1`), uçtan okununca donmuş (`satis: 0`) dönüyordu — aynı soruya iki farklı cevap | Uç da `saticiMetrikleriniTazele`'den geçiyor |

### Faz 0 sekizinci geçişi — sessiz başarısızlıklar

Bu tur, o güne kadar yalnızca parça parça okunmuş büyük istemci
bileşenlerini baştan sona okumakla geçti. Cüzdan ve sipariş paneli temiz
çıktı (sipariş panelinde her istek `r.ok` ile kontrol ediliyor, hata
gösteriliyor ve `router.refresh()` ile sunucu durumu tazeleniyor).
Mesajlar ekranında dört sessiz başarısızlık bulundu — hepsi aynı sınıftan:
**ekran "oldu" diyor, sunucu ise reddetmiş.**

| Ne | Ne oluyordu | Karar |
|---|---|---|
| Teklif kabul | Kart "kabul edildi"ye çevriliyor, sipariş açılamazsa GERİ ALINMIYORDU: ekranda hem "Sipariş açılamadı" hatası hem "kabul edildi" kartı duruyor, kart artık "beklemede" olmadığı için kullanıcı yeniden de deneyemiyordu | Başarısızlıkta geri alınıyor |
| Sunum reddi | `PATCH /api/sunumlar/<id>` yanıtı HİÇ okunmuyordu. Sunucu reddetse bile ekran "Sunum reddedildi, satıcı yeniden sunum yapabilir" diyordu; kayıtta değişen bir şey yok, satıcı sunumu hâlâ "beklemede" görüyordu | Yanıt kontrol ediliyor, başarısızlıkta geri alınıyor |
| Mesaj gönderme | `if (!r.ok) return;` ile sessizce vazgeçiyordu ama çağıran taraf mesaj kutusunu ZATEN temizlemişti: kullanıcı yazdığını kaybediyor, hiçbir uyarı görmüyor, mesajın gittiğini sanıyordu | Başarı döndürülüyor; kutu ancak mesaj kayda geçince temizleniyor |
| Karşı teklif | Aynı desen: pencere kapanıyor, tutar siliniyor, teklif gitmiyordu | Aynı düzeltme |

Hatalar sohbete sistem satırı olarak düşüyor; sunucunun gerekçesi
gösteriliyor ("Bu sohbete yazamazsın", "Bu pazarlığın tarafı değilsin").

Bu, talep alarmı formunda çıkan hatanın aynısıydı: **ekranı güncellemeden
ve formu temizlemeden ÖNCE yanıtı bekle.** Yeni bir ekran yazarken kural
budur.

### Faz 0 dokuzuncu geçişi — kalan form ekranları

Sekizinci turda mesajlar ekranında çıkan sınıfın aynısı, kalan dört büyük
istemci bileşeninde arandı (`IlanAcForm`, `AyarlarClient`,
`TalepAlarmlariClient`, `SunumYapClient` — toplam ~6500 satır).

`TalepAlarmlariClient` ve `SunumYapClient` temiz çıktı; ilki zaten doğru
deseni kullanıyor (önce ekranda uygula, sunucu reddederse geri al).

| Ne | Ne oluyordu | Karar |
|---|---|---|
| Adres silme | DELETE yanıtı okunmuyordu: istek reddedilse bile toast **"Adres silindi."** diyor, hemen ardından liste tazelendiği için adres geri geliyordu — kullanıcı "silindi" yazısını görüp adresi listede buluyordu | Yanıt kontrol ediliyor |
| Adres varsayılan yapma | Hata yutuluyordu; kullanıcı hiçbir uyarı görmüyor, değişti sanıyordu | Yanıt kontrol ediliyor |
| Kart kaldırma | Adres silmenin aynısı: **"Kart kaldırıldı."** yanıttan bağımsız çıkıyordu | Yanıt kontrol ediliyor |
| Kart varsayılan yapma | Aynı sessiz hata | Yanıt kontrol ediliyor |
| İlan taslağı | `localStorage` yazması başarısız olsa bile toast **"Taslağın bu cihaza kaydedildi"** diyordu. Gizli sekmede ya da kotası dolu tarayıcıda kullanıcı kaydettiğini sanıp formu kapatıyor, geri döndüğünde hiçbir şey bulamıyordu | Yazma hatası ekranda söyleniyor |

Aynı dosyalarda form sınırları da yeniden tarandı (`maxLength` kullanan
alanlar önceki taramanın desenine takılmıyordu): cadde, apartman, kat,
daire, konum tarifi ve değerlendirme yorumu — hepsi uçtaki sınıra eşit ya
da ondan dar, yani sessiz kırpma yok. Değerlendirme yorumu sınırı iki
tarafta da aynı sabitten (`YORUM_SINIR`) okunuyor; doğru desen budur.

## İlan taslağı: `lib/taslak.ts`

Yarım kalmış İlan Aç formu tarayıcıda saklanır. Okuma/yazma/silme tek
kapıdan geçer; mantık bir dönem `IlanAcForm` içine gömülüydü ve taslağa
**yalnızca İlan Aç sayfası açıldığında** ulaşılabiliyordu — kullanıcı başka
bir sayfadaysa yarım kalmış ilanı olduğunu hiçbir yerden öğrenemiyordu.

Bugün iki giriş var:

| Nerede | Ne gösterir |
|---|---|
| Profilim › **Taslaklar (1)** | Başlık, kategori, fiyat ve "ne zaman kaydedildi"; "Düzenlemeye devam et" ve "Sil" |
| `/ilan-ac` açılışındaki çubuk | Aynı taslağı forma yükleme teklifi |

"Düzenlemeye devam et" `?taslak=yukle` ile gider ve form taslağı **açılışta
yükler**; kullanıcı orada bir kez daha "Taslağı yükle" demek zorunda kalmaz.

Üç ayrıntı bilinçli:

- **Düğme yalnızca taslak varken çıkar.** Her zaman görünüp çoğu zaman boş
  açılan bir düğme, kullanıcıyı olmayan bir şeye tıklatmak olurdu.
- **Kaydettikten hemen sonra çubuk gösterilmez.** Kullanıcı zaten formda;
  kendi az önce kaydettiği şey için "yarım kalmış taslağın var, yükle"
  demek kafa karıştırıyordu. Çubuk sayfa AÇILIŞINDA anlamlı.
- **Kısıtlar ekranda yazıyor:** taslak yalnızca o tarayıcıda tutulur, başka
  cihazdan görünmez, tarayıcı verisi silinince kaybolur ve fotoğraf/video
  taşınmaz. Bunları söylememek, olmayan bir yeteneği vaat etmek olurdu.

**Depo hook'la okunur** (`useTaslak` → `useSyncExternalStore`), `useEffect`
+ `setState` ile değil: React 19 effect içindeki senkron `setState`'i kaskad
render olarak uyarıyor ve `localStorage` zaten "harici depo" tanımına
giriyor. Yan fayda, taslak başka bir sekmede kaydedilir ya da silinirse
açık ekranların kendiliğinden güncellenmesi — aynı sekmedeki yazmalar için
modül kendi olayını yayar, çünkü tarayıcının `storage` olayı yazmayı yapan
sekmede tetiklenmez.

**Sunucuya taşınmalı** (Faz 1): bugün tek taslak tutuluyor ve anahtar sabit
— ikinci kez kaydetmek birincinin üstüne yazar. `talepler` tablosuna
`taslak` damgası eklemek hem cihaz bağımsızlığını hem çoklu taslağı hem de
fotoğrafların saklanmasını birlikte çözer.

**Kapatılmayan, bilinçli bırakılan:** `/hakkimizda` içindeki ekip bölümü
(dört uydurma isim) ve `kurumsal@bulbana.com` — gerçek bilgiyle
değiştirilmek üzere yer tutucu olarak duruyor. Aynı şekilde destek
sayfasındaki "hafta içi 09.00–18.00 · ortalama yanıt 2 saat": ölçülen bir
değer değil, hedeflenen bir hizmet sözü.

Ayrıca `Anlasma.kabulEden` ve birkaç kayıttaki `guncellendi` damgası
yazılıyor ama hiçbir yerde okunmuyor. İkisi de denetim izi; ölü alan
sayılırlar ama yanlış bilgi göstermiyorlar, o yüzden bırakıldı.
