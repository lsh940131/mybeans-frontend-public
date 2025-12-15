"use client";

import { useEffect, useState } from "react";
import {
  IMypageOrderListFilter,
  MypageOrderProductStatusEnum,
  MypageShipmentProductStatusEnum,
} from "@/features/order/types";

interface OrderSearchModalProps {
  initialFilter: IMypageOrderListFilter;
  onApply: (filter: IMypageOrderListFilter) => void;
  onClose: () => void;
}

type QuickRange = "MAX" | "1M" | "6M" | "1Y";

function formatYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

function calcRange(range: QuickRange): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "1M":
      start.setMonth(start.getMonth() - 1);
      break;
    case "6M":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "MAX":
    default:
      start.setFullYear(start.getFullYear() - 5);
      break;
  }
  return { start: formatYMD(start), end: formatYMD(end) };
}

const ORDER_STATUS_OPTIONS: { label: string; value: MypageOrderProductStatusEnum }[] = [
  { label: "결제대기중", value: MypageOrderProductStatusEnum.READY },
  { label: "결제완료", value: MypageOrderProductStatusEnum.DONE },
  { label: "취소", value: MypageOrderProductStatusEnum.CANCELED },
  { label: "반품", value: MypageOrderProductStatusEnum.RETURNED },
  { label: "교환", value: MypageOrderProductStatusEnum.EXCHANGED },
];

const SHIPMENT_STATUS_OPTIONS: { label: string; value: MypageShipmentProductStatusEnum }[] = [
  { label: "배송 준비 중", value: MypageShipmentProductStatusEnum.DELIVERY_PREPARING },
  { label: "출고", value: MypageShipmentProductStatusEnum.SHIPPED },
  { label: "배송중", value: MypageShipmentProductStatusEnum.DELIVERY_IN_PROGRESS },
  { label: "배송완료", value: MypageShipmentProductStatusEnum.DELIVERY_COMPLETED },
];

export default function OrderSearchModal({
  initialFilter,
  onApply,
  onClose,
}: OrderSearchModalProps) {
  const [keyword, setKeyword] = useState(initialFilter.keyword ?? "");
  const [startDate, setStartDate] = useState(initialFilter.startDate);
  const [endDate, setEndDate] = useState(initialFilter.endDate);
  const [orderStatus, setOrderStatus] = useState<MypageOrderProductStatusEnum[]>(
    initialFilter.orderProductStatus ?? []
  );
  const [shipmentStatus, setShipmentStatus] = useState<MypageShipmentProductStatusEnum[]>(
    initialFilter.shipmentProductStatus ?? []
  );
  const [range, setRange] = useState<QuickRange>("6M");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleOrderStatus = (v: MypageOrderProductStatusEnum) => {
    setOrderStatus(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
  };

  const toggleShipmentStatus = (v: MypageShipmentProductStatusEnum) => {
    setShipmentStatus(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
  };

  const handleClickRange = (r: QuickRange) => {
    setRange(r);
    const { start, end } = calcRange(r);
    setStartDate(start);
    setEndDate(end);
  };

  const handleSubmit = () => {
    onApply({
      keyword: keyword.trim() || "",
      startDate,
      endDate,
      orderProductStatus: orderStatus.length ? orderStatus : undefined,
      shipmentProductStatus: shipmentStatus.length ? shipmentStatus : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">주문/배송내역 검색</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-gray-400 hover:text-gray-600"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-4 text-base font-medium text-gray-900">
          {/* 기간 빠른 선택 */}
          <div>
            <div className="mb-3 flex gap-2">
              {[
                { key: "MAX", label: "최대(5년)" },
                { key: "1M", label: "1개월" },
                { key: "6M", label: "6개월" },
                { key: "1Y", label: "1년" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleClickRange(key as QuickRange)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm font-semibold",
                    range === key
                      ? "border-emerald-500 bg-black/80 text-white"
                      : "border-gray-300 bg-white text-gray-800",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 날짜 입력 */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-10 flex-1 rounded-md border px-2 text-base font-medium text-gray-900"
              />
              <span className="text-base font-semibold text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-10 flex-1 rounded-md border px-2 text-base font-medium text-gray-900"
              />
            </div>
          </div>

          {/* 키워드 */}
          <div>
            <div className="mb-1 text-base font-semibold text-gray-900">상품명 검색</div>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="h-10 w-full rounded-md border px-2 text-sm font-medium text-gray-900"
              placeholder="상품 이름으로 검색"
            />
          </div>

          {/* 결제 상태 */}
          <div>
            <div className="mb-1 text-base font-semibold text-gray-900">결제 상태</div>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOrderStatus(opt.value)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm",
                    orderStatus.includes(opt.value)
                      ? "border-emerald-500 bg-black/80 text-white"
                      : "border-gray-300 bg-white text-gray-800",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 배송 상태 */}
          <div>
            <div className="mb-1 text-base font-semibold text-gray-900">배송 상태</div>
            <div className="flex flex-wrap gap-2">
              {SHIPMENT_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleShipmentStatus(opt.value)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm ",
                    shipmentStatus.includes(opt.value)
                      ? "border-emerald-500 bg-black/80 text-white"
                      : "border-gray-300 bg-white text-gray-800",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="border-t px-5 py-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="h-11 w-full rounded-md bg-black/80 text-base font-semibold text-white hover:bg-black"
          >
            조회하기
          </button>
        </div>
      </div>
    </div>
  );
}
