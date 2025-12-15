/**
 * 장바구니 훅 (게스트/회원)
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchApi } from "@/utils/client/fetchApi";
import * as guest from "../lib/guestCart";
import {
  CartAddItem,
  CartDeleteItems,
  CartItem,
  CartList,
  CartUpdateItem,
  ProductOption,
  QuoteResponse,
  UICartQuote,
  UISelectedOption,
  UISellerSubtotal,
} from "../types";
import { useAuth } from "@/hooks/useAuth";
import { makeItemKey, parsedMember, parseItemKey } from "../lib/cartKey";

/**
 * 장바구니 어댑터 인터페이스
 */
interface CartAdapter {
  list(data: CartList): Promise<UICartQuote>;
  add(data: CartAddItem): Promise<void | number>;
  update(data: CartUpdateItem): Promise<boolean>;
  delete(data: CartDeleteItems): Promise<boolean>;
}

/** 게스트 어댑터(sessionStorage) */
const guestAdapter: CartAdapter = {
  async list() {
    let result: UICartQuote = {
      subtotalMerchandise: 0,
      subtotalShippingFee: 0,
      list: [],
      invalidItems: [],
    };

    const l: CartItem[] = guest.list({});
    if (l.length) {
      const items = l.map(v => ({
        productId: v.productId,
        qty: v.qty,
        optionValueIdList: v.optionValueIdList,
      }));
      const res = await fetchApi<QuoteResponse>(`/be/cart/guest`, {
        method: "POST",
        body: { items },
      });

      result = mapQuoteToUI(res);
    }

    return result;
  },
  async add(data: CartAddItem) {
    guest.add(data);
  },
  async update(data: CartUpdateItem) {
    guest.update(data);
    return true;
  },
  async delete(data: CartDeleteItems) {
    guest.remove(data);
    return true;
  },
};

/** 회원 어댑터(API) */
const memberAdapter: CartAdapter = {
  async list(data: CartList) {
    const { keys } = data;

    const cartIds: number[] = [];
    if (keys?.length) {
      for (const key of keys) {
        const parsedKey = parseItemKey(key) as parsedMember;
        cartIds.push(parsedKey.cartId);
      }
    }
    const qs = cartIds.length
      ? new URLSearchParams({
          cartIdList: cartIds.join(","),
        })
      : undefined;

    const base = "/be/cart";
    const url = qs ? base + "?" + qs.toString() : base;
    const res = await fetchApi<QuoteResponse>(url, { method: "GET" });
    return mapQuoteToUI(res);
  },
  async add(data: CartAddItem) {
    const { productId, qty, optionValueIdList } = data;

    const result = await fetchApi<{ cartId: number }>(`/be/cart`, {
      method: "POST",
      body: { productId, qty, optionValueIdList },
    });
    return result.cartId;
  },
  async update(data: CartUpdateItem) {
    const { key, qty } = data;

    const parsed = parseItemKey(key) as parsedMember;
    const cartId = parsed.cartId;

    await fetchApi<{ cartId: number }>(`/be/cart`, {
      method: "PUT",
      body: { cartId, qty },
    });

    return true;
  },
  async delete(data: CartDeleteItems) {
    const { keys } = data;

    const cartIds: number[] = [];
    for (const key of keys) {
      const parsed = parseItemKey(key) as parsedMember;
      const cartId = parsed.cartId;
      cartIds.push(cartId);
    }

    if (cartIds.length) {
      const qs = new URLSearchParams({ cartIdList: cartIds.join(",") });
      await fetchApi<{ cartId: number }>(`/be/cart?${qs.toString()}`, {
        method: "DELETE",
      });
    }

    return true;
  },
};

/**
 * @function mapQuoteToUI
 * @description CQuotePayload → UI용 구조로 변환
 */
function mapQuoteToUI(payload: QuoteResponse): UICartQuote {
  const list: UISellerSubtotal[] = payload.list.map(seller => ({
    sellerId: seller.sellerId,
    sellerName: seller.sellerName,
    freeShippingThreshold: seller.freeShippingThreshold,
    freeApplied: seller.freeApplied,
    merchandiseSubtotal: seller.merchandiseSubtotal,
    shippingFeeSubtotal: seller.shippingFeeSubtotal,
    items: seller.items.map(item => {
      const product = item.product;

      // 전체 옵션 구조 그대로 매핑
      const allOptions: ProductOption[] =
        product.optionList?.map(opt => ({
          id: opt.id,
          nameKr: opt.nameKr,
          nameEn: opt.nameEn,
          isRequired: opt.isRequired,
          valueList:
            opt.valueList?.map(v => ({
              id: v.id,
              valueKr: v.valueKr,
              valueEn: v.valueEn,
              extraCharge: v.extraCharge,
            })) ?? [],
        })) ?? [];

      // 선택된 옵션만 추출
      const selectedOptions: UISelectedOption[] = [];
      for (const opt of allOptions) {
        const matchedValue = opt.valueList.find(v => item.optionValueIdList?.includes(v.id));
        if (matchedValue) {
          selectedOptions.push({
            optionId: opt.id,
            optionName: opt.nameKr,
            valueId: matchedValue.id,
            valueName: matchedValue.valueKr,
            extraCharge: matchedValue.extraCharge,
          });
        }
      }

      return {
        key: makeItemKey({
          cartId: item.cartId,
          productId: item.productId,
          optionValueIdList: item.optionValueIdList,
        }),
        cartId: item.cartId ?? undefined,
        productId: item.productId,
        productNameKr: product.nameKr,
        productNameEn: product.nameEn,
        productThumbnail: product.thumbnailUrl,
        qty: item.qty,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        shippingFee: item.shippingFee,
        allOptions,
        selectedOptions,
      };
    }),
  }));

  return {
    subtotalMerchandise: payload.subtotalMerchandise,
    subtotalShippingFee: payload.subtotalShippingFee,
    list,
    invalidItems: payload.invalidItems ?? [],
  };
}

