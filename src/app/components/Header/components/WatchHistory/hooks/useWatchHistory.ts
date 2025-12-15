/**
 * '최근 본 상품' 훅 (게스트/회원)
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type WatchItemUI } from "../types";
import * as guest from "../lib/guestWatchHistory";
import * as member from "@/features/watchHistory/api";
import type { PwhListItemPayload, ProductListPayload } from "@/features/watchHistory/types";
import { toEpochMs } from "@/utils/shared";
import { fetchApi } from "@/utils/client/fetchApi";
import { useAuth } from "@/hooks/useAuth";

const LIMIT = 50;

/**
 * 저장소 어댑터 인터페이스
 * - add: guest는 void, member는 historyId(number) 반환
 */
interface WatchHistoryAdapter {
  list(limit: number): Promise<WatchItemUI[]>;
  add(item: WatchItemUI): Promise<void | number>;
  delete(productId: number): Promise<void>;
  clear(): Promise<void>;
}

/** 게스트 어댑터(sessionStorage) */
const guestAdapter: WatchHistoryAdapter = {
  async list(limit) {
    const list = await guest.list();
    return normalizeUnique(list.map(mapGuestToUI), limit);
  },
  async add(item) {
    await guest.add({
      productId: item.productId,
      nameKr: item.nameKr,
      nameEn: item.nameEn,
      thumbnailUrl: item.thumbnailUrl,
      viewedAt: item.viewedAt,
    });
  },
  async delete(productId) {
    await guest.remove(productId);
  },
  async clear() {
    await guest.clear();
  },
};

/** 회원 어댑터(API) */
const memberAdapter: WatchHistoryAdapter = {
  async list(limit) {
    const { list }: ProductListPayload = await member.list();
    return normalizeUnique((list ?? []).map(mapServerToUI), limit);
  },
  async add(item) {
    const historyId = await member.add(item.productId);
    return historyId;
  },
  async delete(productId) {
    await member.del(productId);
  },
  async clear() {
    await member.clear();
  },
};

/** 게스트 → UI 맵퍼 */
function mapGuestToUI(item: {
  productId: number;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
  viewedAt: number;
}): WatchItemUI {
  return {
    productId: item.productId,
    nameKr: item.nameKr,
    nameEn: item.nameEn,
    thumbnailUrl: item.thumbnailUrl,
    viewedAt: item.viewedAt,
  };
}

/** 서버 → UI 맵퍼 */
function mapServerToUI(item: PwhListItemPayload): WatchItemUI {
  return {
    productId: item.product.id,
    nameKr: item.product.nameKr,
    nameEn: item.product.nameEn,
    thumbnailUrl: item.product.thumbnailUrl,
    viewedAt: toEpochMs(item.createdAt),
    historyId: item.id,
  };
}

/**
 * normalizeUnique
 * - productId 기준 최신 viewedAt 우선으로 중복 제거하고 내림차순 정렬
 */
function normalizeUnique(items: WatchItemUI[], limit = LIMIT): WatchItemUI[] {
  const byPid = new Map<number, WatchItemUI>();
  for (const it of items) {
    const prev = byPid.get(it.productId);
    if (!prev || it.viewedAt > prev.viewedAt) byPid.set(it.productId, it);
  }
  return Array.from(byPid.values())
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .slice(0, limit);
}

/**
 * 명시 호출형 머지 함수 (로그인 성공 직후에만 호출)
 * - 게스트 세션 목록 → 정규화/유효성 필터 → 서버 배치 머지 → 게스트 비우기
 * - 훅 외부에서도 import 해서 호출 가능
 */
export async function mergeGuestToMember(): Promise<{
  ok: boolean;
  count: number;
  error?: string;
}> {
  try {
    const guestList = guest.list();

    if (guestList.length < 1) return { ok: true, count: 0 };

    // 정규화 + 유효성 필터(productId 양의 정수)
    const normalized = normalizeUnique(guestList.map(mapGuestToUI)).filter(
      it => Number.isFinite(it.productId) && it.productId > 0
    );

    if (normalized.length === 0) {
      return { ok: false, count: 0, error: "no-valid-items" }; // 보낼 게 없음(에러 아님)
    }

    const payload = {
      list: normalized.map(it => ({
        productId: it.productId,
        createdAt: new Date(it.viewedAt),
      })),
    };

    // 머지 요청
    await fetchApi<boolean>("/be/product-watch-history/merge", {
      method: "POST",
      body: payload,
    });

    // sessionStorage 정리
    guest.clear();

    return { ok: true, count: normalized.length };
  } catch (e) {
    // 실패 시 sessionStorage 보존
    return { ok: false, count: 0, error: (e as Error)?.message ?? "merge-failed" };
  }
}

/**
 * useWatchHistory
 * - 역할: 목록 로드/추가/삭제/초기화 (로그인 머지는 포함하지 않음)
 * - 전략: 로그인 여부에 따라 어댑터 교체
 */
export function useWatchHistory() {
  const { isAuthed } = useAuth();
  const [items, setItems] = useState<WatchItemUI[]>([]);
  const [loading, setLoading] = useState(true);

  // 어댑터 선택
  const adapter = useMemo<WatchHistoryAdapter>(
    () => (isAuthed ? memberAdapter : guestAdapter),
    [isAuthed]
  );

  /** 목록 로드 */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adapter.list(LIMIT);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * add
   * - 낙관 반영 → 어댑터 호출
   * - member의 경우 add가 반환하는 historyId로 상태 보강
   */
  const add = useCallback(
    async (input: WatchItemUI) => {
      // 1) 낙관 반영
      setItems(prev => normalizeUnique([{ ...input }, ...prev]));

      try {
        const maybeId = await adapter.add(input);
        if (typeof maybeId === "number") {
          // 2) historyId 보강
          setItems(prev =>
            normalizeUnique(
              [
                { ...input, historyId: maybeId },
                ...prev.filter(p => p.productId !== input.productId),
              ],
              LIMIT
            )
          );
        }
      } catch {
        // 실패 시 정합 복구
        await load();
      }
    },
    [adapter, load]
  );

  /** 단건 제거 */
  const remove = useCallback(
    async (productId: number) => {
      setItems(prev => prev.filter(x => x.productId !== productId));
      try {
        await adapter.delete(productId);
      } catch {
        await load();
      }
    },
    [adapter, load]
  );

  /** 전체 비우기 */
  const clear = useCallback(async () => {
    setItems([]);
    try {
      await adapter.clear();
    } catch {
      await load();
    }
  }, [adapter, load]);

  return { items, loading, add, remove, clear, reload: load };
}
