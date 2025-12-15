import { ICommonResponse } from "@/utils/shared/interface";

/**
 * - "주문(마이페이지용)" 도메인 타입 정의 모음
 * - UI 레이어(app/mypage, app/order 등)는 이 타입들만 의존하도록 설계
 */

// 주문 상품의 결제 상태
export enum MypageOrderProductStatusEnum {
  "READY" = "READY",
  "IN_PROGRESS" = "IN_PROGRESS",
  "WAITING_FOR_DEPOSIT" = "WAITING_FOR_DEPOSIT",
  "DONE" = "DONE",
  "CANCELED" = "CANCELED",
  "RETURNED" = "RETURNED",
  "EXCHANGED" = "EXCHANGED",
  "PARTIAL_CANCELED" = "PARTIAL_CANCELED",
  "EXPIRED" = "EXPIRED",
  "ABORTED" = "ABORTED",
}

// 주문 상품의 배송 상태
export enum MypageShipmentProductStatusEnum {
  "DELIVERY_PREPARING" = "A",
  "SHIPPED" = "B",
  "DELIVERY_IN_PROGRESS" = "C",
  "DELIVERY_COMPLETED" = "D",
}

/**
 * 선택된 옵션 한 개 (예: "용량: 200g", "분쇄도: 프렌치프레스")
 * - Nest의 IIMypageProductOptionPayload 에 대응
 */
export interface IIMypageProductOption {
  optionNameKr: string;
  optionNameEn: string;
  optionValueKr: string;
  optionValueEn: string;
}

/**
 * 주문에 포함된 단일 상품 정보
 * - Nest의 IMypageProductPayload 에 대응
 */
export interface IMypageProduct {
  id: number;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
  selectedOptionList: IIMypageProductOption[];
}

export interface IMypageShipmentProduct {
  id: number;
  status: string | MypageShipmentProductStatusEnum;
  shippedAt: Date;
  deliveredAt: Date;
  createdAt: Date;
}

/**
 * 주문 내 "한 줄의 상품" (수량/가격/상태 포함)
 * - Nest의 IMypageOrderProductPayload 에 대응
 */
export interface IMypageOrderProduct {
  id: number;
  status: MypageOrderProductStatusEnum | string;
  qty: number;
  price: number;
  totalPrice: number;
  createdAt: string; // ISO 문자열로 들어올 것으로 가정 (Date로 파싱해서 써도 됨)
  product: IMypageProduct;
  shipment: IMypageShipmentProduct;
}

/**
 * 주문 한 건 (여러 상품을 묶은 단위)
 * - Nest의 IMypageOrderListItemPayload 에 대응
 */
export interface IMypageOrderListItem {
  id: number;
  no: string;
  totalMerchandise: number;
  totalShippingFee: number;
  totalAmount: number;
  orderProductList: IMypageOrderProduct[];
}

/**
 * 마이페이지 주문 목록 조회 요청 파라미터
 * - MyPageGetOrderListDto + CommonListDto 에 대응
 *
 * startDate / endDate 는 백엔드에서 기대하는 포맷(예: '2025-01-01')으로 넘겨야 한다.
 * (백엔드 구현을 정확히 모르기 때문에, 여기서는 string으로 두고
 *  호출하는 쪽에서 포맷을 맞춰서 주는 게 안전하다.)
 */
export interface IMypageOrderListRequest {
  /** 조회 시작 offset (0 기반) */
  offset: number;
  /** 조회 개수 (최대 50) */
  length: number;

  /** 조회 시작일 (예: '2025-06-01' 등 서버에서 기대하는 문자열 포맷) */
  startDate: string;
  /** 조회 종료일 (예: '2025-12-03') */
  endDate: string;

  /** 상품 이름 검색 키워드 (옵션) */
  keyword?: string;

  /** 주문 상품 결제 상태 필터 (옵션) */
  orderProductStatus?: MypageOrderProductStatusEnum[];

  /** 주문 상품 배송 상태 필터 (옵션) */
  shipmentProductStatus?: MypageShipmentProductStatusEnum[];
}

/**
 * UI에서 사용하는 검색 필터 상태
 * - offset/length만 뺀 나머지 필드
 */
export type IMypageOrderListFilter = Omit<IMypageOrderListRequest, "offset" | "length">;

export type IMypageOrderListResponse = ICommonResponse<IMypageOrderListItem>;
