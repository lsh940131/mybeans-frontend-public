"use client";

import { useRef, useEffect } from "react";

export function SignNaver({ rememberMe, redirectTo }: { rememberMe: boolean; redirectTo: string }) {
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const allowed = process.env.NEXT_PUBLIC_FRONT_URL!;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== allowed) return;

      const {
        ok,
        redirectTo = "/",
        provider,
      } = (e.data || {}) as {
        ok?: boolean;
        redirectTo?: string;
        provider?: string;
      };

      if (provider !== "naver") return;

      if (popupRef.current && e.source !== popupRef.current) return;

      try {
        popupRef.current?.close();
      } catch {}

      if (ok) window.location.assign(redirectTo);
      else alert("네이버 로그인 실패");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const openNaver = () => {
    const url = `/be/user/signin/naver?rememberMe=${rememberMe}&redirectTo=${encodeURIComponent(
      redirectTo
    )}`;
    const popup = window.open(url, "naver_oauth", "width=500,height=650,resizable=0,scrollbars=1");
    if (!popup) window.location.href = url;
  };

  return <button onClick={openNaver}>N</button>;
}
