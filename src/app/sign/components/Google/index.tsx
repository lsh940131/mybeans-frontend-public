"use client";

import { useEffect, useRef } from "react";

export function SignGoogle({
  rememberMe,
  redirectTo,
}: {
  rememberMe: boolean;
  redirectTo: string;
}) {
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

      if (provider !== "google") return;

      if (popupRef.current && e.source !== popupRef.current) return;

      // 팝업 레퍼런스로 닫기
      try {
        popupRef.current?.close();
      } catch {}

      if (ok) window.location.assign(redirectTo);
      else alert("구글 로그인 실패");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const openGoogle = () => {
    const w = 500,
      h = 650;

    const dualLeft = typeof window.screenLeft !== "undefined" ? window.screenLeft : window.screenX;
    const dualTop = typeof window.screenTop !== "undefined" ? window.screenTop : window.screenY;

    const innerW = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const innerH = window.innerHeight || document.documentElement.clientHeight || screen.height;

    const left = Math.max(0, dualLeft + (innerW - w) / 2);
    const top = Math.max(0, dualTop + (innerH - h) / 2);

    const features = [
      `width=${w}`,
      `height=${h}`,
      `left=${left}`,
      `top=${top}`,
      "resizable=0",
      "scrollbars=1",
      "toolbar=0",
      "location=0",
      "menubar=0",
      "status=0",
    ].join(",");

    const url = `/be/user/signin/google?rememberMe=${rememberMe}&redirectTo=${encodeURIComponent(
      redirectTo
    )}`;
    const popup = window.open(url, "google_oauth", features);
    if (!popup) window.location.href = url; // 팝업 차단 fallback
  };

  return <button onClick={openGoogle}>G</button>;
}
