/**
 * 목적: 클라이언트에서 액세스토큰 유효성 체크 + 사용자 정보 캐싱
 * 특징: fetchApi가 토큰 갱신(401/INVALID_ACCESSTOKEN)을 이미 처리하므로,
 * 훅은 단순히 "유효/무효"와 "user"만 상태로 노출합니다.
 * 사용: const { isAuthed, loading, user, refetch } = useAuth();
 */

"use client";

import { fetchApi } from "@/utils/client/fetchApi";
import { useCallback, useEffect, useRef, useState } from "react";

export function useAuth() {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const inFlight = useRef(false);

  /**
   * 액세스토큰 유효성 체크
   * - fetchApi가 내부적으로 AT 갱신을 시도하므로 여기선 결과만 반영
   * - 실패/예외 시 isAuthed=false 로 정리
   */
  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);

    try {
      const result = await fetchApi<boolean>("/be/user/check/accesstoken", {
        method: "GET",
        cache: "no-store",
      });
      if (typeof result === "boolean") setIsAuthed(result);
    } catch {
      setIsAuthed(false);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => void check(), [check]);

  return {
    isAuthed,
    loading,
    refetch: check, // 로그인/로그아웃 직후에 호출해서 상태 갱신
  };
}
