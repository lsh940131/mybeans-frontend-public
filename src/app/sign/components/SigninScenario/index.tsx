/**
 * 목적: "로그인 성공 직후" 한 번만 수행할 후처리 시나리오(로직 전용)
 * 동작:
 *  - 인증 스냅샷 refetch
 *  - 구경상품목록: 게스트 watch → 회원으로 병합 → 이벤트 브로드캐스트
 * 사용: await runSigninScenario({ refetchAuth: useAuth().refetch })
 * 주의: UI/라우팅은 호출측에서 처리(router.refresh/replace 등)
 */
"use client";

import { mergeGuestToMember as mergeWatchHistory } from "@/app/components/Header/components/WatchHistory/hooks/useWatchHistory";
import { mergeGuestToMember as mergeCart } from "@/app/cart/hooks/useCart";
import { mergeGuestToMember as mergeProductSearchHistory } from "@/app/components/Header/components/ProductSearchBox/hooks/useProductSearch";

export async function runSigninScenario(): Promise<boolean> {
  try {
    // 구경한 상품 히스토리 머지
    await mergeWatchHistory();

    // 장바구니 머지
    await mergeCart();

    // 상품 키워드 검색 히스토리 머지
    await mergeProductSearchHistory();

    return true;
  } catch (e) {
    console.warn((e as Error)?.message ?? "sigin-scenario-failed");
    return false;
  }
}
