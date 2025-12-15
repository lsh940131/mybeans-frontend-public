import { fetchApi } from "@/utils/client/fetchApi";
import { ProductGetSearchKeywordPayload, ProductSearchHistoryMergeBody } from "./types";

/**
 * 검색 키워드 기록 조회
 */
export async function list(): Promise<ProductGetSearchKeywordPayload[]> {
  const res = await fetchApi<ProductGetSearchKeywordPayload[]>(
    `/be/product/search/keyword/history`,
    { method: "GET" }
  );
  return res;
}

/**
 * 검색 기록 삭제
 */
export async function del(ids: number[]) {
  const qs = new URLSearchParams({ ids: ids.join(",") });
  await fetchApi<boolean>(`/be/product/search/history?${qs.toString()}`, { method: "DELETE" });
}

/**
 * 검색 기록 전부 삭제
 */
export async function clear() {
  await fetchApi<boolean>(`/be/product/search/history/clear`, { method: "DELETE" });
}

/**
 * 검색 기록 머지
 */
export async function merge(items: ProductSearchHistoryMergeBody) {
  await fetchApi<boolean>(`/be/product/merge/search/history`, { method: "POST", body: items });
}
