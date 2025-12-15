import { fetchApi } from "@/utils/client/fetchApi";
import { ProductListPayload } from "./types";

/**
 * 최근 본 상품 리스트 조회
 */
export async function list(): Promise<ProductListPayload> {
  const res = await fetchApi<ProductListPayload>(`/be/product-watch-history`);
  return res;
}

/**
 * 최근 본 상품 추가
 */
export async function add(productId: number): Promise<number> {
  const res = await fetchApi<{ id: number }>(`/be/product-watch-history`, {
    method: "POST",
    body: { productId },
  });
  return res.id; // historyId
}

/**
 * 최근 본 상품 삭제
 */
export async function del(productId: number): Promise<void> {
  await fetchApi<boolean>(`/be/product-watch-history?productId=${productId}`, {
    method: "DELETE",
  });
}

export async function clear(): Promise<void> {
  await fetchApi<boolean>(`/be/product-watch-history/clear`, { method: "DELETE" });
}
