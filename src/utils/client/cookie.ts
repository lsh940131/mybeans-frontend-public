"use client";

export function getCookie(key: string): string | undefined {
  // 쿠키 문자열 파싱
  const cookies = document.cookie.split("; ").map(v => v.split("="));
  const found = cookies.find(([v]) => v === key);

  return found?.[1];
}

export type SetCookieOptions = {
  key: string;
  value: string;
  maxAge?: number; // sec
  path?: string;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};
export function setCookie({
  key,
  value,
  maxAge = 31536000,
  path = "/",
  secure = false,
  sameSite = "lax",
}: SetCookieOptions) {
  const encodedValue = encodeURIComponent(value);
  let cookie = `${key}=${encodedValue}; path=${path};`;

  if (maxAge !== undefined) {
    cookie += ` max-age=${maxAge};`;
  }

  if (secure) {
    cookie += ` secure;`;
  }

  if (sameSite) {
    cookie += ` SameSite=${sameSite};`;
  }

  document.cookie = cookie;
}

/**
 * 모든 쿠키 제거
 * - document.cookie 를 직접 읽어서 key 추출 후 삭제
 */
export function clearCookies() {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

    document.cookie = `${name}=; max-age=0; path=/;`;
  }
}
