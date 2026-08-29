// ── Ürün ağacı ────────────────────────────────────────────────────────
// Talep açarken Tür → Çeşit → Marka → Model alanlarını besleyen bağımlı
// seçim kaynağı. Zincir dört kademeli:
//
//   Kategori (sitedeki kategoriler)
//     └─ Tür        (ör. Elektronik → Bilgisayar)
//          └─ Çeşit (ör. Bilgisayar → Dizüstü)
//               └─ Marka (ör. Dizüstü → Apple)
//                    └─ Model (ör. Apple → MacBook Air M2)
//
// MARKA VE MODEL KADEMELERİ BU DOSYADA TUTULMAZ.
// Bir dönem burada elle tutuldular (~2.000 marka, ~31.000 satır) ama bu
// dosyayı dört `"use client"` bileşen statik olarak import ediyor; sabit
// bir nesne tree-shake edilemediği için 872 KB'lik marka ağacı her
// ziyaretçinin JS paketine giriyordu. Marka/model verisi Faz 1'de
// veritabanına taşınacak ve seçim yapıldıkça uçtan çekilecek.
//
// Kategori → Tür → Çeşit kademeleri burada kalır: küçük, sabit ve
// arayüzün ilk render'ında gerekli.
//
// Çeşit altı boş olduğu için Marka ve Model alanları şu an serbest metin
// kutusu olarak çalışır; kimse liste eksik diye talep açamaz duruma düşmez.
//
// İstisna: "Koleksiyon & Değerli Eşyalar" kategorisinde dördüncü kademe
// marka değil, malzeme/dönem bilgisidir (Altın, Gümüş, Osmanlı Dönemi …);
// o yüzden orada durmaya devam eder.

/** kategori → tür → çeşit → marka → modeller */
export type UrunAgaci = Record<
  string,
  Record<string, Record<string, Record<string, string[]>>>
>;

