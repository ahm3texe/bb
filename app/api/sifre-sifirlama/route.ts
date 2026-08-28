import { NextResponse } from "next/server";
import {
  hesapEpostasiOku,
  kimlikYaz,
  sifirlamaKoduTuket,
  sifirlamaKoduYaz,
  epostaKuyrukEkle,
  SIFIRLAMA_SURESI_MS,
} from "@/lib/depo";
import { getKullanici } from "@/lib/kullanicilar";
import { parolaHashle, parolaKuralHatasi } from "@/lib/parola";
import { hizSinirla, SAAT } from "@/lib/hiz-siniri";
import { tekSatir } from "@/lib/metin";

export const dynamic = "force-dynamic";

/**
 * Parola sıfırlama.
 *
 * BU AKIŞ YOKTU. `/sifre-sifirlama` sayfası 231 satırdı ve tek bir sunucu
 * çağrısı yapmıyordu; giriş ekranındaki "Şifremi unuttum" oraya götürüyordu.
 * Parolasını unutan kullanıcının hesabına dönmesinin hiçbir yolu yoktu.
 *
 * POST → kod ister (doğrulanmış e-postaya gider)
 * PUT  → kodu tüketip yeni parolayı yazar
 *
 * OTURUM GEREKTİRMEZ: zaten giriş yapamayan kullanıcı içindir. Bu yüzden
 * `proxy.ts` içindeki açık uçlar listesinde yer alır.
 */

/**
 * Hesabın var olup olmadığı SIZDIRILMAZ.
 *
 * "Böyle bir kullanıcı yok" demek, saldırgana hangi kullanıcı adlarının
 * gerçek olduğunu söylemekten başka işe yaramaz. Bu yüzden istek her hâlükârda
 * aynı yanıtı döner; kod yalnızca gerçekten gönderilebiliyorsa gönderilir.
 */
const AYNI_YANIT = {
  gonderildi: true,
  mesaj:
    "Hesap bulunduysa doğrulanmış e-posta adresine sıfırlama kodu gönderildi.",
};

export async function POST(istek: Request) {
  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const kullanici = tekSatir(g.kullanici, 60);
  if (!kullanici)
    return NextResponse.json({ hata: "Kullanıcı adı gerekli." }, { status: 400 });

  // Kod gönderimi pahalı ve kötüye kullanılabilir: hem hesap başına sınır.
  const hiz = hizSinirla(`sifirlama:${kullanici}`, 5, SAAT);
  if (!hiz.izin) return NextResponse.json(AYNI_YANIT);

  const hesap = getKullanici(kullanici);
  const eposta = hesap ? await hesapEpostasiOku(kullanici) : undefined;

  // Doğrulanmış adres yoksa kodu gönderecek yer yok. Kullanıcıya bunu
  // söylemiyoruz (hesap varlığını sızdırır); destek üzerinden çözülür.
  if (!hesap || !eposta?.dogrulandi) return NextResponse.json(AYNI_YANIT);

  const token = await sifirlamaKoduYaz(kullanici);
  await epostaKuyrukEkle({
    id: `sifirlama-${token}`,
    kime: eposta.adres,
    konu: "Bulbana — parola sıfırlama kodu",
    govde: [
      `${kullanici} hesabının parolasını sıfırlamak için kodu gir:`,
      "",
      token,
      "",
      `Kod ${Math.round(SIFIRLAMA_SURESI_MS / 60000)} dakika geçerlidir.`,
      "Bu isteği sen yapmadıysan yok sayabilirsin; parolan değişmez.",
    ].join("\n"),
    zaman: new Date().toISOString(),
    durum: "kuyrukta",
  }).catch(() => undefined);

  return NextResponse.json(AYNI_YANIT);
}

export async function PUT(istek: Request) {
  const g = (await istek.json().catch(() => ({}))) as Record<string, unknown>;
  const kullanici = tekSatir(g.kullanici, 60);
  const token = tekSatir(g.token, 80);
  const yeni = typeof g.yeni === "string" ? g.yeni : "";

  if (!kullanici || !token)
    return NextResponse.json(
      { hata: "Kullanıcı adı ve kod gerekli." },
      { status: 400 },
    );

  // Kod tahmin edilemesin.
  const hiz = hizSinirla(`sifirlama-kod:${kullanici}`, 10, SAAT);
  if (!hiz.izin)
    return NextResponse.json(
      { hata: "Çok fazla deneme yaptın. Biraz sonra tekrar dene." },
      { status: 429 },
    );

  const kuralHatasi = parolaKuralHatasi(yeni);
  if (kuralHatasi)
    return NextResponse.json({ hata: kuralHatasi }, { status: 400 });

  const sonuc = await sifirlamaKoduTuket(kullanici, token);
  if (sonuc === "gecersiz")
    return NextResponse.json({ hata: "Kod geçersiz." }, { status: 400 });
  if (sonuc === "suresi-doldu")
    return NextResponse.json(
      { hata: "Kodun süresi doldu. Yeni kod iste." },
      { status: 410 },
    );

  await kimlikYaz(kullanici, await parolaHashle(yeni));
  return NextResponse.json({ guncellendi: true });
}
