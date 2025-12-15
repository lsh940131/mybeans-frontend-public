/**
 * 공용 fetch 래퍼
 * - AT 자동 첨부 + 401/INVALID_ACCESSTOKEN 시 RT로 갱신 후 재시도
 * - 세션 내 300ms "단기 중복 방지": 인플라이트 합류 + 완료 후 쿨다운 재사용
 * 사용:
 *   await fetchApi<T>("/be/...", { method: "POST", body: { ... } });
 *   await fetchApi<T>("/be/...", { dedupe: false });  // 엔드포인트별로 끄기 가능
 */
"use client";

import { getCookie } from "./cookie";
import { ResponsePayload } from "../shared/interface";
import { COOKIE_AT_KEY } from "../shared/constants";
import { ErrorCodeEnum } from "../shared/enum";
import { isDedupeExcluded, makeRequestKey, serializeBodyForRequest } from "../shared";
import { FetchApiOptions } from "../shared/types";

const inFlight = new Map<string, Promise<unknown>>();
const recent = new Map<string, { ts: number; data: unknown }>();

export async function fetchApi<T>(path: string, rawOptions: FetchApiOptions = {}): Promise<T> {
  const {
    dedupe = true,
    coalesce = true,
    reuseLast = "success",
    windowMs = 300,
    ...options
  } = rawOptions;

  const dedupeEnabled = dedupe && !isDedupeExcluded(path);
  const reqKey = dedupeEnabled ? makeRequestKey(path, options) : "";

  if (dedupeEnabled && reuseLast === "success" && reqKey) {
    const hit = recent.get(reqKey);
    if (hit && Date.now() - hit.ts <= windowMs) return hit.data as T;
  }

  const doCall = async (): Promise<T> => {
    try {
      let triedRefresh = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await request(path, options);

        if (res.status === 401) {
          if (triedRefresh) throw new Error(`[401] Unauthorized`);
          triedRefresh = true;

          const refresh = await renewAccessToken();
          if (!refresh.ok) throw new Error(refresh.message ?? "Unauthorized");
          continue;
        }

        if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}`);

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return {} as T;

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
          alert(payload.error.message);
        }

        if (dedupeEnabled && reqKey) {
          recent.set(reqKey, { ts: Date.now(), data: payload.data as unknown });
        }

        return payload.data;
      }
      throw new Error("Request failed after token refresh retry.");
    } finally {
      if (dedupeEnabled && reqKey) inFlight.delete(reqKey);
    }
  };

  if (dedupeEnabled && coalesce && reqKey) {
    const existing = inFlight.get(reqKey);
    if (existing) return existing as Promise<T>;
    const p = doCall();
    inFlight.set(reqKey, p);
    return p;
  }

  return doCall();
}

async function request(
  path: string,
  options: Omit<FetchApiOptions, "dedupe" | "coalesce" | "reuseLast" | "windowMs"> = {}
): Promise<Response> {
  const headers = new Headers(options.headers ?? {});
  const bodyToSend = serializeBodyForRequest(options.body, headers);

  const accessToken = getCookie(COOKIE_AT_KEY);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(path, {
    ...options,
    headers,
    body: bodyToSend,
    credentials: options.credentials ?? "include",
    cache: options.cache ?? "no-store",
  });
}

async function renewAccessToken(): Promise<{
  ok: boolean;
  code?: string | null;
  message?: string;
}> {
  const res = await fetch("/be/user/renew/accesstoken", {
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