export const urunAgaci: UrunAgaci = {
  Elektronik: {
    Bilgisayar: {
      // Türkiye pazarında (Trendyol, sahibinden vb.) dizüstü satan
      // markalar — alfabetik. Liste genel bilgiyle yazıldı, dış siteden
      // kazınmadı. Model listesi boş olan markada model alanı serbest
      // metne düşer; böylece liste eksik diye kimse takılmaz.
      // Dizüstü markaları ve modelleri — alfabetik.
      //
      // İSİMLENDİRME KURALI: yalnızca üreticinin resmi model adı yazılır.
      // Ekran boyutu ancak adın parçasıysa geçer (Dell XPS 13, Legion 5
      // gibi); "16 inç" türü ekler yazılmaz — kullanıcı onu başlıkta
      // kendisi belirtir. Yapılandırma (RAM/SSD) da modelin parçası
      // değildir.
      //
      // Kapsam: markaların güncel ve ikinci elde yaygın model serileri.
      // Her yapılandırma değil, resmi model adları. Liste genel bilgiyle
      // yazıldı; dış siteden kazıma yok.
      Dizüstü: {},
      // Masaüstü markaları ve modelleri — alfabetik. Dizüstüyle aynı
      // isimlendirme kuralı: yalnızca resmi model/seri adı; ekran boyutu
      // ya da yapılandırma adın parçası değilse yazılmaz. Kasa, hepsi bir
      // arada (AiO) ve mini PC'ler aynı listede.
      Masaüstü: {},
      // Monitör markaları ve modelleri — alfabetik. Aynı isimlendirme
      // kuralı: yalnızca resmi seri/model adı. Monitörlerde boyut ve
      // çözünürlük ürün kodunun parçası olabilir (ör. Odyssey G5), ama
      // "27 inç" gibi ekler yazılmaz — kullanıcı başlıkta belirtir.
      // Monitör markaları ve modelleri. Monitörde ürünler seri adıyla
      // değil MODEL KODUYLA satılıyor (VG249Q, 27GN800 gibi); ikinci elde
      // de böyle aranıyor, o yüzden kodlar yazıldı. Ekran boyutu kodun
      // içinde olduğu için ayrıca "27 inç" yazılmaz.
      Monitör: {},
    },
    // Oyun & konsol artık ana kategori değil, elektroniğin bir türü:
    // konsol da bilgisayar gibi bir elektronik ürün ve alıcı burada
    // arıyor.
    // Oyun & konsol artık ana kategori değil, elektroniğin bir türü.
    // Çeşitler platforma göre ayrılır: konsol pazarı marka etrafında
    // döner, alıcı "PS5 arıyorum" diye arıyor.
    //
    // İsimlendirme kuralı aynı: resmi model adı. Depolama (825 GB),
    // paket içeriği (oyunlu, çift kollu) ve bölge kodu modelin parçası
    // değil; kullanıcı başlıkta belirtir.
    "Oyun & Konsol": {
      PlayStation: {},
      Xbox: {},
      Atari: {},
      "Sanal Gerçeklik / VR": {},
      Nintendo: {},
      Sega: {},
      "Arcade Oyun Sistemi": {},
      "Oyun Kolu": {},
      Diğer: {},
    },
    // Telefon kendi türü. Çeşitler kullanım biçimine göre ayrılır:
    // akıllı telefonun marka/model listesi çok geniş, tuşlu ve sabit
    // telefonlar bambaşka bir pazar — aynı listede toplanınca alıcı
    // aradığını daraltamıyor.
    "Cep Telefonu": {
      // Akıllı telefon markaları ve modelleri — alfabetik.
      // İsimlendirme kuralı aynı: resmi model adı. Hafıza/RAM (128 GB,
      // 8/256), renk ve şebeke (4G/5G) modelin parçası değil; kullanıcı
      // başlıkta belirtir. "5G" yalnızca üreticinin adında ayırt edici
      // olarak geçiyorsa yazılır. Kapsam: hâlâ satılan ve ikinci elde
      // yaygın dolaşan modeller.
      "Akıllı Telefon": {},
      // Tuşlu telefon markaları ve modelleri — alfabetik. Bu pazar hâlâ
      // canlı: dayanıklı "kamp telefonu", yaşlı kullanıcı telefonu ve
      // koleksiyonluk kapaklı modeller ayrı ayrı aranıyor.
      "Tuşlu Telefon": {},
      // Telsiz (DECT) telefonlar — ev ve ofis kullanımı. Modeller üretici
      // kodlarıyla satılıyor; kod modelin kendisidir.
      "Telsiz Telefon": {},
      // Ankesörlü telefonlar — koleksiyon ve iş yeri kullanımı. Bu
      // ürünlerin çoğu kamuya açık model koduyla değil ödeme tipiyle
      // anılıyor; uydurma kod yazmak yerine tip yazıldı.
      "Ankesörlü Telefon": {},
            Diğer: {},
    },
    // Tablet kendi türü. Çeşitler işletim sistemine göre ayrılır: alıcı
    // "iPad mi Android mi" diye daraltabiliyor ve marka listeleri
    // birbirine karışmıyor.
    //
    // İsimlendirme kuralı aynı: resmi model adı. Hafıza, renk ve şebeke
    // (Wi-Fi / LTE) modelin parçası değil; kullanıcı başlıkta belirtir.
    // Ekran boyutu ancak resmi adın parçasıysa yazılır (iPad Pro 11).
    Tablet: {
      iPadOS: {},
      Android: {},
      Windows: {},
    },
    // Kamera türünün çeşitleri. Optik ürünler (teleskop, mikroskop,
    // dürbün) ayrı bir pazar ama alıcı bunları da kamera tarafında
    // arıyor; markaların çoğu zaten ortak (Nikon, Bresser, Celestron).
    //
    // İsimlendirme kuralı aynı: resmi model adı. Kit lens, megapiksel ve
    // renk modelin parçası değil; kullanıcı başlıkta belirtir.
    Kamera: {
      "Dijital Fotoğraf Makinesi": {},
      "Analog Fotoğraf Makinesi": {},
      "Video Kamera": {},
      "Aksiyon ve 360° Kamera": {},
      "Güvenlik ve İzleme Kamerası": {},
      "Teleskop, Mikroskop & Dürbün": {},
      // Lens, tripod, ışık, mikrofon, filtre, çanta ve hafıza kartı
      // markaları aynı listede: alıcı "kamera aksesuarı" diye arıyor.
      "Kamera Aksesuarları": {},
      Diğer: {},
    },
    // Ev elektroniği türünün çeşitleri. İsimlendirme kuralı aynı: resmi
    // model/seri adı. TV'de ekran boyutu (55", 65") ve klimada kapasite
    // (12.000 BTU) modelin parçası değil — kullanıcı başlıkta belirtir.
    // Türk üreticilerde ürünler çoğu zaman seri adıyla anılır; o hâlde
    // seri adı yazıldı.
    "Ev Elektroniği": {
      Televizyon: {},
      "Ses Sistemi": {},
      "Sinema Sistemi": {},
      Klima: {},
      Süpürge: {},
      Diğer: {},
    },
    // Aksesuar artık bilgisayarın altında bir çeşit değil, kendi türü:
    // webcam, çanta, ped gibi ürünler yalnızca bilgisayara bağlı değil ve
    // marka listeleri birbirine karışmasın diye çeşitlere ayrıldı.
    Aksesuarlar: {
      // Klavye, mouse ve kulaklık aksesuar türünün altında: bilgisayar
      // seçmeden de aranabilmeliler. Her biri ayrı çeşit, çünkü tek bir
      // "aksesuar" listesinde marka kalabalığı alıcıyı daraltamıyordu.
      // Klavye markaları ve modelleri — alfabetik. Aynı isimlendirme
      // kuralı: resmi seri/model adı. Anahtar tipi (mavi/kırmızı switch),
      // boyut (%60, TKL) ve dil düzeni modelin parçası değil; kullanıcı
      // bunları başlıkta ve açıklamada belirtir.
      // Klavye markaları ve modelleri — alfabetik. Aynı isimlendirme
      // kuralı: resmi seri/model adı. Anahtar tipi (mavi/kırmızı switch),
      // boyut (%60, TKL) ve dil düzeni (Q/F) modelin parçası değil;
      // kullanıcı bunları başlıkta ve açıklamada belirtir. "TKL" yalnızca
      // üreticinin resmi adında geçiyorsa yazılır (G915 TKL gibi).
      Klavye: {},
      // Mouse markaları ve modelleri — alfabetik. Aynı isimlendirme
      // kuralı: resmi model adı. Sensör, DPI, kablosuz/kablolu ayrımı ve
      // renk modelin parçası değil; kullanıcı başlıkta belirtir. "Wireless"
      // yalnızca üreticinin resmi adında geçiyorsa yazılır.
      // Mouse markaları ve modelleri — alfabetik. Aynı isimlendirme
      // kuralı: resmi model adı. Sensör, DPI, ağırlık ve renk modelin
      // parçası değil; kullanıcı başlıkta belirtir. "Wireless" yalnızca
      // üreticinin resmi adının parçasıysa yazılır (Katar Elite Wireless).
      Mouse: {},
      // Kulaklık markaları ve modelleri — alfabetik. Aynı isimlendirme
      // kuralı: resmi model adı. Bağlantı tipi (kablosuz/USB/3.5mm),
      // renk ve mikrofon varyantı modelin parçası değil; kullanıcı
      // başlıkta belirtir. "Wireless" yalnızca resmi adın parçasıysa
      // yazılır (Cloud Alpha Wireless gibi).
      // Kulaklık markaları ve modelleri — alfabetik. Oyuncu, stüdyo,
      // günlük kullanım ve kablosuz kulak içi ürünler aynı listede.
      // İsimlendirme kuralı: resmi model adı. Bağlantı tipi, renk ve
      // mikrofon varyantı modelin parçası değil; kullanıcı başlıkta
      // belirtir. "Wireless" yalnızca resmi adın parçasıysa yazılır.
      Kulaklık: {},
      // Webcam markaları ve modelleri — alfabetik. İsimlendirme kuralı
      // aynı: resmi model adı. Çözünürlük (1080p/4K) ve kare hızı modelin
      // parçası değil; kullanıcı başlıkta belirtir. Yalnızca üreticinin
      // adında geçiyorsa yazılır (Brio 4K Stream Edition gibi).
      Webcam: {},
      // Çanta & kılıf markaları ve modelleri — alfabetik. Bu kategoride
      // ürünlerin çoğu seri adıyla satılıyor (Targus CityGear, Case Logic
      // Huxton gibi); model adı olmayan ürünlerde en azından ürün tipi
      // yazılır. Ekran boyutu (14"/15,6") modelin parçası değil —
      // kullanıcı başlıkta belirtir.
      "Çanta & Kılıf": {},
      // Mousepad markaları ve modelleri — alfabetik. İsimlendirme kuralı
      // aynı: resmi model adı. Boyut (S/M/L/XL/XXL), yüzey tipi (kumaş,
      // cam, hybrid) ve RGB varyantı modelin parçası değil; kullanıcı
      // başlıkta belirtir. Yalnızca üreticinin adında geçiyorsa yazılır
      // (QcK Prism, Firefly V2 gibi).
      Mousepad: {},
      // Listede karşılığı olmayan aksesuarlar buraya düşer; marka ve
      // model alanları serbest metin olarak çalışır.
      Diğer: {},
    },
  },
  // Saat kategorisinde tek tür var; ayrım çeşit kademesinde yapılıyor:
  // kol saati ile duvar saatinin markaları da alıcı kitlesi de ayrı.
  Saat: {
    Saat: {
      // Lüks İsviçre markaları, Japon kuvars üreticileri, akıllı saatler
      // ve Türkiye'de yaygın moda markaları aynı listede — alıcı hepsini
      // kol saati altında arıyor.
      "Kol Saati": {},
      // Akıllı saat ayrı çeşit: alıcı "Apple Watch" ya da "Galaxy Watch"
      // diye arıyor ve karşılaştırdığı şey klasik kol saati değil, başka
      // bir akıllı saat. Spor saatleri ve akıllı bilekliği de kapsar.
      "Akıllı Saat": {},
      // Cep saatinin büyük kısmı ikinci el ve koleksiyon: eski Amerikan
      // ve İsviçre üreticileri hâlâ en çok aranan isimler.
      "Cep Saati": {},
      // Köstekli saat cep saatiyle aynı ürün ailesinden; zincirli
      // satılanlar ayrı aranıyor, bu yüzden ayrı çeşit.
      "Köstekli Saat": {},
      // Duvar saatinde saat üreticileri ve ev dekorasyon markaları bir
      // arada; ikisi de aynı rafta satılıyor.
      "Duvar Saati": {},
      // Masa saatinde klasik çalar saatlerin yanında akıllı ekranlı
      // modeller de var; ikisi de masa üstünde kullanılıyor.
      "Masa Saati": {},
      // Takı saatinde ürün önce mücevher, sonra saat: moda ve kuyum
      // markaları burada toplanıyor.
      "Takı Saati": {},
      // Kum saati büyük ölçüde markasız/dekoratif satılıyor; aşağıdakiler
      // gerçekten kum saati üreten ev eşyası ve hediyelik markaları.
      // Listeyi zorlamak yerine gerçek olanlar yazıldı.
      "Kum Saati": {},
      Diğer: {},
    },
  },
  // Giyim ağacı. Kategori adı sitedeki kategori listesiyle birebir aynı
  // olmalı ("Giyim & Aksesuar"), yoksa tür listesi bu kategoride
  // görünmez. Marka listeleri çeşide göre değişir: kürkte deri
  // markaları, formada spor markaları, medikal giyimde forma
  // üreticileri. Model kademesi giyimde anlamlı olmadığı için boş
  // bırakıldı — kullanıcı bedeni ve modeli başlıkta yazıyor.
  "Giyim & Aksesuar": {
    "Üst Giyim": {
      Tişört: {},
      Gömlek: {},
      Bluz: {},
      Sweatshirt: {},
      Kazak: {},
      Hırka: {},
      Süveter: {},
      Tunik: {},
      Body: {},
      "Crop Top": {},
      Atlet: {},
      Büstiyer: {},
      "Polo Yaka": {},
      Diğer: {},
    },
    "Alt Giyim": {
      Pantolon: {},
      Jean: {},
      "Eşofman Altı": {},
      Tayt: {},
      Şort: {},
      Etek: {},
      Kapri: {},
      Diğer: {},
    },
    "Tek Parça ve Takımlar": {
      Elbise: {},
      Abiye: {},
      Tulum: {},
      Salopet: {},
      "Eşofman Takımı": {},
      "İkili Takım": {},
      "Üçlü Takım": {},
      "Takım Elbise": {},
      Kostüm: {},
      Diğer: {},
    },
    "Dış Giyim": {
      Ceket: {},
      Blazer: {},
      Mont: {},
      Kaban: {},
      Trençkot: {},
      Parka: {},
      Yağmurluk: {},
      Yelek: {},
      Panço: {},
      Pelerin: {},
      "Şişme Mont": {},
      "Deri Ceket": {},
      Kürk: {},
      Diğer: {},
    },
    "İç Giyim ve Ev Giyimi": {
      Sütyen: {},
      Külot: {},
      Boxer: {},
      Slip: {},
      Fanila: {},
      İçlik: {},
      Korse: {},
      Jartiyer: {},
      Gecelik: {},
      Pijama: {},
      Sabahlık: {},
      "Ev Elbisesi": {},
      Diğer: {},
    },
    "Spor ve Plaj Giyimi": {
      "Sporcu Sütyeni": {},
      "Spor Tişörtü": {},
      "Spor Şortu": {},
      "Spor Taytı": {},
      Forma: {},
      Mayo: {},
      Bikini: {},
      Tankini: {},
      "Deniz Şortu": {},
      Pareo: {},
      "Plaj Elbisesi": {},
      Diğer: {},
    },
    "Özel Giyim": {
      Gelinlik: {},
      Damatlık: {},
      Nişanlık: {},
      "Mezuniyet Elbisesi": {},
      "Hamile Giyimi": {},
      "Emzirme Giyimi": {},
      "İş Kıyafeti": {},
      Üniforma: {},
      "Medikal Giyim": {},
      "Geleneksel Giyim": {},
      "Dans Kıyafeti": {},
      "Cosplay / Kostüm": {},
      Diğer: {},
    },
  },
  // Koleksiyon ağacı. Türler önce ANLAM grubuna, grup içinde alfabetik
  // sıraya göre dizildi.
  //
  // ÇEŞİT EKSENİ GRUBA GÖRE DEĞİŞİR — alıcıyı daraltan bilgi her
  // ailede başka: takıda materyal ("altın yüzük"), koleksiyon
  // eşyasında alt tür ("diecast araba"), yazılı belgede dönem
  // ("Osmanlı fermanı"). Tek tip bir eksen üçünde de işe yaramıyordu.
  "Koleksiyon & Değerli Eşyalar": {
    // ── Takı ve mücevher: çeşit = materyal ──
    "Bileklik & Bilezik": {
      Altın: {},
      "Beyaz Altın": {},
      "Rose Altın": {},
      Gümüş: {},
      Platin: {},
      Paladyum: {},
      Pırlantalı: {},
      "Kıymetli Taşlı": {},
      "Doğal Taş & Mineral": {},
      "İnci & Sedef": {},
      Kehribar: {},
      Mercan: {},
      Çelik: {},
      Titanyum: {},
      "Pirinç & Bakır": {},
      "Altın Kaplama": {},
      "Gümüş Kaplama": {},
      "Emaye & Mine": {},
      "Ahşap & Deri": {},
      "Cam & Kristal": {},
      Diğer: {},
    },
    Broş: {
      Altın: {},
      "Beyaz Altın": {},
      "Rose Altın": {},
      Gümüş: {},
      Platin: {},
      Paladyum: {},
      Pırlantalı: {},
      "Kıymetli Taşlı": {},
      "Doğal Taş & Mineral": {},
      "İnci & Sedef": {},
      Kehribar: {},
      Mercan: {},
      Çelik: {},
      Titanyum: {},
      "Pirinç & Bakır": {},
      "Altın Kaplama": {},
      "Gümüş Kaplama": {},
      "Emaye & Mine": {},
      "Ahşap & Deri": {},
      "Cam & Kristal": {},
      Diğer: {},
    },
    Kolye: {
      Altın: {},
      "Beyaz Altın": {},
      "Rose Altın": {},
      Gümüş: {},
      Platin: {},
      Paladyum: {},
      Pırlantalı: {},
      "Kıymetli Taşlı": {},
      "Doğal Taş & Mineral": {},
      "İnci & Sedef": {},
      Kehribar: {},
      Mercan: {},
      Çelik: {},
      Titanyum: {},
      "Pirinç & Bakır": {},
      "Altın Kaplama": {},
      "Gümüş Kaplama": {},
      "Emaye & Mine": {},
      "Ahşap & Deri": {},
      "Cam & Kristal": {},
      Diğer: {},
    },
    Küpe: {
      Altın: {},
      "Beyaz Altın": {},
      "Rose Altın": {},
      Gümüş: {},
      Platin: {},
      Paladyum: {},
      Pırlantalı: {},
      "Kıymetli Taşlı": {},
      "Doğal Taş & Mineral": {},
      "İnci & Sedef": {},
      Kehribar: {},
      Mercan: {},
      Çelik: {},
      Titanyum: {},
      "Pirinç & Bakır": {},
      "Altın Kaplama": {},
      "Gümüş Kaplama": {},
      "Emaye & Mine": {},
      "Ahşap & Deri": {},
      "Cam & Kristal": {},
      Diğer: {},
    },
    Piercing: {
      Altın: {},
      "Beyaz Altın": {},
      "Rose Altın": {},
      Gümüş: {},
      Platin: {},
      Paladyum: {},
      Pırlantalı: {},
      "Kıymetli Taşlı": {},
      "Doğal Taş & Mineral": {},
      "İnci & Sedef": {},
      Kehribar: {},
      Mercan: {},
      Çelik: {},
      Titanyum: {},
      "Pirinç & Bakır": {},
      "Altın Kaplama": {},
      "Gümüş Kaplama": {},
      "Emaye & Mine": {},
      "Ahşap & Deri": {},
      "Cam & Kristal": {},
      Diğer: {},
    },
    "Takı Seti": {
      Altın: {},
      "Beyaz Altın": {},
      "Rose Altın": {},
      Gümüş: {},
      Platin: {},
      Paladyum: {},
      Pırlantalı: {},
      "Kıymetli Taşlı": {},
      "Doğal Taş & Mineral": {},
      "İnci & Sedef": {},
      Kehribar: {},
      Mercan: {},
      Çelik: {},
      Titanyum: {},
      "Pirinç & Bakır": {},
      "Altın Kaplama": {},
      "Gümüş Kaplama": {},
      "Emaye & Mine": {},
      "Ahşap & Deri": {},
      "Cam & Kristal": {},
      Diğer: {},
    },
    Yüzük: {
      Altın: {},
      "Beyaz Altın": {},
      "Rose Altın": {},
      Gümüş: {},
      Platin: {},
      Paladyum: {},
      Pırlantalı: {},
      "Kıymetli Taşlı": {},
      "Doğal Taş & Mineral": {},
      "İnci & Sedef": {},
      Kehribar: {},
      Mercan: {},
      Çelik: {},
      Titanyum: {},
      "Pirinç & Bakır": {},
      "Altın Kaplama": {},
      "Gümüş Kaplama": {},
      "Emaye & Mine": {},
      "Ahşap & Deri": {},
      "Cam & Kristal": {},
      Diğer: {},
    },
    // ── Koleksiyon eşyaları: çeşit = alt tür ──
    Dekorasyon: {
      "Tablo & Resim": {},
      Ayna: {},
      Vazo: {},
      "Biblo & Heykelcik": {},
      Şamdan: {},
      "Duvar Saati": {},
      Aydınlatma: {},
      Çerçeve: {},
      "Kutu & Sandık": {},
      "Duvar Panosu": {},
      Maske: {},
      "Harita & Küre": {},
      "Gravür & Baskı": {},
      "Mum & Buhurdan": {},
      Paravan: {},
      Diğer: {},
    },
    Enstrüman: {
      "Akustik Gitar": {},
      "Elektro Gitar": {},
      "Bas Gitar": {},
      "Klasik Gitar": {},
      "Bağlama & Saz": {},
      "Ud & Kanun": {},
      "Keman & Viyola": {},
      "Çello & Kontrbas": {},
      Piyano: {},
      "Org & Synthesizer": {},
      Akordeon: {},
      "Davul & Perküsyon": {},
      "Darbuka & Cajon": {},
      "Flüt & Ney": {},
      "Klarnet & Saksafon": {},
      "Trompet & Trombon": {},
      "Mızıka & Melodika": {},
      "Amfi & Efekt": {},
      "Stüdyo Ekipmanı": {},
      Diğer: {},
    },
    "Ev & Mimari": {
      "Kapı & Kapı Aksamı": {},
      "Pencere & Vitray": {},
      "Karo & Çini": {},
      "Aydınlatma & Avize": {},
      "Merdiven & Korkuluk": {},
      "Şömine & Ocak": {},
      "Sütun & Başlık": {},
      "Bahçe & Peyzaj": {},
      "Musluk & Armatür": {},
      "Kilit & Anahtar": {},
      "Yapı Taşı & Tuğla": {},
      "Ahşap Oyma & Tavan": {},
      "Kitabe & Taş Yazıt": {},
      Diğer: {},
    },
    "İmzalı Ürünler": {
      "İmzalı Kitap": {},
      "İmzalı Fotoğraf": {},
      "İmzalı Poster & Afiş": {},
      "İmzalı Forma": {},
      "İmzalı Top & Ekipman": {},
      "İmzalı Plak & CD": {},
      "İmzalı Enstrüman": {},
      "İmzalı Kart": {},
      "İmzalı Mektup": {},
      "İmzalı Program & Bilet": {},
      "Sertifikalı (COA) Ürün": {},
      "İmzalı Tablo": {},
      Diğer: {},
    },
    Madalya: {
      "Askeri Madalya": {},
      "Nişan & Liyakat": {},
      "Harp Madalyası": {},
      "İstiklal Madalyası": {},
      "Spor Madalyası": {},
      "Olimpiyat Madalyası": {},
      "Hatıra Madalyası": {},
      "Okul & Kurum Madalyası": {},
      "Rozet & Arma": {},
      "Şilt & Plaket": {},
      Kupa: {},
      "Yabancı Madalya": {},
      Diğer: {},
    },
    Mobilya: {
      "Osmanlı & Sedefli": {},
      "Art Deco": {},
      "Art Nouveau": {},
      "Barok & Rokoko": {},
      "Midcentury Modern": {},
      Bauhaus: {},
      "Rustik & Country": {},
      Endüstriyel: {},
      "Vitrin & Konsol": {},
      "Sandık & Şifonyer": {},
      "Koltuk & Kanepe": {},
      "Masa & Sehpa": {},
      Sandalye: {},
      "Yatak & Karyola": {},
      Gardırop: {},
      "Büro & Yazıhane": {},
      Diğer: {},
    },
    Obje: {
      Porselen: {},
      "Cam & Kristal": {},
      "Seramik & Çini": {},
      "Gümüş Obje": {},
      "Bakır & Pirinç": {},
      "Ahşap Obje": {},
      "Mermer & Taş": {},
      "Bronz Heykel": {},
      "Antika Saat": {},
      Tespih: {},
      "Pipo & Çakmak": {},
      "Kalem & Yazı Takımı": {},
      "Antika Fotoğraf Makinesi": {},
      "Antika Telefon & Radyo": {},
      "Terazi & Ölçü Aleti": {},
      "Pusula & Denizcilik": {},
      Diğer: {},
    },
    Oyuncak: {
      "Diecast Araba": {},
      "Maket & Kit": {},
      "Aksiyon Figürü": {},
      Bebek: {},
      Peluş: {},
      "Teneke Oyuncak": {},
      "Tahta Oyuncak": {},
      "Lego & Yapı Blokları": {},
      "Kutu Oyunu": {},
      Puzzle: {},
      "Model Tren": {},
      "Uzaktan Kumandalı": {},
      "Funko Pop": {},
      "Kinder & Sürpriz": {},
      "Beyblade & Topaç": {},
      "Oyun Kartı": {},
      Diğer: {},
    },
    Para: {
      "Osmanlı Sikkesi": {},
      "Selçuklu & Beylik Sikkesi": {},
      "Antik & Bizans Sikke": {},
      "Cumhuriyet Madeni Para": {},
      "Cumhuriyet Kağıt Para": {},
      "Emisyon Serisi": {},
      "Hatıra Parası": {},
      "Altın Sikke (Reşat, Ata)": {},
      "Külçe & Gram Altın": {},
      "Yabancı Madeni Para": {},
      "Yabancı Kağıt Para": {},
      "Hisse Senedi & Tahvil": {},
      "Jeton & Fiş": {},
      "Hata Baskı": {},
      "Set & Albüm": {},
      Diğer: {},
    },
    Tekstil: {
      Halı: {},
      Kilim: {},
      "Cicim & Sumak": {},
      Seccade: {},
      "İşleme & Nakış": {},
      "Dantel & Oya": {},
      "Yazma & Örtü": {},
      "Kumaş & Top Kumaş": {},
      "Şal & Eşarp": {},
      "Geleneksel Giysi": {},
      "Üniforma & Askeri": {},
      "Bayrak & Sancak": {},
      "Yorgan & Örtü": {},
      "Çanta & Heybe": {},
      Diğer: {},
    },
    // ── Yazılı ve basılı ürünler: çeşit = dönem ──
    Belge: {
      "Osmanlı Dönemi": {},
      "Selçuklu & Beylikler": {},
      "Cumhuriyet (1923-1950)": {},
      "1950-1980": {},
      "1980-2000": {},
      "2000 Sonrası": {},
      "Yabancı & Uluslararası": {},
      "Tarihsiz & Belirsiz": {},
      Diğer: {},
    },
    Bilet: {
      "Osmanlı Dönemi": {},
      "Selçuklu & Beylikler": {},
      "Cumhuriyet (1923-1950)": {},
      "1950-1980": {},
      "1980-2000": {},
      "2000 Sonrası": {},
      "Yabancı & Uluslararası": {},
      "Tarihsiz & Belirsiz": {},
      Diğer: {},
    },
    Çizim: {
      "Osmanlı Dönemi": {},
      "Selçuklu & Beylikler": {},
      "Cumhuriyet (1923-1950)": {},
      "1950-1980": {},
      "1980-2000": {},
      "2000 Sonrası": {},
      "Yabancı & Uluslararası": {},
      "Tarihsiz & Belirsiz": {},
      Diğer: {},
    },
    Ferman: {
      "Osmanlı Dönemi": {},
      "Selçuklu & Beylikler": {},
      "Cumhuriyet (1923-1950)": {},
      "1950-1980": {},
      "1980-2000": {},
      "2000 Sonrası": {},
      "Yabancı & Uluslararası": {},
      "Tarihsiz & Belirsiz": {},
      Diğer: {},
    },
    Gazete: {
      "Osmanlı Dönemi": {},
      "Selçuklu & Beylikler": {},
      "Cumhuriyet (1923-1950)": {},
      "1950-1980": {},
      "1980-2000": {},
      "2000 Sonrası": {},
      "Yabancı & Uluslararası": {},
      "Tarihsiz & Belirsiz": {},
      Diğer: {},
    },
    Kitap: {
      "Osmanlı Dönemi": {},
      "Selçuklu & Beylikler": {},
      "Cumhuriyet (1923-1950)": {},
      "1950-1980": {},
      "1980-2000": {},
      "2000 Sonrası": {},
      "Yabancı & Uluslararası": {},
      "Tarihsiz & Belirsiz": {},
      Diğer: {},
    },
    Diğer: {},
  },
};

