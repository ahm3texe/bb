// 5 üzerinden yıldız puanı — yan yana yıldızlar, puana göre kısmi dolu.
//
// İlan detayındaki talep sahibi kartında doğmuştu; sunum detayındaki kimlik
// kartı da aynı görsel dili kullansın diye buraya taşındı. İki ekranda iki
// ayrı puan gösterimi (bir yerde yıldız dizisi, ötekinde tek "★") olmasın.
export function Yildizlar({ puan }: { puan: number }) {
  const yuzde = Math.max(0, Math.min(100, (puan / 5) * 100));
  const yildiz = (
    <svg
      viewBox="0 0 24 24"
      className="h-[16px] w-[16px] flex-none"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.4l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.4l-5.9 3.1 1.13-6.57L2.45 9.34l6.6-.96z" />
    </svg>
  );
  return (
    <span
      className="relative inline-flex flex-none"
      role="img"
      aria-label={`5 üzerinden ${puan} yıldız`}
    >
      <span className="flex text-[#d7d1e4]">
        {yildiz}
        {yildiz}
        {yildiz}
        {yildiz}
        {yildiz}
      </span>
      <span
        className="absolute inset-0 flex overflow-hidden text-star"
        style={{ width: `${yuzde}%` }}
      >
        {yildiz}
        {yildiz}
        {yildiz}
        {yildiz}
        {yildiz}
      </span>
    </span>
  );
}

/** "4,8" / "4.8" gibi metin puanları Yildizlar'ın beklediği sayıya çevirir. */
export function puanSayi(puan: string | number | undefined): number {
  if (typeof puan === "number") return Number.isFinite(puan) ? puan : 0;
  const n = Number(String(puan ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}
