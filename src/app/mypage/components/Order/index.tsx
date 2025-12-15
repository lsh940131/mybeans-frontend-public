"use client";

/**
 * 최근 6개월 내의 주문 내역 중 가장 최근 구매한 상품 1건 보여주기
 */

import { getMypageOrderList } from "@/features/order/api";
import { IMypageOrderListItem } from "@/features/order/types";
import { formatDate, formatKRW } from "@/utils/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mapShipmentStatusToLabel } from "@/features/order/utils";

export default function MypageOrder() {
  const router = useRouter();

  const [latestOrder, setLatestOrder] = useState<IMypageOrderListItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * 최근 6개월 주문 중 가장 최근 1건 조회
   */
  useEffect(() => {
    const fetchLatestOrder = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 6);

        const res = await getMypageOrderList({
          offset: 0,
          length: 1,
          startDate: formatDate(start),
          endDate: formatDate(end),
          // keyword, status 는 마이페이지 전체보기 화면에서만 사용
        });

        const first = res.list?.[0] ?? null;
        setLatestOrder(first);
      } catch (e) {
        console.error("[MypageRecentOrderCard] 주문 조회 실패:", e);
        setErrorMsg("주문/배송 내역을 불러오지 못했습니다.");
        setLatestOrder(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchLatestOrder();
  }, []);

  /**
   * 상품 썸네일 클릭 시 상품 상세로 이동
   */
  const handleClickItemThumbnail = () => {
    if (!primaryProduct) return;
    router.push(`/products/${primaryProduct.product.id}`);
  };

  /**
   * "모두 보기" 클릭 시 마이페이지 주문 목록으로 이동
   */
  const handleClickViewAll = () => {
    router.push("/mypage/orders");
  };

  const primaryProduct = latestOrder?.orderProductList?.[0] ?? null;
  const statusLabel = primaryProduct
    ? mapShipmentStatusToLabel(String(primaryProduct.shipment?.status))
    : "";
  const createdAtLabel = primaryProduct ? formatDate(primaryProduct.createdAt) : "";
  const productName = primaryProduct?.product.nameKr ?? "";
  const productCount = latestOrder?.orderProductList.length ?? 0;
  const extraCount = productCount > 1 ? ` 외 ${productCount - 1}개` : "";

  const hasOrder = !!latestOrder && !!primaryProduct;

  return (
    <section className="w-full max-w-3xl rounded-lg bg-white px-8 py-5 shadow-sm">
      {/* 항상 유지되는 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">주문/배송내역</h2>
        <button
          type="button"
          onClick={handleClickViewAll}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          모두 보기 &gt;
        </button>
      </div>

      {/* 구분선 */}
      <div className="mb-4 -mx-8 h-px bg-gray-200" />

      {/* 여기부터만 상태에 따라 내용 변경 */}
      <div className="min-h-[80px]">
        {loading && <p className="text-sm text-gray-500">주문/배송 내역을 불러오는 중입니다...</p>}

        {!loading && errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

        {!loading && !errorMsg && !hasOrder && (
          <p className="text-sm text-gray-500">최근 6개월 간 주문/배송 내역이 없습니다.</p>
        )}

        {!loading && !errorMsg && hasOrder && (
          <>
            {/* 주문 상태 라벨 */}
            <div className="mb-2 text-sm font-semibold text-gray-900">
              {statusLabel || "주문상태"}
            </div>

            {/* 본문: 이미지 + 주문 정보 */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                {primaryProduct?.product.thumbnailUrl ? (
                  <button
                    type="button"
                    onClick={handleClickItemThumbnail}
                    className="flex h-full w-full items-center justify-center cursor-pointer transition
                   hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primaryProduct.product.thumbnailUrl}
                      alt={productName || "주문 상품 이미지"}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    이미지 없음
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1">
                {createdAtLabel && (
                  <div className="text-xs text-gray-500">{createdAtLabel} 주문</div>
                )}
                <div className="line-clamp-2 text-sm font-medium text-gray-900">
                  {productName}
                  {extraCount}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatKRW(latestOrder!.totalAmount)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