/**
 * Yıl listesi — içinde bulunulan yıldan 1950'ye kadar.
 * Kategoriye bağlı değil; ikinci el pazarında her ürün için geçerli.
 * Liste uzun olduğu için seçim kutusu otomatik arama alanı gösterir.
 */
export function yillar(): string[] {
  const buYil = new Date().getFullYear();
  const out: string[] = [];
  for (let y = buYil; y >= 1950; y--) out.push(String(y));
  return out;
}

/**
 * Renk listesi — kategoriden bağımsız, sabit palet.
 *
 * SADE TUTULDU: önce 57 renk vardı; "Uzay Grisi", "Vizon", "Petrol
 * Mavisi" gibi ayrımlar seçimi zorlaştırıyor ve iki kullanıcı aynı
 * ürüne farklı ad verince kriter eşleşmesi tutmuyordu. Şimdi ana renkler
 * + ikinci elde gerçekten ayrı aranan birkaç ton var. Kullanıcı özel
 * tonu (mint yeşili, bebe mavisi) başlıkta yazabiliyor.
 *
 * Sıra göze göre: nötrler, metalikler, sonra renk çemberi.
 */
export const RENKLER = [
  // Nötrler
  "Siyah",
  "Antrasit",
  "Gri",
  "Beyaz",
  "Krem",
  "Bej",
  "Kahverengi",
  // Metalikler
  "Gümüş",
  "Altın",
  "Rose Gold",
  // Renkler
  "Lacivert",
  "Mavi",
  "Turkuaz",
  "Yeşil",
  "Sarı",
  "Turuncu",
  "Kırmızı",
  "Bordo",
  "Pembe",
  "Mor",
  // Özel
  "Şeffaf",
  "Çok Renkli",
  "Renk Farketmez",
] as const;

