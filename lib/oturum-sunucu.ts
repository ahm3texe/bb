import { cookies } from "next/headers";
import { getKullanici } from "./kullanicilar";
import { OTURUM_CEREZI, oturumCoz } from "./oturum-imza";

// ── Sunucu tarafı oturum ──────────────────────────────────────────────
// BACKEND SINIRI. Sunucunun "kim istek yapıyor?" sorusuna verdiği cevap.
//
// ESKİ HÂLİ VE NEDEN DEĞİŞTİ: çerez düz metindi (`bb_aktif_kullanici=melih.k`)
// ve istemci tarafından yazılabiliyordu; üstelik çerez yoksa sabit bir
// varsayılan hesaba düşülüyordu. İki sonucu vardı:
//   1. Tarayıcı konsoluna tek satır yazan herkes istediği hesap olabiliyordu.
//   2. Hiç çerez göndermeyen anonim bir istemci bile bir hesap adına iş
//      yapabiliyordu — talep açmak, mesaj yazmak, ödeme işaretlemek dâhil.
// Sahiplik, taraf olma ve destek rolü kontrollerinin HEPSİ bu değere
// dayandığı için ikisi birden bütün yetki katmanını geçersiz kılıyordu.
//
// Artık çerez sunucuda HMAC ile imzalanıyor (bkz. lib/oturum-imza.ts),
// httpOnly olarak basılıyor ve VARSAYILANA DÜŞÜLMÜYOR: oturum yoksa
// kimlik de yoktur.

/** Oturum gerektiren bir yerde oturum bulunamadı. */
export class OturumYokHatasi extends Error {
  constructor() {
    super("Bu işlem için giriş yapılmış olması gerekiyor.");
    this.name = "OturumYokHatasi";
  }
}

/**
 * İsteği yapan kullanıcı — YOKSA `null`.
 *
 * Oturumun bulunmaması normal olan yerler için: herkese açık sayfalar
 * (ana sayfa, keşfet, ilan detayı, ziyaretçi profili) ziyaretçiye de
 * render edilir ve kişiselleştirmeyi atlar.
 */
export async function istekOturumu(): Promise<string | null> {
  let ham: string | undefined;
  try {
    ham = (await cookies()).get(OTURUM_CEREZI)?.value;
  } catch {
    // cookies() bazı bağlamlarda kullanılamaz — oturum yok sayılır.
    return null;
  }

  const kullanici = oturumCoz(ham);
  if (!kullanici) return null;
  // İmza geçerli olsa bile hesabın hâlâ var olması gerekir: silinen bir
  // hesabın çerezi süresi dolana kadar geçerli kalmamalı.
  return getKullanici(kullanici) ? kullanici : null;
}

/**
 * İsteği yapan kullanıcının adı. Oturum yoksa HATA FIRLATIR.
 *
 * Korumalı sayfa ve uçlar bunu kullanır. Oraya oturumsuz bir isteğin
 * ulaşmaması gerekiyor — kapı `proxy.ts` içinde, isteğin en başında.
 * Buradaki fırlatma o kapının arkasındaki ikinci savunma katmanıdır:
 * kapı bir gün yanlış yapılandırılırsa istek sessizce yanlış hesap adına
 * çalışmak yerine gürültülü biçimde durur.
 *
 * Oturumsuzluğun normal olduğu yerlerde `istekOturumu()` kullanın.
 */
export async function istekKullaniciAdi(): Promise<string> {
  const kullanici = await istekOturumu();
  if (!kullanici) throw new OturumYokHatasi();
  return kullanici;
}
