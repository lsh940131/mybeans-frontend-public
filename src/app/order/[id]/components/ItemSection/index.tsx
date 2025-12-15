"use client";

import { useMemo, useState } from "react";
import { ISellerItemWithReqMsg, ISellerSubtotalWithReqMsg } from "@/app/order/types";
import { formatKRW } from "@/utils/shared";

interface ItemSectionProps {
  sellerSubtotalList: ISellerSubtotalWithReqMsg[];
}

function buildOptionSummary(item: ISellerItemWithReqMsg): string | null {
  const { product, optionValueIdList } = item;
  if (!product.optionList || optionValueIdList.length === 0) return null;

  const labels: string[] = [];

  for (const opt of product.optionList) {
    const value = opt.valueList.find(v => optionValueIdList.includes(v.id));
    if (value) {
      labels.push(value.valueKr);
    }
  }

  if (labels.length === 0) return null;
  return labels.join(" / ");
}

export default function ItemSection({ sellerSubtotalList }: ItemSectionProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  const totalQty = useMemo(
    () => sellerSubtotalList.reduce((acc, cur) => (acc += cur.items.length), 0),
    [sellerSubtotalList]
  );

  const firstItem: ISellerItemWithReqMsg | null = useMemo(() => {
    if (sellerSubtotalList.length === 0) return null;
    const firstSeller = sellerSubtotalList[0];
    if (!firstSeller.items.length) return null;
    return firstSeller.items[0];
  }, [sellerSubtotalList]);

  return (
    <section aria-label="주문상품" className="space-y-3">
      <h2 className="text-xl font-semibold">주문상품</h2>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* 헤더 (총 N건 + 토글 버튼) */}
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3"
          onClick={() => setExpanded(prev => !prev)}
        >
          <div className="flex flex-col gap-1 text-left">
            <span className="text-base font-semibold">총 {totalQty}건</span>
            {firstItem && !expanded && (
              <div className="flex items-center gap-3">
                {/* 썸네일 */}
                {firstItem.product.thumbnailUrl && (
                  <div className="h-14 w-14 overflow-hidden rounded-md bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={firstItem.product.thumbnailUrl}
                      alt={firstItem.product.nameKr}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* 이름 + 외 N건 */}
                <div className="flex flex-1 flex-col">
                  <span className="max-w-full truncate text-base text-neutral-900">
                    {totalQty > 1
                      ? `${firstItem.product.nameKr} 외 ${totalQty - 1}건`
                      : firstItem.product.nameKr}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 토글 아이콘 */}
          <svg
            className={`h-5 w-5 text-neutral-600 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
          </svg>
        </button>

        {/* 펼친 내용 */}
        {expanded && (
          <div className="border-t border-neutral-100 px-4 py-3 space-y-4">
            {sellerSubtotalList.map(seller => (
              <div key={seller.sellerId} className="rounded-2xl bg-neutral-50/70 px-3 py-3">
                {/* 판매자 헤더 */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-neutral-900">
                      {seller.sellerName}
                    </span>
                  </div>
                  <div className="text-right text-sm text-neutral-700">
                    {seller.freeApplied ? (
                      <span className="font-medium text-emerald-700">배송비 무료</span>
                    ) : (
                      <>
                        <span className="text-neutral-500">배송비 </span>
                        <span className="font-medium">{formatKRW(seller.shippingFeeSubtotal)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 상품 목록 */}
                <div className="space-y-2">
                  {seller.items.map(item => {
                    const optionSummary = buildOptionSummary(item);

                    return (
                      <div
                        key={`${item.cartId}-${item.productId}-${item.optionValueIdList.join("-")}`}
                        className="flex gap-3 rounded-xl bg-white px-3 py-2"
                      >
                        {/* 썸네일 */}
                        {item.product.thumbnailUrl && (
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.product.thumbnailUrl}
                              alt={item.product.nameKr}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        {/* 텍스트 영역 */}
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <p className="line-clamp-2 text-base font-medium text-neutral-900">
                              {item.product.nameKr}
                            </p>
                            {optionSummary && (
                              <p className="mt-1 text-sm text-neutral-600">
                                옵션 | {optionSummary}
                              </p>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm text-neutral-600">{item.qty}개</span>
                            <span className="text-base font-semibold text-neutral-900">
                              {formatKRW(item.totalPrice)}
                            </span>
                          </div>

                          {item.shipmentReqMsg && (
                            <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                              배송메모: {item.shipmentReqMsg}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
