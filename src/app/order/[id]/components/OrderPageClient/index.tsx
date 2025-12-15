"use client";

/**
 * 주문서(Checkout) 페이지의 루트 클라이언트 컴포넌트
 * - 배송지, 배송 메모, 결제 진행 상태 등 모든 페이지 상태를 통합 관리
 * - ShippingSection / OrderSummarySection / TossPaymentSection 등 하위 섹션과만 통신
 */

import {
  ISellerSubtotalWithReqMsg,
  IShippingForm,
  OrderCheckoutData,
  IOCUpdateItemPayload,
  IOCUpdatePayload,
} from "@/app/order/types";
import { useCallback, useEffect, useState } from "react";
import ShippingSection from "../ShippingSection";
import { useRouter } from "next/navigation";
import ItemSection from "../ItemSection";
import OrderFooter from "../OrderFooter";
import TossPaymentSection from "../TossPaymentSection";
import { fetchApi } from "@/utils/client/fetchApi";

interface OrderPageClientProps {
  data: OrderCheckoutData;
}

export default function OrderPageClient({ data }: OrderPageClientProps) {
  const { checkoutId, expiredAt, quote } = data;
  const router = useRouter();

  // 총 결제 금액 (상품 + 배송비)
  const totalAmount = (quote?.subtotalMerchandise ?? 0) + (quote?.subtotalShippingFee ?? 0);
  // 주문 상품 유무 체크 (없으면 말이 안됨)
  const hasNoItems = !quote?.list || quote.list.length === 0;

  let isExpiredOrUnknown = false;
  if (!expiredAt) {
    isExpiredOrUnknown = true;
  } else {
    const exp = new Date(expiredAt).getTime();
    if (Number.isNaN(exp) || exp <= Date.now()) {
      isExpiredOrUnknown = true;
    }
  }

  const [isExpired, setIsExpired] = useState(isExpiredOrUnknown);

  /**
   * 견적서가 유효하지 않거나 만료시간을 넘겼을 경우
   */
  useEffect(() => {
    if (hasNoItems || isExpired) {
      alert("유효하지 않거나 만료된 주문서입니다.\n이전 페이지로 돌아갑니다.");
      router.back();
    }
  }, [hasNoItems, isExpired, router]);

  /**
   * 만료시간 체크 타이머
   */
  useEffect(() => {
    if (!expiredAt) return;

    const exp = new Date(expiredAt).getTime();
    if (Number.isNaN(exp)) return;

    const now = Date.now();
    const delay = exp - now;

    // 이미 지난 시간이라면 바로 만료 처리
    if (delay <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsExpired(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [expiredAt]);

  // 판매자별 견적 + 각 item의 shipmentReqMsg를 포함하는 상태
  const [sellerSubtotalList, setSellerSubtotalList] = useState<ISellerSubtotalWithReqMsg[]>(
    (quote?.list ?? []).map(seller => ({
      ...seller,
      items: seller.items.map(item => ({
        ...item,
        shipmentReqMsg: "",
      })),
    }))
  );

  // 배송지 폼 상태
  const [shippingForm, setShippingForm] = useState<IShippingForm>({
    receiverName: "",
    phone: "",
    postcode: "",
    address: "",
    addressDetail: "",
  });

  /**
   * 배송지 폼 필드 변경 핸들러
   */
  const handleChangeShippingField = useCallback((field: keyof IShippingForm, value: string) => {
    setShippingForm(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Toss에서 넘겨주는 결제 핸들러
  const [payHandler, setPayHandler] = useState<(() => Promise<void>) | null>(null);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false); // 중복 클릭 방지용

  const handlePaymentReady = useCallback(
    (handler: (() => Promise<void>) | null, meta: { isReady: boolean }) => {
      setPayHandler(() => handler ?? null);
      setIsPaymentReady(meta.isReady);
    },
    []
  );

  const handleClickPay = async () => {
    if (isExpired) {
      alert("만료된 주문서입니다. 다시 주문을 진행해 주세요.");
      return;
    }

    if (isPaying) {
      return;
    }

    // 1) 배송지 검증
    if (!shippingForm.receiverName || !shippingForm.phone || !shippingForm.address) {
      alert("배송지 정보를 모두 입력해 주세요.");
      return;
    }

    // 2) Toss 위젯 준비 여부 확인
    if (!isPaymentReady || !payHandler) {
      alert("결제 수단을 준비 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    // 3) 계산서의 배송지 및 배송요청사항 업데이트 payload 구성
    const itemsPayload: IOCUpdateItemPayload[] = [];
    const allItems = sellerSubtotalList.flatMap(v => v.items);
    for (const item of allItems) {
      const optValueIds = item?.optionValueIdList?.map(w => Number(w)) ?? [];
      const shipmentReqMsg =
        item.shipmentReqMsg && item.shipmentReqMsg.trim().length > 0
          ? item.shipmentReqMsg.trim()
          : "";

      itemsPayload.push({
        key: makeItemKeyToServer(item.productId, optValueIds),
        shipmentReqMsg: shipmentReqMsg,
      });
    }
    const updatePayload: IOCUpdatePayload = {
      id: checkoutId,
      shipment: {
        receiverName: shippingForm.receiverName,
        phone: shippingForm.phone,
        address: shippingForm.address,
        addressDetail: shippingForm.addressDetail,
        postcode: shippingForm.postcode,
        items: itemsPayload,
      },
    };

    // 4) 계산서 배송지 및 배송요청사항 업데이트 & Toss 결제 요청
    try {
      setIsPaying(true);

      // 4-1) 업데이트 요청
      await fetchApi("/be/order/checkout", {
        method: "PUT",
        body: updatePayload,
      });

      // 4-2) Toss 결제 요청
      await payHandler();
    } catch (e) {
      console.error("[OrderPageClient] checkout 업데이트 또는 결제 요청 실패:", e);
      const msg =
        "주문 정보를 저장하거나 결제 요청 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.";
      alert(msg);
    } finally {
      setIsPaying(false);
    }
  };

  // 견적서의 아이템이 없거나 만료시각이 없거나 지났을 경우 render 하지 않도록
  if (hasNoItems || isExpired) {
    return null;
  }

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-32">
        <header className="mb-6 border-b pb-4">
          <h1 className="text-xl font-semibold text-center">주문/결제</h1>
        </header>

        <div className="space-y-6 rounded-2xl bg-neutral-50 px-4 py-6">
          {/* 1. 배송지 + 배송요청 메모 섹션 */}
          <ShippingSection
            onChangeShippingField={handleChangeShippingField}
            sellerSubtotalList={sellerSubtotalList}
            setSellerSubtotalList={setSellerSubtotalList}
          />

          {/* 2. 상품 섹션 */}
          <ItemSection sellerSubtotalList={sellerSubtotalList}></ItemSection>

          {/* 3. 결제수단 섹션 */}
          <TossPaymentSection
            checkoutId={checkoutId}
            totalAmount={totalAmount}
            onPaymentReady={handlePaymentReady}
          />
        </div>
      </main>

      <OrderFooter totalAmount={totalAmount} onClickPay={handleClickPay} />
    </>
  );
}

function makeItemKeyToServer(productId: number, optValueIds: number[]): string {
  if (!optValueIds || optValueIds.length === 0) return `${productId}:-`;

  const sorted = optValueIds.map(Number).filter(v => Number.isFinite(v));
  sorted.sort((a, b) => a - b);

  return `${productId}:${sorted.join(",")}`;
}
