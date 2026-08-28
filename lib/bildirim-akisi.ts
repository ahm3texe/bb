"use client";

import { useCallback, useEffect, useState } from "react";
import type { Bildirim } from "./bildirimler";

/**
 * Hesabın bildirimleri — sunucudan.
 *
 * Eskiden sonuca `bildirimlerimFor(kullanici)` de ekleniyordu ama o
 * fonksiyon boş bir sabit diziyi süzüyordu: listeye hiçbir şey katmıyor,
 * yalnızca "başka bir bildirim kaynağı var" izlenimi veriyordu.
 * İstek başarısız olursa liste boş kalır.
 */
export function useBildirimler(kullanici: string): {
  bildirimler: Bildirim[];
  oku: (id: number) => Promise<void>;
  tumunuOku: () => Promise<void>;
  sil: (id: number) => Promise<void>;
  tumunuSil: () => Promise<void>;
} {
  const [sunucudan, setSunucudan] = useState<Bildirim[]>([]);

  useEffect(() => {
    let iptal = false;
    fetch("/api/bildirimler")
      .then((r) => (r.ok ? r.json() : { bildirimler: [] }))
      .then((v: { bildirimler?: Bildirim[] }) => {
        if (!iptal) setSunucudan(v.bildirimler ?? []);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
    // Hesap değişince o hesabın bildirimleri yeniden çekilir.
  }, [kullanici]);

  /**
   * Bildirimi okundu işaretler — SUNUCUDA.
   *
   * Okundu bilgisi bir dönem yalnızca bildirim sayfasının `useState`'inde
   * duruyordu: yenileyince geri geliyor, başlıktaki zil rozeti ise hiç
   * sıfırlanmıyordu (rozet `yeni` alanını sayıyor, o alanı da hiçbir kod
   * değiştirmiyordu).
   *
   * Silme ile aynı desen: önce ekranda uygula, sunucu reddederse geri al.
   */
  const oku = useCallback(async (id: number) => {
    const oncesi = sunucudan;
    // Zaten okunmuşsa istek bile atma.
    if (!oncesi.find((b) => b.id === id)?.yeni) return;
    setSunucudan((p) =>
      p.map((b) => (b.id === id ? { ...b, yeni: false } : b)),
    );
    const r = await fetch(`/api/bildirimler/${id}`, {
      method: "PATCH",
    }).catch(() => undefined);
    if (!r?.ok) setSunucudan(oncesi);
  }, [sunucudan]);

  const tumunuOku = useCallback(async () => {
    const oncesi = sunucudan;
    if (!oncesi.some((b) => b.yeni)) return;
    setSunucudan((p) => p.map((b) => (b.yeni ? { ...b, yeni: false } : b)));
    const r = await fetch("/api/bildirimler", { method: "PATCH" }).catch(
      () => undefined,
    );
    if (!r?.ok) setSunucudan(oncesi);
  }, [sunucudan]);

  /**
   * Tek bildirimi siler.
   *
   * Önce ekrandan kaldırılır (hızlı geri bildirim), sunucu reddederse
   * geri konur — listedeki yeri korunsun diye tüm dizi geri yüklenir.
   */
  const sil = useCallback(async (id: number) => {
    const oncesi = sunucudan;
    setSunucudan((p) => p.filter((b) => b.id !== id));
    const r = await fetch(`/api/bildirimler/${id}`, {
      method: "DELETE",
    }).catch(() => undefined);
    if (!r?.ok) setSunucudan(oncesi);
  }, [sunucudan]);

  const tumunuSil = useCallback(async () => {
    const oncesi = sunucudan;
    setSunucudan([]);
    const r = await fetch("/api/bildirimler", { method: "DELETE" }).catch(
      () => undefined,
    );
    if (!r?.ok) setSunucudan(oncesi);
  }, [sunucudan]);

  return { bildirimler: sunucudan, oku, tumunuOku, sil, tumunuSil };
}
