/**
 * 목적: 로그아웃 시나리오
 * 동작:
 *  - 로그아웃 API 호출
 *  - 쿠키 및 세션에 저장된 모든 정보 삭제
 */
"use client";

import { fetchApi } from "@/utils/client/fetchApi";
import { clearCookies } from "@/utils/client/cookie";
import { clearSession } from "@/utils/client/session";

export async function runSignoutScenario(): Promise<boolean> {
  try {
    // 로그아웃 api 호출
    await fetchApi("/be/user/signout", { method: "POST" });

    // 모든 쿠키 삭제
    clearCookies();

    // 모든 세션 데이터 삭제
    clearSession();

    return true;
  } catch (e) {
    console.warn((e as Error)?.message ?? "sigout-scenario-failed");
    return false;
  }
}
