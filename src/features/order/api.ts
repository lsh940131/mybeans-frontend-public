import { fetchApi } from "@/utils/client/fetchApi";
import type { IMypageOrderListRequest, IMypageOrderListResponse } from "./types";

/**
 * 내부 유틸: 요청 파라미터를 QueryString으로 직렬화
 */
function buildMypageOrderListQuery(params: IMypageOrderListRequest): string {
  const searchParams = new URLSearchParams();

  searchParams.set("offset", String(params.offset));
  searchParams.set("length", String(params.length));
  searchParams.set("startDate", params.startDate);
  searchParams.set("endDate", params.endDate);

  if (params.keyword && params.keyword.trim()) {
    searchParams.set("keyword", params.keyword.trim());
  }

  if (params.orderProductStatus && params.orderProductStatus.length > 0) {
    searchParams.set("orderProductStatus", params.orderProductStatus.join(","));
  }

  if (params.shipmentProductStatus && params.shipmentProductStatus.length > 0) {
    searchParams.set("shipmentProductStatus", params.shipmentProductStatus.join(","));
  }

  return searchParams.toString();
}

/**
 * 마이페이지 주문 목록 조회
 * - GET /be/mypage/order/list
 */
export async function getMypageOrderList(
  params: IMypageOrderListRequest
): Promise<IMypageOrderListResponse> {
  const query = buildMypageOrderListQuery(params);

  const res = await fetchApi<IMypageOrderListResponse>(`/be/user/mypage/order/list?${query}`, {
    method: "GET",
  });

  return {
    count: res?.count ?? 0,
    list: res?.list ?? [],
  };
}
