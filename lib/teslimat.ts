// ── Teslimat adresi ───────────────────────────────────────────────────
// Talep ilanında yalnızca il/ilçe/mahalle görünür; kapı numarası kimseye
// gösterilmez.
//
// KARŞI TARAFA DA GÖSTERİLMEZ. Burada bir dönem şu yazıyordu: "ödeme
// havuza girdikten sonra satıcı ürünü göndermek için tam adresi bilmek
// zorundadır". Zorunda değil — adresi bilmesi gereken taraf gönderen
// değil, KARGO FİRMASIDIR. Firma adresi sunucudan alır; gönderenin
// elindeki tek şey sipariş kodudur (bkz. lib/kargo-gonderi.ts).
//
// Tam adres talebin kendisinde DEĞİL, ayrı bir kayıtta tutulur:
// `/api/talepler` gibi herkese açık uçlar talebi döndürdüğünde adres
// yanlarında hiç gelmez. `/api/teslimat` de adresi yalnızca SAHİBİNE
// döndürür — alıcı kendi adresini görür, satıcı göremez.

export type TeslimatAdresi = {
  /** Hangi talebin teslimat adresi. */
  talepId: string;
  /** Alıcının kullanıcı adı — sahiplik kontrolü için. */
  alici: string;
  il: string;
  ilce: string;
  mahalle: string;
  cadde: string;
  apartman: string;
  kat: string;
  daire: string;
  /** Zil adı, giriş, yol tarifi… */
  tarif: string;
};

/**
 * Kargo etiketine yazılacak tek satırlık açık adres.
 *
 * YALNIZCA SUNUCUDA, yalnızca kargo firmasına giden istekte kullanılır
 * (bkz. lib/kargo-gonderi.ts → GonderiIstegi). Hiçbir uç bunun çıktısını
 * yanıt gövdesine koymamalı; ekranda gösterildiği yerler kaldırıldı.
 */
export function acikAdres(a: TeslimatAdresi): string {
  const bina = [
    a.apartman,
    a.kat && `Kat ${a.kat}`,
    a.daire && `Daire ${a.daire}`,
  ]
    .filter(Boolean)
    .join(" ");
  return [a.mahalle, a.cadde, bina, `${a.ilce}/${a.il}`]
    .filter(Boolean)
    .join(", ");
}
