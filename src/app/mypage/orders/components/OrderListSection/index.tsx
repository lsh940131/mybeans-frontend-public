"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IMypageOrderListItem,
  IMypageOrderListFilter,
  IMypageOrderListRequest,
} from "@/features/order/types";
import { getMypageOrderList } from "@/features/order/api";
import { formatDate, formatKRW } from "@/utils/shared";
import { mapShipmentStatusToLabel } from "@/features/order/utils";
import OrderSearchModal from "../OrderSearchModal";

const PAGE_SIZE = 10;

function formatYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function OrderListSection() {
  // 기본 기간: 최근 6개월
  const today = useMemo(() => new Date(), []);
  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d;
  }, []);

  /** offset/length를 제외한 검색 필터 상태 */
  const [filter, setFilter] = useState<IMypageOrderListFilter>({
    startDate: formatYMD(sixMonthsAgo),
    endDate: formatYMD(today),
    keyword: "",
    orderProductStatus: undefined,
    shipmentProductStatus: undefined,
  });

  /** 현재 페이지 (0-based) */
  const [page, setPage] = useState(0);

  const [orders, setOrders] = useState<IMypageOrderListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  /** 필터 + 페이지를 기반으로 실제 API 쿼리 인터페이스 구성 */
  const buildRequestParams = (): IMypageOrderListRequest => ({
    offset: page * PAGE_SIZE,
    length: PAGE_SIZE,
    startDate: filter.startDate,
    endDate: filter.endDate,
    keyword: filter.keyword || undefined,
    orderProductStatus: filter.orderProductStatus,
    shipmentProductStatus: filter.shipmentProductStatus,
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params = buildRequestParams();
      const res = await getMypageOrderList(params); // ← 여기서 IMypageOrderListRequest 사용

      setOrders(res.list ?? []);
      setTotalCount(res.count ?? 0);
    } catch (e) {
      console.error("[OrderListSection] 주문 목록 조회 실패:", e);
      setErrorMsg("주문/배송 내역을 불러오지 못했습니다.");
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const handleOpenSearchModal = () => setIsSearchModalOpen(true);
  const handleCloseSearchModal = () => setIsSearchModalOpen(false);

  /** 모달에서 필터 적용 */
  const handleApplyFilter = (next: IMypageOrderListFilter) => {
    setFilter(next);
    setPage(0); // 필터 바꾸면 첫 페이지로
    setIsSearchModalOpen(false);
  };

  const hasAnyData = totalCount > 0;

  const goPrevPage = () => setPage(p => Math.max(0, p - 1));
  const goNextPage = () => setPage(p => Math.min(totalPages - 1, p + 1));

  return (
    <>
      <section className="rounded-2xl bg-white shadow-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">주문/배송내역</h1>
        </div>

        {/* 검색 박스 (클릭 시 모달 오픈) */}
        <button
          type="button"
          onClick={handleOpenSearchModal}
          className="flex w-full items-center justify-between border-b bg-gray-50 px-6 py-3 text-left hover:bg-gray-100"
        >
          <span className="text-sm text-gray-500">
            {filter.keyword ? filter.keyword : "검색어를 입력하세요"}
          </span>
          <span className="text-xl text-gray-400">🔍</span>
        </button>

        {/* 리스트 영역 */}
        <div className="px-6 py-4">
          {loading && (
            <div className="py-8 text-center text-sm text-gray-500">
              주문/배송 내역을 불러오는 중입니다...
            </div>
          )}

          {!loading && errorMsg && (
            <div className="py-8 text-center text-sm text-red-500">{errorMsg}</div>
          )}

          {!loading && !errorMsg && !hasAnyData && (
            <div className="py-8 text-center text-sm text-gray-500">
              조건에 해당하는 주문 내역이 없습니다.
            </div>
          )}

          {!loading && !errorMsg && hasAnyData && (
            <>
              <div className="mb-3 text-sm text-gray-600">
                총 <span className="font-semibold">{totalCount}</span>건
              </div>

              <div className="space-y-4">
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>

              {/* 페이지네이션 */}
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-700">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 disabled:opacity-40"
                  disabled={page === 0}
                  onClick={goPrevPage}
                >
                  이전
                </button>

                <span>
                  {page + 1}
                  {totalPages > 1 && ` / ${totalPages}`}
                </span>

                <button
                  type="button"
                  className="rounded-md border px-3 py-1 disabled:opacity-40"
                  disabled={page + 1 >= totalPages}
                  onClick={goNextPage}
                >
                  다음
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {isSearchModalOpen && (
        <OrderSearchModal
          initialFilter={filter}
          onClose={handleCloseSearchModal}
          onApply={handleApplyFilter}
        />
      )}
    </>
  );
}

/** 주문 1건 카드 (접기/펼치기) */
function OrderCard({ order }: { order: IMypageOrderListItem }) {
  const [open, setOpen] = useState(false);
  const primary = order.orderProductList[0];

  const createdAtLabel = formatDate(primary.createdAt);
  const statusLabel = mapShipmentStatusToLabel(String(primary.shipment?.status));
  const productName = primary.product.nameKr;
  const productCount = order.orderProductList.length;
  const extraCount = productCount > 1 ? ` 외 ${productCount - 1}개` : "";

  return (
    <article className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        className="flex w-full items-stretch justify-between gap-4 px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1">
          <div className="mb-1 text-xs text-gray-500">
            {createdAtLabel} · 주문번호 {order.no}
          </div>
          <div className="mb-1 text-sm font-semibold text-gray-900">{statusLabel}</div>

          <div className="mb-1 flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              {primary.product.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primary.product.thumbnailUrl}
                  alt={productName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
                  이미지 없음
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-0.5">
              <div className="line-clamp-2 text-sm font-medium text-gray-900">
                {productName}
                {extraCount}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {formatKRW(order.totalAmount)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-400">{open ? "▲" : "▼"}</div>
      </button>

      {open && (
        <div className="border-t px-4 py-3">
          <ul className="space-y-2 text-sm text-gray-800">
            {order.orderProductList.map(item => (
              <li key={item.id} className="flex justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">{item.product.nameKr}</div>
                  {!!item.product.selectedOptionList?.length && (
                    <div className="text-xs text-gray-500">
                      {item.product.selectedOptionList
                        .map(opt => `${opt.optionNameKr}: ${opt.optionValueKr}`)
                        .join(", ")}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">수량 {item.qty}개</div>
                </div>
                <div className="text-right text-sm font-semibold">{formatKRW(item.totalPrice)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
