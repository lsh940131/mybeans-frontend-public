"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatKRW } from "@/utils/shared";
import { useCart } from "@/app/cart/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/utils/client/fetchApi";
import { CreateOrderCheckoutFromBuyNow, OrderCheckoutSourceEnum } from "@/app/order/types";

type ProductOptionValue = {
  id: number;
  valueKr: string;
  valueEn: string;
  extraCharge: number;
};
type ProductOption = {
  id: number;
  isRequired: boolean;
  nameKr: string;
  nameEn: string;
  valueList: ProductOptionValue[];
};

export default function BuyBox({
  productId,
  basePrice,
  options,
  asCard = true,
  className = "",
}: {
  productId: number;
  basePrice: number;
  options: ProductOption[];
  asCard?: boolean;
  className?: string;
}) {
  const { isAuthed } = useAuth();
  const router = useRouter();

  // optionId -> valueId | null
  const [selected, setSelected] = useState<Record<number, number | null>>({});
  const [qty, setQty] = useState(1);

  // 누락 경고 모달 & 시각 강조
  const [showReqModal, setShowReqModal] = useState(false);
  const [emphasizeMissing, setEmphasizeMissing] = useState(false);

  const { add } = useCart();

  useEffect(() => {
    setSelected(prev => {
      const next: Record<number, number | null> = { ...prev };
      for (const opt of options) {
        // 이미 사용자가 선택한 값이 있으면 건드리지 않음
        if (next[opt.id] !== undefined) continue;

        if (opt.isRequired && opt.valueList.length > 0) {
          next[opt.id] = opt.valueList[0].id; // ✅ 첫 항목 자동 선택
        } else {
          next[opt.id] = null; // 선택 옵션은 비워둠
        }
      }
      return next;
    });
  }, [options]);

  // 각 셀렉티 DOM 참조(누락시 포커스 이동용)
  const selectRefs = useRef<Map<number, HTMLSelectElement>>(new Map());

  // valueId -> value 객체 맵
  const valueMap = useMemo(() => {
    const m = new Map<number, ProductOptionValue>();
    for (const opt of options) {
      for (const v of opt.valueList) {
        m.set(v.id, v);
      }
    }
    return m;
  }, [options]);

  // 누락된 필수 옵션 계산
  const missingRequired = useMemo(
    () => options.filter(opt => opt.isRequired && !selected[opt.id]),
    [options, selected]
  );

  // 가격 계산
  const extraSum = useMemo(() => {
    let sum = 0;
    for (const opt of options) {
      const valueId = selected[opt.id];
      if (!valueId) continue;
      const v = valueMap.get(valueId);
      if (v) sum += v.extraCharge;
    }
    return sum;
  }, [options, selected, valueMap]);

  const unitPrice = basePrice + extraSum;
  const totalPrice = unitPrice * qty;

  // 옵션 변경 핸들러
  const onChangeOption = (optionId: number, valueIdStr: string) => {
    const valueId = valueIdStr ? Number(valueIdStr) : null;
    setSelected(s => ({ ...s, [optionId]: valueId }));
  };

  const dec = () => setQty(q => Math.max(1, q - 1));
  const inc = () => setQty(q => Math.min(99, q + 1));
  const onQtyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value.replace(/\D/g, ""));
    if (!Number.isFinite(n)) return;
    setQty(Math.max(1, Math.min(99, n)));
  };

  // 누락 안내 모달 오픈
  const openMissingModal = () => {
    setEmphasizeMissing(true);
    setShowReqModal(true);
  };

  // 첫 누락 옵션으로 포커스
  const focusFirstMissing = () => {
    const first = missingRequired[0];
    if (!first) return;
    const el = selectRefs.current.get(first.id);
    el?.focus();
  };

  const handleAddToCart = async () => {
    if (missingRequired.length > 0) {
      openMissingModal();
      return;
    }

    const optionValueIdList = Object.values(selected)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);

    await add({
      productId,
      qty,
      optionValueIdList: optionValueIdList.length ? optionValueIdList : undefined,
    });

    alert("장바구니에 담았습니다.");
  };

  const handleBuyNow = async () => {
    if (missingRequired.length > 0) {
      openMissingModal();
      return;
    }

    if (!isAuthed) {
      // 게스트: 로그인 페이지로 이동하면서, 로그인 후 돌아올 경로를 쿼리로 전달
      const redirectTo = `/products/${productId}`;
      router.push(`/sign?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    const optionValueIdList = Object.values(selected)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const body: CreateOrderCheckoutFromBuyNow = {
      source: OrderCheckoutSourceEnum.BUYNOW,
      productId,
      qty,
      optionValueIdList: optionValueIdList.length ? optionValueIdList : undefined,
    };
    const res = await fetchApi<{ id: number; expiredAt: Date }>("/be/order/checkout", {
      method: "POST",
      body,
    });
    const { id, expiredAt } = res;

    // 주문페이지 이동
    router.push(`/order/${id}?expiredAt=${expiredAt}`);
  };

  return (
    <>
      <div
        className={[
          asCard ? "rounded-2xl bg-white p-4 shadow-sm" : "", // ✅ 외부에서 카드 제공 시 제거
          className,
        ].join(" ")}
      >
        {/* 단가(옵션 포함) — 우측 정렬 */}
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{formatKRW(unitPrice)}</div>
          {/* {extraSum > 0 && (
            <div className="mt-0.5 text-xs text-neutral-500">옵션 추가금 {formatKRW(extraSum)}</div>
          )} */}
        </div>

        {/* 옵션 */}
        <div className="mt-4 space-y-3">
          {options.map(opt => {
            const current = selected[opt.id] ?? null;
            const isMissing = emphasizeMissing && opt.isRequired && !current;

            return (
              <div key={opt.id} className="flex items-center gap-3">
                <label className="w-24 shrink-0 text-sm text-neutral-600">
                  {opt.nameKr}
                  {opt.isRequired && <span className="ml-1 text-red-500">*</span>}
                </label>

                <div className="relative w-full">
                  <select
                    ref={el => {
                      if (el) selectRefs.current.set(opt.id, el);
                    }}
                    className={[
                      "w-full h-10 rounded-md bg-neutral-50 px-3 pr-10 text-sm", // ← pr-10로 아이콘 자리
                      "whitespace-nowrap truncate appearance-none", // 네이티브 화살표 숨김
                      "outline-none transition-shadow ring-2 ring-transparent",
                      isMissing ? "ring-red-400" : "focus:ring-black",
                    ].join(" ")}
                    value={current ?? ""}
                    onChange={e => onChangeOption(opt.id, e.target.value)}
                    aria-invalid={isMissing || undefined}
                    aria-required={opt.isRequired || undefined}
                  >
                    {!opt.isRequired && <option value="">선택 안 함</option>}
                    {opt.valueList.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.valueKr}
                        {v.extraCharge > 0 ? ` (+${formatKRW(v.extraCharge)})` : ""}
                      </option>
                    ))}
                  </select>
                  {/* ↓ 드롭다운 어포던스: chevron 아이콘 */}
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {/* 수량 */}
        <div className="mt-4 flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-neutral-600">수량</span>

          <div className="inline-flex items-center rounded-xl bg-neutral-100/80 shadow-inner">
            <button
              type="button"
              aria-label="수량 줄이기"
              onClick={dec}
              disabled={qty <= 1}
              className="h-10 w-10 rounded-l-xl transition hover:bg-neutral-200 active:scale-[0.98]
                 disabled:opacity-40 disabled:hover:bg-transparent
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
            >
              −
            </button>

            <input
              className="h-10 w-14 bg-transparent text-center outline-none
                 focus-visible:ring-2 focus-visible:ring-black/60 rounded-md"
              inputMode="numeric"
              pattern="[0-9]*"
              value={qty}
              onChange={onQtyInput}
              aria-label="수량 입력"
            />

            <button
              type="button"
              aria-label="수량 늘리기"
              onClick={inc}
              disabled={qty >= 99}
              className="h-10 w-10 rounded-r-xl transition hover:bg-neutral-200 active:scale-[0.98]
                 disabled:opacity-40 disabled:hover:bg-transparent
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
            >
              +
            </button>
          </div>
        </div>

        {/* 합계 & CTA — 옵션과 간격 띄우기 */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-neutral-500">총 상품 금액</span>
            <span className="text-2xl font-bold tabular-nums">{formatKRW(totalPrice)}</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="flex-1 rounded-lg bg-neutral-100 px-4 py-2 text-sm hover:bg-neutral-200"
              onClick={handleAddToCart}
            >
              장바구니
            </button>
            <button
              className="flex-1 rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={handleBuyNow}
            >
              구매하기
            </button>
          </div>
        </div>
      </div>

      {/* 필수 옵션 누락 모달 (심플 스타일) */}
      {showReqModal && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowReqModal(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute left-1/2 top-28 w-[480px] max-w-[92vw] -translate-x-1/2 rounded-xl bg-white p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">옵션을 선택해 주세요</h3>
            <p className="mt-2 text-sm text-neutral-600">
              아래 필수 옵션을 선택해야 진행할 수 있어요.
            </p>
            <ul className="mt-3 list-inside list-disc text-sm text-neutral-800">
              {missingRequired.map(m => (
                <li key={m.id}>{m.nameKr}</li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg bg-neutral-100 px-4 py-2 text-sm hover:bg-neutral-200"
                onClick={() => setShowReqModal(false)}
              >
                닫기
              </button>
              <button
                className="rounded-lg bg-black px-4 py-2 text-sm text-white"
                onClick={() => {
                  setShowReqModal(false);
                  requestAnimationFrame(focusFirstMissing);
                }}
              >
                바로 선택하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
