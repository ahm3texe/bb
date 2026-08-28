import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Proxy varken Next, istek gövdesini birden çok kez okunabilsin diye
     * BELLEKTE tamponlar. Varsayılan tavan 10 MB ve aşan gövde sessizce
     * KIRPILIR — istek hata bile döndürmez, yalnızca bozuk bir multipart
     * gövde route handler'a ulaşır ve `formData()` çöker.
     *
     * Yükleme ucunun kendi tavanı 24 MB (bkz. app/api/yukle/route.ts →
     * MAX_TOPLAM_BYTE); buradaki pay multipart sınırları ve başlıklar için.
     *
     * NEDEN DAHA YÜKSEK DEĞİL: bu tampon isteğin belleğe alınan İKİNCİ
     * kopyası. Yüz megabaytlık videoyu bu mimariden geçirmek, tek istekle
     * süreci düşürmenin ucuz bir yolu olur. Büyük dosya yüklemesinin doğru
     * yolu nesne deposuna (S3/Supabase Storage) DOĞRUDAN yüklemektir —
     * bkz. BACKEND.md.
     */
    proxyClientMaxBodySize: "26mb",
  },
};

export default nextConfig;
