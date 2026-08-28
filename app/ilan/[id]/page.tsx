import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  talepGetir,
  taleplerGetir,
  acikSunumumGetir,
  talebeGelenSunumlarGetir,
  siparislerGetir,
  epostaOnayliMi,
  telefonOnayliMi,
} from "@/lib/veri";
import { IlanDetay } from "@/components/IlanDetay";
import { anlasmaDurumu, itirazKapandiMi } from "@/lib/anlasma";
import { talebiGorebilir } from "@/lib/talep-durum";
import { istekOturumu } from "@/lib/oturum-sunucu";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const talep = await talepGetir(id);
  if (!talep) return { title: "Talep bulunamadı" };
  const aciklama = `${talep.ilce}, ${talep.il} · Alıcının belirlediği fiyat: ${talep.fiyatNum.toLocaleString("tr-TR")} TL. Uygun ürünün varsa sunumunu ilet.`;
  return {
    title: talep.baslik,
    description: aciklama,
    // Paylaşım kartı: ilan bağlantısı en çok paylaşılan şey, çıplak link
    // olarak gitmesin. Görseli `opengraph-image.tsx` üretir.
    openGraph: {
      type: "article",
      title: talep.baslik,
      description: aciklama,
      url: `/ilan/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: talep.baslik,
      description: aciklama,
    },
  };
}

// NOT: Burada bilerek `generateStaticParams` yok. İlanlar sürekli açılıp
// kapandığı için build anında sabitlemek yanlış olur — sayfa istek anında
// sunucuda render edilir. Trafik arttığında `export const revalidate = 60`
// ekleyerek ISR'ye geçilebilir.

export default async function IlanPage({ params }: Params) {
  const { id } = await params;
  const talep = await talepGetir(id);
  if (!talep) notFound();

  const hepsi = await taleplerGetir();
  const benzer = [
    ...hepsi.filter((t) => t.id !== id && t.kategori === talep.kategori),
    ...hepsi.filter((t) => t.id !== id && t.kategori !== talep.kategori),
  ].slice(0, 4);

  // Sonuçlanmamış sunumu olan satıcı ikinci kez sunum yapamaz; buton
  // bu yüzden sunucuda karara bağlanır.
  //
  // İlan detayı herkese açıktır, dolayısıyla oturumsuz ziyaretçide `ben`
  // null olur. Aşağıdaki kimlik karşılaştırmaları için boş dizeye
  // çevriliyor: ziyaretçi ne talebin sahibi ne de sunum yapanlardan biri
  // olduğu için her karşılaştırma doğru şekilde `false` verir.
  const ben = await istekOturumu();
  const benKimlik = ben ?? "";

  // Güven rozeti için: talep sahibinin e-postası doğrulanmış mı?
  const [sahipEpostaOnayli, sahipTelefonOnayli] = await Promise.all([
    epostaOnayliMi(talep.sahibi),
    telefonOnayliMi(talep.sahibi),
  ]);

  // Kapanışın üstünden bir gün geçtiyse ilan herkese açık değildir:
  // yalnızca talep sahibi ve o talebe sunum göndermiş satıcılar görebilir.
  const sunumYapanlar = (await talebeGelenSunumlarGetir(id)).map(
    (s) => s.satici,
  );
  if (!talebiGorebilir(talep, benKimlik, sunumYapanlar)) notFound();

  // Alışverişi biten talep listelerde 12 saat daha görünür ama detayı
  // açılmaz: doğrudan bağlantıyla gelen de yalnızca bu satırı görür.
  // Talebin sahibi ile o talebe sunum yapmış satıcılar hariç — onların
  // sohbet ve sipariş bağlamı sürüyor.
  const ilgili =
    talep.sahibi === benKimlik || sunumYapanlar.includes(benKimlik);
  if (talep.kapandi && !ilgili) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[1180px] items-center justify-center px-6 py-20">
        <p className="text-[18px] font-extrabold text-ink-900">
          Bu talep artık mevcut değil
        </p>
      </main>
    );
  }

  // Ziyaretçinin sunumu olmaz; sorgu hiç yapılmaz.
  const acikSunumum = ben ? await acikSunumumGetir(id, ben) : undefined;
  // Kabul edilen sunumun siparişi nerede: ödeme bekleniyor mu, ürün yolda mı?
  const tumAnlasmalar = await siparislerGetir();
  const anlasma = acikSunumum
    ? tumAnlasmalar.find((a) => a.sunumId === acikSunumum.id)
    : undefined;
  // Talep sahibi için: bu talepte hâlâ süren bir sipariş var mı? Varsa
  // talep yeniden yayına alınamaz (ödeme/kargo/onay bekleniyor).
  const surecDevam = tumAnlasmalar.some(
    (a) =>
      a.talepId === id &&
      !["tamamlandi", "sorunlu"].includes(anlasmaDurumu(a)),
  );

  return (
    <IlanDetay
      talep={talep}
      sahipEpostaOnayli={sahipEpostaOnayli}
      sahipTelefonOnayli={sahipTelefonOnayli}
      benzer={benzer}
      kendiIlanim={talep.sahibi === ben}
      acikSunumumId={acikSunumum?.id}
      sunumumKabulEdildi={acikSunumum?.sonuc === "kabul"}
      sunumumDurumu={anlasma ? anlasmaDurumu(anlasma) : undefined}
      sunumumItirazKapandi={anlasma ? itirazKapandiMi(anlasma) : false}
      surecDevam={surecDevam}
      kapandi={talep.kapandi}
    />
  );
}
