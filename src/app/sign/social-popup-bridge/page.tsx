"use client";

import { useEffect } from "react";

function parseHash() {
  const qs = new URLSearchParams(window.location.hash.slice(1));
  const ok = qs.get("ok") === "true";
  const reason = qs.get("reason") || "";
  const provider = qs.get("provider") || "";
  const raw = qs.get("redirectTo") || "/";
  const redirectTo =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  return { ok, reason, redirectTo, provider };
}

export default function SocialPopupBridge() {
  useEffect(() => {
    const { ok, reason, redirectTo, provider } = parseHash();

    // 팝업 모드: 부모창 통지 후 닫기
    if (window.opener && !window.opener.closed) {
      try {
        const targetOrigin = window.location.origin;
        window.opener.postMessage({ ok, redirectTo, reason, provider }, targetOrigin);
      } catch {
        // do nothing
      } finally {
        window.close();
        return;
      }
    }

    // 현재 탭 모드(팝업 차단 fallback): 브릿지가 직접 이동
    if (ok) {
      // replace: 뒤로가기 누르면 브릿지로 돌아오지 않도록
      window.location.replace(redirectTo);
    } else {
      // 실패 UX는 서비스 정책에 맞게
      alert(`소셜 로그인에 실패했습니다. ${reason}`);
      window.location.replace("/sign");
    }
  }, []);

  return null;
}
