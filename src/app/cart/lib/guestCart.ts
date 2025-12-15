"use client";

import { getSessionItem, setSessionItem, removeSessionItem } from "@/utils/client/session";
import {
  CartActionResult,
  CartItem,
  BaseItem,
  CartUpdateItem,
  CartDeleteItems,
  CartList,
} from "../types";
import { makeItemKey } from "./cartKey";

const KEY = "mybeans:cart";
const MAX_ITEMS = 50;
const CART_ITEM_QTY_LIMIT = 99;

/**
 * 게스트 장바구니 조회
 */
export function list(data: CartList): CartItem[] {
  const { keys } = data;

  const arr = getSessionItem<CartItem[]>(KEY);
  if (!Array.isArray(arr)) return [];

  let l: CartItem[] = arr.map(v => {
    const productId = Number(v?.productId);
    const qty = Number(v?.qty);
    const optionValueIdList = v?.optionValueIdList?.map(w => Number(w)) ?? [];
    const createdAt = Number(v?.createdAt);

    return {
      key: makeItemKey({ productId, optionValueIdList }),
      productId,
      qty,
      optionValueIdList,
      createdAt,
    };
  });

  if (keys?.length) {
    l = l.filter(v => keys.includes(v.key));
  }

  return l;
}

/**
 * 게스트 장바구니에 상품 추가
 * 기존과 같은 상품이라면 1~99개 내에서 수량 증가 & createdAt 갱신
 */
export function add(data: BaseItem): CartActionResult {
  const { productId, qty, optionValueIdList = [] } = data;
  const now = Date.now();
  const result: CartActionResult = { ok: false };

  const inputItem: CartItem = {
    key: makeItemKey({ productId, optionValueIdList }),
    productId,
    qty,
    optionValueIdList,
    createdAt: now,
  };

  const l = list({});
  const dupItemIdx = l.findIndex(v => v.key == inputItem.key);

  if (dupItemIdx >= 0) {
    const dupItem = l[dupItemIdx];
    const newQty = dupItem.qty + qty;

    if (newQty <= CART_ITEM_QTY_LIMIT) {
      const newList = [...l];
      newList[dupItemIdx] = { ...dupItem, qty: newQty, createdAt: now };
      setSessionItem(KEY, newList);
      result.ok = true;
    } else {
      result.message = "같은 상품은 최대 99개까지 장바구니에 저장할 수 있습니다.";
    }
    return result;
  } else {
    if (l.length >= MAX_ITEMS) {
      result.message = "장바구니에는 최대 50개의 상품만 담을 수 있습니다.";
      return result;
    }

    const safeItem: CartItem = {
      ...inputItem,
      qty: Math.min(inputItem.qty, CART_ITEM_QTY_LIMIT),
    };
    setSessionItem(KEY, [...l, safeItem]);
    result.ok = true;
    return result;
  }
}

/**
 * 장바구니 상품 수정 (구매개수)
 */
export function update(data: CartUpdateItem): CartActionResult {
  const { key, qty } = data;
  const l = list({});
  const idx = l.findIndex(v => v.key === key);
  const result: CartActionResult = { ok: false };

  if (idx === -1) {
    result.message = "해당 상품이 장바구니에 없습니다.";
    return result;
  }

  // 삭제 규칙
  if (!Number.isFinite(qty) || qty <= 0) {
    const next = l.filter(v => v.key !== key);
    setSessionItem(KEY, next);
    result.ok = true;
    return result;
  }

  // 상한 캡(99), createdAt 유지
  const capped = Math.min(qty, CART_ITEM_QTY_LIMIT);
  const next = [...l];
  next[idx] = { ...next[idx], qty: capped };
  setSessionItem(KEY, next);

  if (qty > CART_ITEM_QTY_LIMIT) {
    result.message = "같은 상품은 최대 99개까지 장바구니에 저장할 수 있습니다.";
  }
  result.ok = true;
  return result;
}

/**
 * 장바구니 상품 삭제
 */
export function remove(data: CartDeleteItems) {
  const { keys = [] } = data;
  if (keys.length === 0) return;

  const l = list({}).filter(v => !keys.includes(v.key));
  setSessionItem(KEY, l);

  setSessionItem(KEY, l);
}

/**
 * 장바구니 상품 전체 삭제
 */
export function clear() {
  removeSessionItem(KEY);
}
