import { NextResponse } from "next/server";
import {
  anlasmalarOku,
  aktarimlarOku,
  destekKayitlariOku,
  taleplerOku,
} from "@/lib/depo";
import { istekKullaniciAdi } from "@/lib/oturum-sunucu";
import { destekYetkisi } from "@/lib/roller";
import { iadeAdimi, itirazKapandiMi } from "@/lib/anlasma";
import type { IadeAdim } from "@/lib/anlasma";

export const dynamic = "force-dynamic";

/**
 * Moderasyon panelinin kuyrukları — YALNIZCA destek/yönetici.
 *
 * NEDEN VAR: itiraz sürecinin üç adımı (`karar`, `ikinci-karar`, `odeme`) ve
 * IBAN aktarımının sonuçlandırılması destek yetkisi istiyor ve uçları
 * doğru şekilde korunuyordu — ama bu adımları çağıran hiçbir ekran yoktu.
 * Sonuç: açılan itiraz "inceleme" adımında sonsuza kadar kalıyor, para
 * havuzda asılı duruyor, ilan `itiraz-suruyor` gerekçesiyle kilitleniyordu;
 * aktarım talepleri de kalıcı olarak "işlemde" görünüyordu.
 *
 * Panel, ekibin işini görebilmesi için kuyrukları buradan okur.
 *
 * ÜÇÜNCÜ KUYRUK — destek kayıtları: `/destek` formu gerçek kayıt açıyor ve
 * kullanıcıya "yanıtı e-postana göndereceğiz" diyordu, ama kaydı okuyan
 * hiçbir ekran yoktu. Durum sonsuza dek "İncelemede" kalıyordu; yani
 * itiraz kuyruğundaki hatanın aynısı, bu kez destek formunda.
 */

/** Panelde bir itiraz satırı. */
export type ItirazKaydi = {
  sunumId: string;
  talepId: string;
  ilanBaslik: string;
  alici: string;
  satici: string;
  tutar: number;
  adim: IadeAdim;
  /** Alıcının "ürün anlatıldığı gibi değil" dediği an. */
  itirazZamani?: string;
  /** Satıcı karşı itiraz açtıysa gerekçesi. */
  karsiItiraz?: string;
  /** Alıcı iade kargosuna verdiyse takip bilgisi. */
  iadeKargo?: { firma: string; takipNo: string };
};

export async function GET() {
  if (!destekYetkisi(await istekKullaniciAdi()))
    return NextResponse.json(
      { hata: "Bu kuyruğu yalnızca destek ekibi görebilir." },
      { status: 403 },
    );

  const [anlasmalar, aktarimlar, talepler, destekKayitlari] =
    await Promise.all([
      anlasmalarOku(),
      aktarimlarOku(),
      taleplerOku(),
      destekKayitlariOku(),
    ]);

  const itirazlar: ItirazKaydi[] = anlasmalar
    // Açık itiraz: alıcı "hayır" demiş ve süreç henüz kapanmamış.
    .filter((a) => a.onay === "hayir" && !itirazKapandiMi(a))
    .map((a) => ({
      sunumId: a.sunumId,
      talepId: a.talepId,
      ilanBaslik:
        talepler.find((t) => t.id === a.talepId)?.baslik ?? a.talepId,
      alici: a.alici,
      satici: a.satici,
      tutar: a.tutar,
      adim: iadeAdimi(a),
      itirazZamani: a.onayZamani,
      karsiItiraz: a.iade?.karsiItiraz,
      ...(a.iade?.kargoFirma && a.iade?.takipNo
        ? {
            iadeKargo: { firma: a.iade.kargoFirma, takipNo: a.iade.takipNo },
          }
        : {}),
    }))
    // En eski itiraz en üstte: bekleyen en uzun süredir bekleyendir.
    .sort((x, y) => (x.itirazZamani ?? "").localeCompare(y.itirazZamani ?? ""));

  return NextResponse.json({
    itirazlar,
    // Sonuçlanmamışlar önce; muhasebenin işi onlar.
    aktarimlar: [
      ...aktarimlar.filter((a) => a.durum === "islemde"),
      ...aktarimlar.filter((a) => a.durum !== "islemde"),
    ],
    // Bekleyenler önce; `destekKayitlariOku` zaten en yeniyi başa alıyor.
    destekKayitlari: [
      ...destekKayitlari.filter((k) => k.durum === "İncelemede"),
      ...destekKayitlari.filter((k) => k.durum !== "İncelemede"),
    ],
  });
}
