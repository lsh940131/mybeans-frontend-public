"use client";

/**
 * useProductSearch.ts
 *
 * 상품 검색 키워드 히스토리를
 * 게스트(sessionStorage) / 회원(API) 공통 인터페이스로 제공하는 훅.
 *
 * - 게스트 / 회원 구현을 어댑터로 분리
 * - isAuthed 값에 따라 어댑터를 선택
 * - UI(Header 등)는 인증 여부를 전혀 몰라도 사용 가능
 * - 로그인 시 별도로 호출할 mergeGuestToMember 함수 제공
 */

import { useMemo } from "react";
import * as guest from "../lib/guestProductSearch";
import * as api from "@/features/product/api";
import type { ProductSearchHistoryMergeBody } from "@/features/product/types";
import { useAuth } from "@/hooks/useAuth";

/**
 * UI에서 사용할 공통 검색 히스토리 타입
 * (guest / member 공통)
 */
export type ProductSearchHistoryItem = {
  id?: number; // member only
  keyword: string;
  createdAt: Date;
};

/**
 * 공통 어댑터 인터페이스
 */
type ProductSearchAdapter = {
  list(): Promise<ProductSearchHistoryItem[]>;
  create(keyword: string): Promise<void>;
  del(idOrKeyword: number | string): Promise<void>;
  clear(): Promise<void>;
};

/* ------------------------------------------------------------------
 * Guest Adapter
 * ------------------------------------------------------------------ */

const guestAdapter: ProductSearchAdapter = {
  async list() {
    return guest.list();
  },

  async create(keyword: string) {
    guest.create(keyword);
  },

  async del(keyword: string | number) {
    if (typeof keyword === "string") {
      guest.del(keyword);
    }
  },

  async clear() {
    guest.clear();
  },
};

/* ------------------------------------------------------------------
 * Member Adapter
 * ------------------------------------------------------------------ */

const memberAdapter: ProductSearchAdapter = {
  async list() {
    const res = await api.list();
    return res.map(v => ({
      id: v.id,
      keyword: v.keyword,
      createdAt: new Date(v.createdAt),
    }));
  },

  async create() {
    /**
     * 회원은 "상품 목록 조회 시" 서버에서 히스토리를 쌓기 때문에
     * 여기서는 명시적 create를 제공하지 않는다.
     *
     * (UI 레벨에서는 동일한 인터페이스를 유지하기 위해 noop 처리)
     */
    return;
  },

  async del(id: number | string) {
    if (typeof id === "number") {
      await api.del([id]);
    }
  },

  async clear() {
    await api.clear();
  },
};

/* ------------------------------------------------------------------
 * Hook
 * ------------------------------------------------------------------ */

/**
 * 상품 검색 키워드 히스토리 훅
 *
 * @param isAuthed - 현재 로그인 여부
 */
export function useProductSearch(): ProductSearchAdapter {
  const { isAuthed } = useAuth();

  const adapter = useMemo<ProductSearchAdapter>(() => {
    return isAuthed ? memberAdapter : guestAdapter;
  }, [isAuthed]);

  return adapter;
}

/* ------------------------------------------------------------------
 * Guest → Member Merge (로그인 시 사용)
 * ------------------------------------------------------------------ */

/**
 * 로그인 시,
 * session에 저장된 게스트 검색 히스토리를
 * 회원 검색 히스토리로 병합한다.
 */
export async function mergeGuestToMember(): Promise<{
  ok: boolean;
  count: number;
  error?: string;
}> {
  try {
    const items = guest.list();

    if (items.length < 1) {
      return { ok: true, count: 0 };
    }

    const payload: ProductSearchHistoryMergeBody = {
      items: items.map(v => ({
        keyword: v.keyword,
        createdAt: v.createdAt,
      })),
    };

    await api.merge(payload);

    // 병합 완료 후 게스트 히스토리 정리
    guest.clear();

    return { ok: true, count: items.length };
  } catch (e) {
    return {
      ok: false,
      count: 0,
      error: (e as Error)?.message ?? "merge-failed",
    };
  }
}
