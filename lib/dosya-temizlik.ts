// ── Yüklenen dosyaların temizliği ─────────────────────────────────────
// Talep ya da sunum silindiğinde görselleri de gitmeli; yoksa sunucuda
// hiçbir kaydın işaret etmediği dosyalar birikir.
//
// BACKEND SINIRI: bugün dosyalar `public/yuklemeler/` altında duruyor.
// Nesne deposuna (S3/Supabase) geçilince yalnızca bu modülün içi değişir.

import { promises as fs } from "node:fs";
import path from "node:path";

const HEDEF = path.join(process.cwd(), "public", "yuklemeler");

/** Verilen web yollarını (/yuklemeler/...) diskten siler. */
export async function gorselleriSil(yollar: (string | undefined)[]): Promise<void> {
  for (const yol of yollar) {
    if (!yol || !yol.startsWith("/yuklemeler/")) continue;
    // Dosya adı kayıttan gelir ama yine de yol geçişine karşı sadeleştirilir.
    const ad = path.basename(yol);
    await fs.unlink(path.join(HEDEF, ad)).catch(() => undefined);
  }
}