/** Kategoriye ait türler. Liste yoksa boş dizi → alan serbest metin olur. */
export function turlerFor(kategori: string): string[] {
  return Object.keys(urunAgaci[kategori] ?? {});
}

/** Tür altındaki çeşitler. */
export function cesitlerFor(kategori: string, tur: string): string[] {
  return Object.keys(urunAgaci[kategori]?.[tur] ?? {});
}

/**
 * Çeşit altındaki markalar — alfabetik (Türkçe sıralama: Ç, Ğ, İ, Ö, Ş, Ü
 * doğru yere düşsün). "Diğer" her zaman sonda kalır: o bir marka değil,
 * listede bulunamayanlar için çıkış kapısı.
 *
 * Sıralama veride değil BURADA yapılıyor; böylece ağaca yeni marka
 * eklerken sırayı düşünmek gerekmiyor.
 */
export function markalarFor(
  kategori: string,
  tur: string,
  cesit: string,
): string[] {
  const hepsi = Object.keys(urunAgaci[kategori]?.[tur]?.[cesit] ?? {});
  const diger = hepsi.filter((m) => m === "Diğer");
  return [
    ...hepsi
      .filter((m) => m !== "Diğer")
      .sort((a, b) => a.localeCompare(b, "tr")),
    ...diger,
  ];
}

