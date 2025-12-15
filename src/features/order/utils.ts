import { MypageShipmentProductStatusEnum } from "./types";

/**
 * 배송 상태 코드 → 화면용 라벨
 * - 마이페이지 요약 카드, 주문 목록 페이지 양쪽에서 공용 사용
 */
export function mapShipmentStatusToLabel(
  status: string | MypageShipmentProductStatusEnum | null | undefined
): string {
  if (!status) return "상품 준비 중";

  const code = status as MypageShipmentProductStatusEnum;

  switch (code) {
    case MypageShipmentProductStatusEnum.DELIVERY_PREPARING: // 예: "A"
      return "배송 준비 중";
    case MypageShipmentProductStatusEnum.SHIPPED: // 예: "B"
      return "출고";
    case MypageShipmentProductStatusEnum.DELIVERY_IN_PROGRESS: // 예: "C"
      return "배송중";
    case MypageShipmentProductStatusEnum.DELIVERY_COMPLETED: // 예: "D"
      return "배송완료";
    default:
      return "상품 준비 중";
  }
}
