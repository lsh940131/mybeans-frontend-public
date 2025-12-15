interface ErrorPayload {
  message: string;
  code: string | null;
}

export interface ResponsePayload<T> {
  data: T;
  error: ErrorPayload | null;
}

/**
 * 공통 리스트 응답 형태
 */
export interface ICommonResponse<T> {
  /** 전체 개수 */
  count: number;
  /** 현재 페이지에 해당하는 주문 리스트 */
  list: T[];
}
