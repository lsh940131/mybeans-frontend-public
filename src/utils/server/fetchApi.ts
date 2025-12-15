/**
 * 공용 fetch 래퍼
 * - AT 자동 첨부 + 401/INVALID_ACCESSTOKEN 시 RT로 갱신 후 재시도
 * - 세션 내 300ms "단기 중복 방지": 인플라이트 합류 + 완료 후 쿨다운 재사용
 * 사용:
 *   await fetchApi<T>("/be/...", { method: "POST", body: { ... } });
 *   await fetchApi<T>("/be/...", { dedupe: false });  // 엔드포인트별로 끄기 가능
 */
import { getCookie } from "./cookie";
import { COOKIE_AT_KEY } from "../shared/constants";
import { ResponsePayload } from "../shared/interface";
import { ErrorCodeEnum } from "../shared/enum";
import { FetchApiOptions } from "../shared/types";
import { isDedupeExcluded, makeRequestKey, serializeBodyForRequest } from "../shared";

// 단기 디듀프 상태(서버 프로세스 전역)
const inFlight = new Map<string, Promise<unknown>>();
const recent = new Map<string, { ts: number; data: unknown }>();

const REWRITE_ALIAS_MAP = (() => {
  if (typeof process === "undefined") {
    return {};
  }

  const env = process.env;
  const aliasMap: { [key: string]: string } = {};

  for (const key in env) {
    if (key.startsWith("REWRITE_ALIAS__")) {
      const rawAlias = key.replace("REWRITE_ALIAS__", "");
      const formattedAlias = "/" + rawAlias.replace(/_/g, "/"); // 예: api_v1 → /api/v1
      aliasMap[formattedAlias] = env[key] as string;
    }
  }

  return aliasMap;
})();

export async function fetchApi<T>(path: string, rawOptions: FetchApiOptions = {}): Promise<T> {
  const {
    dedupe = true,
    coalesce = true,
    reuseLast = "success",
    windowMs = 300,
    ...options
  } = rawOptions;

  const dedupeEnabled = dedupe && !isDedupeExcluded(path);
  const reqKey = dedupeEnabled ? makeRequestKey(path, rawOptions) : "";

  // 0) 쿨다운 재사용
  if (dedupeEnabled && reuseLast === "success" && reqKey) {
    const hit = recent.get(reqKey);
    if (hit && Date.now() - hit.ts <= windowMs) {
      return hit.data as T;
    }
  }

  const doCall = async (): Promise<T> => {
    try {
      let triedRefresh = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        // 1) 백엔드 api 요청
        const res = await request(path, options);

        // 2) AT 만료 → RT로 갱신 후 재시도
        if (res.status === 401) {
          if (triedRefresh) throw new Error(`[401] Unauthorized`);
          triedRefresh = true;

          const refresh = await renewAccessToken();
          if (!refresh.ok) throw new Error(refresh.message ?? "Unauthorized");
          continue;
        }

        // 3) HTTP 에러
        if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}`);

        // 4) JSON 아닌 응답
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return {} as T;

        // 5) payload 처리
        const payload = (await res.json()) as ResponsePayload<T>;

        if (payload?.error) {
          const code = payload.error.code;

          if (code === ErrorCodeEnum.INVALID_ACCESSTOKEN) {
            if (triedRefresh) throw new Error(`[${code}] ${payload.error.message}`);
            triedRefresh = true;

            const refresh = await renewAccessToken();
            if (!refresh.ok) throw new Error(refresh.message ?? payload.error.message);
            continue;
          }

          // 서버 에러 메시지 로깅(여기서는 alert 대신 로그)
          console.log(payload.error?.message);
        }

        // 성공: 쿨다운 기록
        if (dedupeEnabled && reqKey) {
          recent.set(reqKey, { ts: Date.now(), data: payload.data as unknown });
        }
        return payload.data;
      }

      throw new Error("Request failed after token refresh retry.");
    } finally {
      // 인플라이트 해제
      if (dedupeEnabled && reqKey) inFlight.delete(reqKey);
    }
  };

  // 1) 인플라이트 합류
  if (dedupeEnabled && coalesce && reqKey) {
    const existing = inFlight.get(reqKey);
    if (existing) return existing as Promise<T>;
    const p = doCall();
    inFlight.set(reqKey, p);
    return p;
  }

  // 2) 일반 호출
  return doCall();
}

async function request(
  path: string,
  options: Omit<FetchApiOptions, "dedupe" | "coalesce" | "reuseLast" | "windowMs">
): Promise<Response> {
  const headers = new Headers(options.headers ?? {});
  const bodyToSend = serializeBodyForRequest(options.body, headers);

  const at = await getCookie(COOKIE_AT_KEY);
  if (at) headers.set("Authorization", `Bearer ${at}`);

  const url = convertAbsoluteUrl(path);
  return fetch(url, {
    ...options,
    headers,
    body: bodyToSend,
    credentials: options.credentials ?? "include",
    cache: options.cache ?? "no-store",
  });
}

function convertAbsoluteUrl(path: string): string {
  try {
    // 이미 절대경로라면 ok
    return new URL(path).toString();
  } catch {
    // 상대경로라면 여기에 잡힘
    // 서버 컴포넌트에선 rewrite 기능을 사용할 수 없으므로 코드로 replace
    const matchedAlias = Object.keys(REWRITE_ALIAS_MAP).find(prefix => path.startsWith(prefix));
    if (matchedAlias) {
      const actualPath = path.replace(matchedAlias, "");
      const baseUrl = REWRITE_ALIAS_MAP[matchedAlias];
      return `${baseUrl}${actualPath}`;
    } else {
      throw new Error(`Unsupported API path: ${path}`);
    }
  }
}

async function renewAccessToken(): Promise<{
  ok: boolean;
  code?: string | null;
  message?: string;
}> {
  const url = convertAbsoluteUrl("/be/user/renew/accesstoken");
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  try {
    const payload = (await res.json()) as ResponsePayload<boolean>;
    if (!payload.error) return { ok: true };
    return { ok: false, code: payload.error.code, message: payload.error.message };
  } catch {
    return { ok: false, code: null, message: "Invalid refresh response" };
  }
}
