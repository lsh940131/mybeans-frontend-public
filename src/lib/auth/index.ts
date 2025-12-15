/**
 * 서버 컴포넌트/라우트 핸들러에서 인증 상태 확인
 * httpOnly 쿠키 기반 인증일 때 안전. RSC에서 개인화 분기 시 사용
 */

import { fetchApi } from "@/utils/server/fetchApi";

export async function auth() {
  let isAuthed: boolean = false;

  try {
    const result = await fetchApi<boolean>("/be/user/check/accesstoken", {
      method: "GET",
      cache: "no-store",
    });
    if (typeof result === "boolean") isAuthed = result;

    return { isAuthed };
  } catch {
    return { isAuthed: false };
  }
}
