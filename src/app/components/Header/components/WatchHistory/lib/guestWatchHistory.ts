"use client";

import { type WatchItemUI } from "../types";
import { getSessionItem, setSessionItem, removeSessionItem } from "@/utils/client/session";

const KEY = "mybeans:watchHistory";
const MAX_ITEMS = 50;

/**
 * 게스트의 구경한 상품 목록 조회
 */
export function list(): WatchItemUI[] {
  const arr = getSessionItem<WatchItemUI[]>(KEY);
  if (!Array.isArray(arr)) return [];

  return arr
    .map(v => ({
      productId: Number(v?.productId),
      nameKr: String(v?.nameKr ?? ""),
      nameEn: String(v?.nameEn ?? ""),
      thumbnailUrl: String(v?.thumbnailUrl ?? ""),
      viewedAt: Number(v?.viewedAt ?? Date.now()),
    }))
    .filter(x => Number.isFinite(x.productId));
}

/**
 * 게스트가 구경한 상품 추가
 */
export function add(input: Omit<WatchItemUI, "viewedAt"> & Partial<Pick<WatchItemUI, "viewedAt">>) {
  const now = Date.now();
  const item: WatchItemUI = {
    productId: input.productId,
    nameKr: input.nameKr,
    nameEn: input.nameEn,
    thumbnailUrl: input.thumbnailUrl,
    viewedAt: input.viewedAt ?? now,
  };

  const l = list();
  const filtered = l.filter(v => v.productId !== item.productId);
  filtered.unshift(item);
  setSessionItem(KEY, filtered.slice(0, MAX_ITEMS));
}

/**
 * 게스트가 구경한 상품 삭제
 */
export function remove(id: number) {
  const l = list().filter(v => v.productId !== id);
  setSessionItem(KEY, l);
}

/**
 * 게스트가 구경한 상품 전체 삭제
 */
export function clear() {
  removeSessionItem(KEY);
}