export async function mergeGuestToMember(): Promise<{
  ok: boolean;
  count: number;
  error?: string;
}> {
  try {
    // merge 완료 후 장바구니 session에 저장된 모든 상품 삭제 = guest.clear

    const l: CartItem[] = guest.list({});

    if (l.length < 1) return { ok: true, count: 0 };

    // 머지 요청
    await fetchApi<boolean>("/be/cart/merge", {
      method: "POST",
      body: {
        items: l.map(v => ({
          productId: v.productId,
          qty: v.qty,
          optionValueIdList: v.optionValueIdList,
        })),
      },
    });

    // sessionStorage 정리
    guest.clear();

    return { ok: true, count: 0 };
  } catch (e) {
    return { ok: false, count: 0, error: (e as Error)?.message ?? "merge-failed" };
  }
}

export function useCart() {
  const { isAuthed } = useAuth();
  // 페이지 최초/명시적 재조회에만 쓰는 로딩 플래그
  const [loading, setLoading] = useState(true);
  // 실제 화면에 그리는 데이터
  const [data, setData] = useState<UICartQuote | null>(null);
  // 행(아이템) 단위 뮤테이션 진행중 키들 (수정/삭제 등)
  const [mutatingKeys, setMutatingKeys] = useState<Set<string>>(new Set());
  // 마지막 조회 파라미터 기억 -> update,delete 후 같은 조건으로 reload를 위함
  const lastParamsRef = useRef<CartList>(undefined);

  // 어댑터 선택
  const adapter = useMemo<CartAdapter>(() => (isAuthed ? memberAdapter : guestAdapter), [isAuthed]);

  /** 내부 헬퍼: 행 잠금 on/off */
  const lockKeys = useCallback((keys: string[]) => {
    setMutatingKeys(prev => {
      const next = new Set(prev);
      keys.forEach(k => next.add(k));
      return next;
    });
  }, []);
  const unlockKeys = useCallback((keys: string[]) => {
    setMutatingKeys(prev => {
      const next = new Set(prev);
      keys.forEach(k => next.delete(k));
      return next;
    });
  }, []);

  /** 목록 로드: silent=true면 data 유지 + 깜빡임 없음 */
  const load = useCallback(
    async (params: CartList = {}, opts?: { silent?: boolean }) => {
      const silent = !!opts?.silent;
      if (!silent) setLoading(true);
      lastParamsRef.current = params;
      try {
        const l = await adapter.list(params);
        setData(l);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [adapter]
  );

  // 최초 목록 로드
  useEffect(() => {
    void load();
  }, [load]);

  /** 장바구니 상품 추가 (상품 상세에서 추가되니 load 할 필요 없음) */
  const add = useCallback(
    async (item: CartAddItem) => {
      await adapter.add(item);
    },
    [adapter]
  );

  /** 장바구니 아이템 수정 (백그라운드 재조회 = 무료배송/배송비 정확 반영) */
  const update = useCallback(
    async (item: CartUpdateItem) => {
      // 어떤 행이 수정중인지 잠금
      lockKeys([item.key]);
      try {
        const ok = await adapter.update(item);
        if (!ok) return false;
        // 깜빡임 없이 최신 견적 반영
        await load(lastParamsRef.current, { silent: true });
        return true;
      } finally {
        unlockKeys([item.key]);
      }
    },
    [adapter, load, lockKeys, unlockKeys]
  );

  /** delete: 동일하게 silent 재조회 */
  const remove = useCallback(
    async (items: CartDeleteItems) => {
      const keys = items.keys ?? [];
      lockKeys(keys);
      try {
        const ok = await adapter.delete(items);
        if (!ok) return false;
        await load(lastParamsRef.current, { silent: true });
        return true;
      } finally {
        unlockKeys(keys);
      }
    },
    [adapter, load, lockKeys, unlockKeys]
  );

  const hydrate = useCallback((initialData: UICartQuote) => {
    setData(initialData);
    setLoading(false);
  }, []);

  return { data, loading, mutatingKeys, add, reload: load, update, remove, hydrate };
}
