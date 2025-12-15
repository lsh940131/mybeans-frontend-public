export enum ProductStatusEnum {
  ON = "A", // 판매중
  OFF = "B", // 판매중단
}

/** ── 공통 베이스 타입 ─────────────────────────────────────── */
export type BaseItem = {
  productId: number;
  qty: number;
  optionValueIdList?: number[];
};

export type BaseItemStrict = {
  productId: number;
  qty: number;
  optionValueIdList: number[];
};

/** 재사용 유틸 */
export type ItemKeyed = { key: string };
export type Timestamped = { createdAt?: number }; // epoch ms

/** ── 세션/게스트 장바구니 로컬 보관 ─────────────────────── */
export type CartItem = ItemKeyed & BaseItem & Timestamped;

export type CartAddItem = BaseItem & Timestamped;

export type CartList = { keys?: string[] };

export type CartUpdateItem = { key: string; qty: number };

export type CartDeleteItems = { keys: string[] };

export type CartActionResult = { ok: boolean; message?: string };

/** ── 제품 옵션 스키마 ───────────────────────────────────── */
export type ProductOptionValue = {
  id: number;
  extraCharge: number;
  valueKr: string;
  valueEn: string;
};

export type ProductOption = {
  id: number;
  isRequired: boolean;
  nameKr: string;
  nameEn: string;
  valueList: ProductOptionValue[];
};

/** ── 견적(Quote) 응답 도메인 ───────────────────────────── */
export type QuoteItem = BaseItemStrict & {
  cartId: number;
  unitPrice: number;
  totalPrice: number;
  shippingFee: number;
  product: {
    id: number;
    status: ProductStatusEnum;
    nameKr: string;
    nameEn: string;
    thumbnailUrl: string | null;
    price: number;
    shippingFee: number;
    optionList: null | ProductOption[];
  };
};

export type QuoteList = {
  sellerId: number;
  sellerName: string;
  freeShippingThreshold: number;
  merchandiseSubtotal: number;
  shippingFeeSubtotal: number;
  freeApplied: boolean;
  items: QuoteItem[];
};

export enum ValidationIssueEnum {
  PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
  PRODUCT_OFF = "PRODUCT_OFF",
  PRODUCT_DELETED = "PRODUCT_DELETED",
  SALE_WINDOW_CLOSED = "SALE_WINDOW_CLOSED",
  QTY_OUT_OF_RANGE = "QTY_OUT_OF_RANGE",
  DUPLICATE_OPTION_VALUE = "DUPLICATE_OPTION_VALUE",
  REQUIRED_OPTION_MISSING = "REQUIRED_OPTION_MISSING",
  REQUIRED_OPTION_TOO_MANY = "REQUIRED_OPTION_TOO_MANY",
  OPTION_VALUE_NOT_BELONGS = "OPTION_VALUE_NOT_BELONGS",
}

export type InvalidItem = BaseItemStrict & {
  reasons: ValidationIssueEnum[];
};

export type QuoteResponse = {
  subtotalMerchandise: number;
  subtotalShippingFee: number;
  invalidItems: InvalidItem[];
  list: QuoteList[];
};

/** ── UI 매핑 결과 ───────────────────────────────────────── */
export type UISelectedOption = {
  optionId: number;
  optionName: string;
  valueId: number;
  valueName: string;
  extraCharge: number;
};

export type UICartItem = {
  key: string;
  cartId?: number;
  productId: number;
  productNameKr: string;
  productNameEn: string;
  productThumbnail: string | null;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  shippingFee: number;

  allOptions: ProductOption[];
  selectedOptions: UISelectedOption[];
};

export type UISellerSubtotal = {
  sellerId: number;
  sellerName: string;
  freeShippingThreshold: number;
  freeApplied: boolean;
  merchandiseSubtotal: number;
  shippingFeeSubtotal: number;
  items: UICartItem[];
};

export type UICartQuote = {
  subtotalMerchandise: number;
  subtotalShippingFee: number;
  list: UISellerSubtotal[];
  invalidItems: InvalidItem[];
};
