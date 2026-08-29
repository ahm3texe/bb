// ── Oturum ────────────────────────────────────────────────────────────
// Bu dosya bir dönem "kim giriş yapmış?" sorusuna SABİT bir cevap
// veriyordu: `oturumKullaniciAdi()` her zaman `melih.k` döndürüyordu ve
// çerez bulunamadığında sunucu bu değere düşüyordu.
//
// Sonucu şuydu: hiç çerez göndermeyen anonim bir istemci de bir hesap
// adına iş yapabiliyordu — talep açmak, mesaj yazmak, ödeme işaretlemek
// dâhil. Yani kimlik doğrulaması yalnızca zayıf değil, isteğe bağlıydı.
//
// Varsayılan kaldırıldı. Artık tek bir kimlik kaynağı var:
//
//   lib/oturum-imza.ts   → çerezin sahte olmadığını doğrular (HMAC)
//   lib/kimlik.ts        → parolanın hesaba ait olduğunu doğrular
//   app/api/oturum       → ikisi tamamsa imzalı çerezi basar
//   lib/oturum-sunucu.ts → sunucunun okuma kapısı
//   proxy.ts             → oturumsuz isteği korumalı yollardan çevirir
//
// Bu dosya bilerek boş bırakıldı; buraya bir "varsayılan hesap" geri
// EKLENMEMELİ.

export {};
