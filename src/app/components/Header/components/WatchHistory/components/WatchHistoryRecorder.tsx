/**
 * 목적: 페이지 진입(마운트) 시 '최근 본 상품'에 1회 기록을 남긴다
 * 원리: useWatchHistory 훅을 사용하여 add() 호출
 * 주의: 동일 상품 재방문 시 viewedAt을 갱신하여 최신 항목으로 당긴다.
 */
"use client";

import { useEffect } from "react";
import { useWatchHistory } from "../hooks/useWatchHistory";
import { type WatchItemUI } from "../types";

export default function WatchHistoryRecorder({ product }: { product: WatchItemUI }) {
  const { add } = useWatchHistory();

  useEffect(() => {
    const pid = Number(product?.productId);

    // 숫자 보정 + 유효성 체크
    if (!Number.isFinite(pid) || pid <= 0) return;

    void add({
      productId: pid,
      nameKr: product.nameKr,
      nameEn: product.nameEn,
      thumbnailUrl: product.thumbnailUrl,
      viewedAt: product.viewedAt,
      historyId: product?.historyId,
    });
  }, [add, product]);

  return null;
}
