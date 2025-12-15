"use client";

import { formatKRW } from "@/utils/shared";

interface OrderFooterProps {
  // 최종 결제 금액
  totalAmount: number;
  // 결제 가능 여부
  disabled?: boolean;
  // 결제 실행 함수
  onClickPay: () => void;
}

export default function OrderFooter({ totalAmount, disabled, onClickPay }: OrderFooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-4 py-3">
        {/* 좌측 안내 무구 */}
        <p className="flex-1 text-[15px] text-neutral-600">
          약관 및 주문 내용을 확인하였으며, 정보 제공 등에 동의합니다.
        </p>

        {/* 우측 결제 버튼 */}
        <button
          type="button"
          onClick={onClickPay}
          disabled={disabled}
          className={[
            "min-w-[220px] rounded-2xl px-6 py-3 text-lg font-semibold text-white",
            "shadow-md transition-transform",
            disabled
              ? "cursor-not-allowed bg-neutral-300"
              : "bg-[#00c73c] hover:brightness-105 active:scale-[0.98]",
          ].join(" ")}
        >
          {formatKRW(totalAmount)} 결제하기
        </button>
      </div>
    </footer>
  );
}
