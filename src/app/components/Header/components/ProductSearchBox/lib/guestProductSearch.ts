"use client";

/**
 * 비회원(게스트)의 상품 검색 키워드 히스토리를
 * sessionStorage 기반으로 관리한다.
 *
 * - keyword 기준 중복 제거
 * - 동일 keyword 재검색 시 createdAt 최신화
 * - 항상 createdAt DESC 정렬
 * - UI 사용 목적
 */

import { getSessionItem, setSessionItem, removeSessionItem } from "@/utils/client/session";

/**
 * 게스트 검색 히스토리 아이템 타입
 * (회원 API payload와 shape을 맞춘다)
 */
export type GuestProductSearchHistoryItem = {
  keyword: string;
  createdAt: Date;
};

const SESSION_KEY = "mybeans:product_search";
const MAX_HISTORY_LENGTH = 50;

/**
 * 세션에서 raw 데이터를 읽어 Date 타입으로 정규화
 */
function normalize(
  items: { keyword: string; createdAt: string }[] | null
): GuestProductSearchHistoryItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map(v => ({
      keyword: v.keyword,
      createdAt: new Date(v.createdAt),
    }))
    .filter(v => v.keyword && !Number.isNaN(v.createdAt.getTime()));
}

/**
 * 게스트 검색 히스토리 조회
 */
export function list(): GuestProductSearchHistoryItem[] {
  const raw = getSessionItem<{ keyword: string; createdAt: string }[]>(SESSION_KEY);

  return normalize(raw).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 검색 키워드 기록 생성 또는 갱신
 *
 * - 동일 keyword 존재 시 createdAt만 갱신
 * - 없으면 신규 추가
 */
export function create(keyword: string, createdAt: Date = new Date()): void {
  if (!keyword) return;

  const current = normalize(getSessionItem<{ keyword: string; createdAt: string }[]>(SESSION_KEY));

  const index = current.findIndex(v => v.keyword === keyword);

  if (index !== -1) {
    current[index] = { keyword, createdAt };
  } else {
    current.push({ keyword, createdAt });
  }

  const next = current
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MAX_HISTORY_LENGTH);

  setSessionItem(
    SESSION_KEY,
    next.map(v => ({
      keyword: v.keyword,
      createdAt: v.createdAt.toISOString(),
    }))
  );
}

/**
 * 특정 검색 기록 삭제 (keyword 기준)
 */
export function del(keyword: string): void {
  if (!keyword) return;

  const current = normalize(getSessionItem<{ keyword: string; createdAt: string }[]>(SESSION_KEY));

  const next = current.filter(v => v.keyword !== keyword);

  if (next.length === 0) {
    removeSessionItem(SESSION_KEY);
    return;
  }

  setSessionItem(
    SESSION_KEY,
    next.map(v => ({
      keyword: v.keyword,
      createdAt: v.createdAt.toISOString(),
    }))
  );
}

/**
 * 검색 히스토리 전체 삭제
 */
export function clear(): void {
  removeSessionItem(SESSION_KEY);
}