/**
 * Giyimde "model" diye standart bir ürün kimliği yok; alıcı kesimi ve
 * bedeni zaten başlıkta yazıyor. Onun yerine bu slot CİNSİYET olarak
 * kullanılıyor: alan adı da seçenekleri de kategoriye göre değişir.
 * Böylece kriter karşılaştırması anlamlı çalışır — kadın tişört arayana
 * kadın tişört sunumu "uyuyor" sayılır.
 */
export const CINSIYETLER = [
  "Kadın",
  "Erkek",
  "Kız Çocuk",
  "Erkek Çocuk",
  "Bebek",
  "Unisex",
] as const;

/**
 * Giyimde "yıl" bilgisi anlamsız: kimse tişörtü üretim yılına göre
 * aramıyor, bedene göre arıyor. Bu yüzden aynı slot giyimde BEDEN
 * tutuyor — model slotunun cinsiyete dönüşmesiyle aynı mantık.
 */
export const BEDENLER = [
  // Harf bedenler
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  // Sayısal bedenler
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
  "52",
  "54",
  "56",
  // Çocuk
  "Çocuk 2-3 Yaş",
  "Çocuk 4-5 Yaş",
  "Çocuk 6-7 Yaş",
  "Çocuk 8-9 Yaş",
  "Çocuk 10-11 Yaş",
  "Çocuk 12-13 Yaş",
  // Bebek
  "Bebek 0-3 Ay",
  "Bebek 3-6 Ay",
  "Bebek 6-12 Ay",
  "Bebek 12-18 Ay",
  "Bebek 18-24 Ay",
  // Genel
  "Standart / Tek Beden",
  "Beden Farketmez",
] as const;

