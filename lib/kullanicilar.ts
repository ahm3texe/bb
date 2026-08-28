// ── Kullanıcılar ──────────────────────────────────────────────────────
// Bulbana'da her hesap hem alır hem satar; bu yüzden tek bir kullanıcı
// kaydı vardır, alıcı/satıcı ayrımı sadece o işlemdeki role bakar.
// Profil sayfaları (/profil/[kullanici]) buradan beslenir.

import type { AliciMetrik } from "./alici-kalitesi";

export type Yorum = {
  /** Yorumu yazan kullanıcı adı. */
  yazan: string;
  harf: string;
  urun: string;
  tarih: string;
  /** 1-5 arası puan. */
  puan: number;
  text: string;
};

export type Kullanici = {
  /** URL'de ve arayüzde görünen benzersiz kullanıcı adı. */
  kullanici: string;
  /** Avatar baş harfleri. */
  harf: string;
  /** Gerçek ad — yalnızca sipariş/fatura akışlarında kullanılır. */
  ad: string;
  konum: string;
  bio: string;
  /** Yıldız ortalaması (0-5). */
  puan: number;
  degerlendirme: number;
  /** Satıcı tarafı metrikleri. */
  tamamlananSatis: number;
  /**
   * Sözünde durduğu kargo yüzdesi. Hiç gönderisi yoksa `null` — "%0"
   * göstermek, henüz kargolamamış bir satıcıyı sözünde durmamış gibi
   * gösterirdi. Değer `kullaniciMetrikleriGetir` ile hesaplanır.
   */
  zamanindaKargo: number | null;
  /**
   * Mesajlara ortalama yanıt süresi (saat) ve ödemeden kargoya kadar geçen
   * ortalama süre (saat). İkisi de ÖLÇÜLÜR (bkz. lib/olcum.ts); ölçüm
   * yoksa `null` ve arayüz "—" gösterir.
   *
   * Bu iki değer bir dönem `chipler` içinde "Yanıt süresi · ~1 saat" ve
   * "Ort. kargolama · 1 gün" diye KODA GÖMÜLÜ sabitlerdi.
   */
  ortYanitSaat: number | null;
  ortKargoSaat: number | null;
  /** Alıcı tarafı davranış metrikleri — Kullanıcı Kalitesi hesabını besler. */
  aliciMetrik: AliciMetrik;
  /*
   * DOĞRULAMA BAYRAKLARI BURADA TUTULMAZ.
   *
   * `telefonOnayli` ve `epostaOnayli` alanları vardı ama hiçbir hesapta
   * doldurulmuyordu; ilan sayfasındaki "doğrulanmış" rozetleri bu yüzden
   * hiçbir zaman render edilmiyordu — ölü bir arayüz dalıydı.
   *
   * E-posta doğrulaması gerçek bir akışa bağlandı (bkz. app/api/eposta);
   * durumu `lib/depo.ts` → `hesapEpostasiOku` söyler. Telefon doğrulaması
   * için bir mekanizma YOK, o yüzden rozeti de yok.
   */
  /*
   * ÖLÇÜLMEYEN ETİKETLER DE BURADA TUTULMAZ.
   *
   * Üç alan daha vardı ve üçü de herkese açık profil kartında GÖRÜNÜYORDU:
   *
   *   • `chipler` — "Ort. kargolama · 1 gün", "Yanıt süresi · ~1 saat",
   *     "%1 iptal". Hiçbiri ölçülmüyordu; kodda yazılı sabitlerdi. Alıcı
   *     bunlara bakıp satıcı seçiyordu.
   *   • `rozet` — "Güvenilir Satıcı". Satıcı seviyesi diye bir mekanizma
   *     yok; `/satici-performansi`'ndeki seviye tablosu tam da bu yüzden
   *     kaldırılmıştı.
   *   • `uyelik` — "2023'ten beri Bulbana'da". Kayıt akışı yok, hesabın
   *     açılış tarihi diye bir kayıt da yok.
   *
   * Bu, `GelenSunum.saticiTipi` / `yanitSaat` için verilen kararın aynısı:
   * ÖLÇÜLMEYEN DEĞER GÖSTERİLMEZ. Gerçek karşılıkları üretildiğinde
   * (ölçülen yanıt süresi, hesap açılış damgası, kurallı satıcı seviyesi)
   * geri gelirler — uydurma değerle değil.
   */
  yorumlar: Yorum[];
};

