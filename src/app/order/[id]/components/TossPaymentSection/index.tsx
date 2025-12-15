"use client";

import { useEffect, useRef, useState } from "react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { fetchApi } from "@/utils/client/fetchApi";

interface TossPaymentSectionProps {
  checkoutId: number;
  totalAmount: number;
  /**
   * 결제 위젯이 준비되면 부모에게 결제 핸들러를 넘겨줌
   */
  onPaymentReady: (handler: (() => Promise<void>) | null, meta: { isReady: boolean }) => void;
}

const widgetClientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY ?? "test_gck_docs_OvzE3N8L"; // 예시

export default function TossPaymentSection({
  checkoutId,
  totalAmount,
  onPaymentReady,
}: TossPaymentSectionProps) {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setIsLoading(true);

        // 1) 사용자 정보 가져와서 customerKey 생성
        const user = await fetchApi<{ id: number; name: string; email: string }>("/be/user", {
          method: "GET",
        });
        const customerKey = `userId=${user.id}`;

        // 2) Toss Payment Widget 로드
        const widget = await loadPaymentWidget(widgetClientKey, customerKey);
        if (cancelled) return;

        paymentWidgetRef.current = widget;

        // 3) 결제수단 영역 렌더
        const paymentContainer = document.getElementById("payment-widget");
        if (!paymentContainer) {
          console.error("[TossPaymentSection] #payment-widget 요소를 찾을 수 없습니다.");
          return;
        }

        await widget.renderPaymentMethods(
          "#payment-widget",
          { value: totalAmount },
          { variantKey: "DEFAULT" }
        );

        // 4) 동의 영역 렌더
        const agreementContainer = document.getElementById("agreement-widget");
        if (!agreementContainer) {
          console.error("[TossPaymentSection] #agreement-widget 요소를 찾을 수 없습니다.");
          return;
        }

        await widget.renderAgreement("#agreement-widget");

        // 5) 부모에게 결제 핸들러 전달
        const handleRequestPayment = async () => {
          if (!paymentWidgetRef.current) return;

          await paymentWidgetRef.current.requestPayment({
            orderId: `checkoutId-${checkoutId}`,
            orderName: "주문 결제",
            successUrl: `${window.location.origin}/order/${checkoutId}/success`,
            failUrl: `${window.location.origin}/order/${checkoutId}/fail`,
            customerEmail: user.email,
            customerName: user.name,
          });
        };

        onPaymentReady(handleRequestPayment, { isReady: true });
      } catch (e) {
        console.error("[TossPaymentSection] 위젯 초기화 실패:", e);
        onPaymentReady(null, { isReady: false });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [checkoutId, totalAmount, onPaymentReady]);

  return (
    <section aria-label="결제수단" className="space-y-3">
      <h2 className="text-xl font-semibold">결제수단</h2>

      <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        {/* 결제수단 선택 영역 */}
        <div id="payment-widget" className="mb-4" />

        {/* 약관 동의 영역 */}
        <div
          id="agreement-widget"
          className="rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-3"
        />

        {isLoading && (
          <p className="mt-2 text-sm text-neutral-500">결제 위젯을 불러오는 중입니다...</p>
        )}
      </div>
    </section>
  );
}
