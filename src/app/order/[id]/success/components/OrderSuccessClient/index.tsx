"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/utils/client/fetchApi";

interface OrderSuccessClientProps {
  checkoutId: number;
  paymentKey: string;
  tossOrderId: string;
  amount: number;
}

export default function OrderSuccessClient({
  checkoutId,
  paymentKey,
  tossOrderId,
  amount,
}: OrderSuccessClientProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const run = async () => {
      // 필수 파라미터 검증 실패 → checkout은 아직 유효할 수 있으니 이전 페이지로
      if (!checkoutId || !paymentKey || !tossOrderId || !amount) {
        alert("결제 정보가 올바르지 않습니다.\n이전 페이지로 돌아갑니다.");
        router.back();
        return;
      }

      try {
        // 백엔드 결제 승인 요청
        await fetchApi("/be/order/payment/toss/confirm", {
          method: "POST",
          body: {
            checkoutId,
            paymentKey,
            tossOrderId,
            amount,
          },
        });

        setIsConfirmed(true);
      } catch (err) {
        console.error("[OrderSuccess] 결제 승인 처리 실패:", err);
        alert("결제 승인 처리 중 오류가 발생했습니다.\n이전 페이지로 돌아갑니다.");
        router.back();
        return;
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [checkoutId, paymentKey, tossOrderId, amount, router]);

  if (isLoading) {
    return (
      <main className="flex h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-600">결제 정보를 확인하는 중입니다...</p>
      </main>
    );
  }

  if (!isConfirmed) {
    // 위에서 back 처리되기 때문에 여기까지 오는 경우는 거의 없음
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white px-6 py-10 shadow-lg text-center">
        {/* 아이콘 / 이미지 영역 */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          {/* 간단한 체크 아이콘 (SVG) */}
          <svg
            className="h-10 w-10 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-neutral-900">결제가 완료되었습니다</h1>
        <p className="mt-3 text-sm text-neutral-600">
          주문 및 결제가 정상적으로 처리되었습니다.
          <br />
          자세한 내역은 마이페이지에서 확인하실 수 있어요.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50 sm:w-40"
          >
            메인으로 가기
          </button>
          <button
            type="button"
            onClick={() => router.replace("/mypage")}
            className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-90 sm:w-40"
          >
            마이페이지로 가기
          </button>
        </div>
      </div>
    </main>
  );
}
