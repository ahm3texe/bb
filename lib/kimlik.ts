// ── Kimlik doğrulama ──────────────────────────────────────────────────
// BACKEND SINIRI: "bu parola bu hesaba ait mi?" sorusunun tek cevap yeri.
//
// Bu modül oturumu AÇMAZ, yalnızca kimliği doğrular. Oturum çerezini basmak
// `app/api/oturum/route.ts`'in, çerezi imzalamak `lib/oturum-imza.ts`'in işi.

import { kimlikOku } from "./depo";
import { getKullanici } from "./kullanicilar";
import { parolaDogrula, parolaHashle } from "./parola";

/**
 * Hesabı olmayan bir kullanıcı adı için harcanan sahte doğrulama.
 *
 * Neden gerekli: kayıt bulunamadığında hemen `false` dönmek, var olan ve
 * olmayan kullanıcı adlarını YANIT SÜRESİNDEN ayırt edilebilir kılar
 * (scrypt yüz milisaniyeler alır, erken dönüş mikrosaniyeler). Saldırgan
 * böylece geçerli kullanıcı adlarını tek tek toplayabilirdi.
 *
 * Bu yüzden kayıt yoksa da aynı işi yapıyormuş gibi bekliyoruz.
 */
let sahteKayitSozu: Promise<string> | null = null;
function sahteKayit(): Promise<string> {
  // Süreç başına bir kez üretilir; her istekte yeniden hash'lemek gereksiz.
  sahteKayitSozu ??= parolaHashle("var-olmayan-hesap-icin-yer-tutucu");
  return sahteKayitSozu;
}

/**
 * Kullanıcı adı ve parola eşleşiyor mu?
 *
 * Başarısızlığın GEREKÇESİ döndürülmez — "böyle bir kullanıcı yok" ile
 * "parola yanlış" ayrımı, saldırgana hangi hesapların var olduğunu
 * söylemekten başka bir işe yaramaz.
 */
export async function kimlikDogrula(
  kullanici: string,
  parola: string,
): Promise<boolean> {
  // Bilinmeyen kullanıcı adı da olsa doğrulama işi yapılır (bkz. sahteKayit).
  const kayit = getKullanici(kullanici)
    ? await kimlikOku(kullanici)
    : undefined;

  if (!kayit) {
    await parolaDogrula(parola, await sahteKayit());
    return false;
  }
  return parolaDogrula(parola, kayit.parolaHash);
}