/** Bu kategoride yıl slotu beden mi tutuyor? */
export function yilSlotuBedenMi(kategori: string): boolean {
  return kategori === "Giyim & Aksesuar";
}

/** Yıl alanının ekranda görünen adı — giyimde "Beden". */
export function yilEtiketi(kategori: string): string {
  return yilSlotuBedenMi(kategori) ? "Beden" : "Yıl";
}

/** Yıl alanının seçenekleri — giyimde beden listesi. */
export function yilSecenekleriFor(kategori: string): string[] {
  return yilSlotuBedenMi(kategori) ? [...BEDENLER] : yillar();
}

/** Bu kategoride model slotu cinsiyet mi tutuyor? */
export function modelSlotuCinsiyetMi(kategori: string): boolean {
  return kategori === "Giyim & Aksesuar";
}

/** Model alanının ekranda görünen adı — giyimde "Cinsiyet". */
export function modelEtiketi(kategori: string): string {
  return modelSlotuCinsiyetMi(kategori) ? "Cinsiyet" : "Model";
}

/** Marka altındaki modeller. */
export function modellerFor(
  kategori: string,
  tur: string,
  cesit: string,
  marka: string,
): string[] {
  // Giyimde liste markadan bağımsız: her markada aynı cinsiyet seçenekleri.
  if (modelSlotuCinsiyetMi(kategori)) return [...CINSIYETLER];
  return urunAgaci[kategori]?.[tur]?.[cesit]?.[marka] ?? [];
}
