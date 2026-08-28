// ── Kayıtlı adresler ──────────────────────────────────────────────────
// Kart bilgileri gibi adres de hesaba bağlı saklanır: kullanıcı her
// talepte şehir/ilçe/mahalle üçlüsünü baştan seçmek zorunda kalmasın.
//
// Kayıt TAM adrestir: cadde, apartman, kat, daire ve tarif de içerir.
// (Yorum eskiden "yalnızca konum bilgisidir" diyordu — tipte kapı numarası
// dururken bu yanlıştı ve gizlilik açısından tehlikeli bir yanılgıydı.)
// Taşımadığı tek şey teslimat kimliğidir: alıcı adı ve telefon burada yok.
//
// Bu kayıt yalnızca sahibine gösterilir. Talep ilanında ondan yalnızca
// il/ilçe/mahalle üçlüsü kullanılır (`adresKonumu`); kapı numarası ilanda
// asla görünmez ve satıcıya ancak ödeme alındıktan sonra, iade adresi ise
// yalnızca ürünü geri gönderme süresi boyunca açılır (bkz. lib/teslimat.ts
// ve app/api/teslimat/route.ts).

/** Bir hesapta tutulabilecek en fazla adres sayısı. */
export const EN_FAZLA_ADRES = 5;

export type KayitliAdres = {
  id: string;
  /** Adresin sahibi — başka kullanıcının adresi okunamaz. */
  kullanici: string;
  /** Başlık — Ev, İş… */
  ad: string;
  il: string;
  ilce: string;
  mahalle: string;
  /** Cadde / sokak. */
  cadde: string;
  /** Apartman / site adı — elle yazılır. */
  apartman: string;
  /** Kat — elle yazılır. */
  kat: string;
  /** Daire no — elle yazılır. */
  daire: string;
  /** Bina, kapı no, kat gibi tarif. */
  tarif: string;
  varsayilan: boolean;
};

/** Listede görünen tek satırlık özet. */
export function adresOzeti(a: KayitliAdres): string {
  const bina = [
    a.apartman,
    a.kat && `Kat ${a.kat}`,
    a.daire && `Daire ${a.daire}`,
  ]
    .filter(Boolean)
    .join(" ");
  return [a.mahalle, a.cadde, bina, a.tarif].filter(Boolean).join(", ");
}

/** İlan formunun kullandığı konum üçlüsü. */
export function adresKonumu(a: KayitliAdres): {
  il: string;
  ilce: string;
  mahalle: string;
} {
  return { il: a.il, ilce: a.ilce, mahalle: a.mahalle };
}