export const kullanicilar: Kullanici[] = [
  {
    kullanici: "plakdukkani34",
    harf: "PD",
    ad: "Deniz Aslan",
    konum: "Beyoğlu, İstanbul",
    bio: "Fiziksel dükkanı olan plak/CD satıcısıyım. İmzalı ve koleksiyonluk baskılarda sertifika (COA) sağlarım; tüm sunumlarımda kanıt fotoğrafı bulunur. Aynı gün kargo.",
    puan: 0,
    degerlendirme: 0,
    tamamlananSatis: 0,
    zamanindaKargo: 0,
    // Tohum kayıtta ölçüm yok; gerçek değerler `kullaniciProfilGetir`
    // içinde hesaplanıp bindirilir (bkz. lib/olcum.ts).
    ortYanitSaat: null,
    ortKargoSaat: null,
    aliciMetrik: {
      puanOrtalamasi: 0,
      degerlendirmeSayisi: 0,
      olumluYorum: 0,
      olumsuzYorum: 0,
      tamamlananAlim: 0,
      iptalEdilenAlim: 0,
      sunumYanitOrani: 0,
    },
    yorumlar: [],
  },
  {
    kullanici: "melih.k",
    harf: "MK",
    ad: "Melih Kurt",
    konum: "Nilüfer, Bursa",
    bio: "Konsol ve plak topluyorum. Aradığımı bulunca hızlı hareket ederim.",
    puan: 0,
    degerlendirme: 0,
    tamamlananSatis: 0,
    zamanindaKargo: 0,
    // Tohum kayıtta ölçüm yok; gerçek değerler `kullaniciProfilGetir`
    // içinde hesaplanıp bindirilir (bkz. lib/olcum.ts).
    ortYanitSaat: null,
    ortKargoSaat: null,
    aliciMetrik: {
      puanOrtalamasi: 0,
      degerlendirmeSayisi: 0,
      olumluYorum: 0,
      olumsuzYorum: 0,
      tamamlananAlim: 0,
      iptalEdilenAlim: 0,
      sunumYanitOrani: 0,
    },
    yorumlar: [],
  },
  {
    kullanici: "ayse.demir",
    harf: "AD",
    ad: "Ayşe Demir",
    konum: "Konak, İzmir",
    bio: "Elektronik ve ev aletlerinde alım yapıyorum. Faturalı, kutulu ve defosuz ürünleri tercih ederim.",
    puan: 0,
    degerlendirme: 0,
    tamamlananSatis: 0,
    zamanindaKargo: 0,
    // Tohum kayıtta ölçüm yok; gerçek değerler `kullaniciProfilGetir`
    // içinde hesaplanıp bindirilir (bkz. lib/olcum.ts).
    ortYanitSaat: null,
    ortKargoSaat: null,
    aliciMetrik: {
      puanOrtalamasi: 0,
      degerlendirmeSayisi: 0,
      olumluYorum: 0,
      olumsuzYorum: 0,
      tamamlananAlim: 0,
      iptalEdilenAlim: 0,
      sunumYanitOrani: 0,
    },
    yorumlar: [],
  },
];

const kullaniciHaritasi = new Map(kullanicilar.map((k) => [k.kullanici, k]));

/**
 * ADRES ÜRETİMİ BURADAN KALDIRILDI.
 *
 * `hesapEpostasi()` adresi kullanıcı adından uyduruyordu
 * (`melih.k@eposta.com`) ve `epostaOnayliMi()` aşağıdaki `epostaOnayli`
 * alanına bakıyordu — o alan hiçbir hesapta dolu değildi, yani e-posta
 * bildirimi diye bir özellik vardı ve hiç çalışmıyordu.
 *
 * Adres artık kullanıcıdan alınıp doğrulanıyor; kaynağı `lib/depo.ts`
 * (`hesapEpostasiOku`). Bu dosya yalnızca profil verisini tutar.
 */

export function getKullanici(kullanici: string): Kullanici | undefined {
  return kullaniciHaritasi.get(kullanici);
}
