// ── Dosya içeriği doğrulaması ─────────────────────────────────────────
// Yükleme ucu türü `dosya.type`'tan okuyordu — o değer tarayıcının BEYANI.
// İstemci onu istediği gibi yazabilir: `.exe` içeriğini `image/png` diye
// gönderirsen beyaz liste seni geçirir ve dosya `.png` uzantısıyla
// `public/` altına yazılır.
//
// Beyaz liste beyanı süzüyordu, içeriği değil. Bu modül içeriğe bakar:
// her dosya biçiminin başında kendine özgü bir imza (magic bytes) vardır ve
// bu imza dosyanın gerçekten ne olduğunu söyler.

/** Bayt dizisi verilen konumdan itibaren eşleşiyor mu? */
function baslarMi(ham: Uint8Array, imza: number[], konum = 0): boolean {
  if (ham.length < konum + imza.length) return false;
  return imza.every((b, i) => ham[konum + i] === b);
}

/** ASCII metnin baytları — okunabilirlik için. */
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/**
 * İçeriğe bakarak MIME türünü çıkarır. Tanınmayan biçimde `null`.
 *
 * Yalnızca sitede kabul edilen türler tanınır; amaç genel bir tür tespiti
 * değil, "beyan edilen tür gerçekten bu mu?" sorusunu yanıtlamak.
 */
export function icerikTuru(ham: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (baslarMi(ham, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // PNG: 89 "PNG" CR LF 1A LF
  if (baslarMi(ham, [0x89, ...ascii("PNG"), 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  // GIF: "GIF87a" ya da "GIF89a"
  if (baslarMi(ham, ascii("GIF8"))) return "image/gif";
  // WEBP: "RIFF" ???? "WEBP"
  if (baslarMi(ham, ascii("RIFF")) && baslarMi(ham, ascii("WEBP"), 8))
    return "image/webp";
  // WEBM (Matroska): 1A 45 DF A3
  if (baslarMi(ham, [0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";

  // MP4 / MOV: 4 bayt boyut + "ftyp" + marka. Markayı ayırt etmek gerekiyor
  // çünkü ikisi de aynı kapsayıcı ailesinden.
  if (baslarMi(ham, ascii("ftyp"), 4)) {
    const marka = String.fromCharCode(...ham.slice(8, 12));
    if (marka === "qt  ") return "video/quicktime";
    return "video/mp4";
  }

  return null;
}

/**
 * Beyan edilen tür içerikle uyuşuyor mu?
 *
 * MP4 ve MOV aynı kapsayıcıyı paylaşır ve marka alanı üreticiye göre
 * değişebilir; ikisi birbirinin yerine kabul edilir. Diğer türlerde
 * eşleşme birebir aranır.
 */
export function icerikBeyanaUyuyorMu(
  ham: Uint8Array,
  beyan: string,
): boolean {
  const gercek = icerikTuru(ham);
  if (!gercek) return false;
  if (gercek === beyan) return true;
  const mp4Ailesi = new Set(["video/mp4", "video/quicktime"]);
  return mp4Ailesi.has(gercek) && mp4Ailesi.has(beyan);
}
