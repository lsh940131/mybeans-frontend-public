export enum OrderCheckoutSourceEnum {
  "CART" = "A", // 장바구니
  "BUYNOW" = "B", // 바로구매
}

export type CreateOrderCheckoutFromCart = {
  source: "A";
  cartIdList: number[];
};

export type CreateOrderCheckoutFromBuyNow = {
  source: "B";
  productId: number;
  qty: number;
  optionValueIdList?: number[]; // 옵션 없는 상품은 undefined 또는 []
};

export interface CreateOrderCheckoutResponse {
  id: number;
  expiredAt: Date; // ISO string
}

enum ProductStatusEnum {
  ON = "A", // 판매중
  OFF = "B", // 판매중단
}

interface IOptionValue {
  readonly id: number;
  readonly extraCharge: number;
  readonly valueKr: string;
  readonly valueEn: string;
}

interface IOption {
  readonly id: number;
  readonly isRequired: boolean;
  readonly nameKr: string;
  readonly nameEn: string;
  readonly valueList: IOptionValue[];
}

interface IProduct {
  readonly id: number;
  readonly status: ProductStatusEnum;
  readonly nameKr: string;
  readonly nameEn: string;
  readonly thumbnailUrl: string;
  readonly price: number;
  readonly shippingFee: number;
  readonly optionList: null | IOption[];
}

export interface ISellerItem {
  readonly cartId: number;
  readonly productId: number;
  readonly qty: number;
  readonly optionValueIdList: number[];
  readonly unitPrice: number;
  readonly totalPrice: number;
  readonly shippingFee: number;
  readonly product: IProduct;
}

interface ISellerSubtotalResponse {
  readonly sellerId: number;
  readonly sellerName: string;
  readonly freeShippingThreshold: number;
  readonly merchandiseSubtotal: number;
  readonly shippingFeeSubtotal: number;
  readonly freeApplied: boolean;
  readonly items: ISellerItem[];
}

export interface IQuoteResponse {
  readonly subtotalMerchandise: number;
  readonly subtotalShippingFee: number;
  readonly list: ISellerSubtotalResponse[];
}

export interface OrderCheckoutData {
  checkoutId: number;
  expiredAt: string | null;
  quote: IQuoteResponse;
}

export interface IShippingForm {
  receiverName: string;
  phone: string;
  address: string;
  addressDetail: string;
  postcode?: string;
}

export interface ISellerItemWithReqMsg extends ISellerItem {
  shipmentReqMsg: string;
}

export interface ISellerSubtotalWithReqMsg extends Omit<ISellerSubtotalResponse, "items"> {
  items: ISellerItemWithReqMsg[];
}

/**
 * 사용자 배송지(주소록) 리스트 아이템 타입
 * - 서버 UAListItemPayload 를 프론트에서 쓰기 쉽게 옮긴 형태
 */
export interface IUserAddress {
  id: number;
  name: string;
  receiverName: string;
  phone: string;
  address: string;
  addressDetail?: string | null;
  postcode?: string | null;
  isDefault: boolean;
  createdAt: string; // Date -> ISO string
  updatedAt?: string | null;
}

export type NewAddressForm = {
  name: string;
  receiverName: string;
  phone: string;
  address: string;
  addressDetail: string;
  postcode: string;
  isDefault: boolean;
};

export interface IOCUpdateItemPayload {
  key: string;
  shipmentReqMsg: string;
}

interface IOCUpdateShipmentPayload extends IShippingForm {
  items: IOCUpdateItemPayload[];
}

export interface IOCUpdatePayload {
  id: number;
  shipment: IOCUpdateShipmentPayload;
}
