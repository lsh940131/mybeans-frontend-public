import { DEDUPE_EXCLUDE_PREFIX } from "./constants";
import { FetchApiOptions } from "./types";

export function toBool(v: string | string[] | number | undefined | null): boolean {
  if (v == null) return false;

  if (typeof v === "number") {
    if (v === 1) return true;
    else return false;
  }

  if (typeof v === "string") {
    switch (v) {
      case "1":
      case "true":
      case "True":
      case "TRUE":
        return true;
    }
  }

  return false;
}

export function toNumArray(v: string | string[] | undefined): number[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return [
    ...new Set(
      arr
        .flatMap(x => String(x).split(",")) // 콤마 구분 지원
        .map(n => Number(n))
        .filter(Number.isFinite)
    ),
  ];
}

export function formatKRW(v: number) {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${v.toLocaleString()}원`;
  }
}

export function formatDate(input: number | string | Date) {
  const d = input instanceof Date ? input : new Date(input);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/**
 * string 또는 Date 객체인 시간을 epoch(ms)로 변환
 * @param createdAt createdAt: string | Date  (실제로는 string으로 온다고 가정)
 * @returns epoch(ms): number
 */
export function toEpochMs(createdAt: string | Date): number {
  // 문자열이면 Date.parse, Date면 getTime
  return typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
}

/**
 * 객체 키를 정렬하여 JSON 문자열화
 */
export function stableStringify(obj: unknown): string {
  // 1. null 은 JSON 에서 "null"
  if (obj === null) return "null";

  // 2. top-level undefined 는 여기까지 안 오게 쓰고 있어서,
  //    혹시 오더라도 "null" 로 처리하는게 안전
  if (obj === undefined) return "null";

  const t = typeof obj;
  if (t === "string" || t === "number" || t === "boolean") return JSON.stringify(obj);
  if (t !== "object") return JSON.stringify(obj);

  // 3. 배열 처리
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;

  // 4. 객체 처리: undefined 값은 키 자체를 생략
  const rec = obj as Record<string, unknown>;
  const entries = Object.entries(rec).filter(([, v]) => v !== undefined);

  const kv = entries
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `"${k}":${stableStringify(v)}`);

  return `{${kv.join(",")}}`;
}

/** 폼/바이너리 계열인지 (JSON 직렬화 금지 대상) */
function isFormLike(body: unknown): boolean {
  return (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body)) // TypedArray, DataView
  );
}

/** "JSON으로 직렬화해야 하는 평범한 객체/배열"인지 */
function isPlainJsonBody(body: unknown): boolean {
  return !!body && typeof body === "object" && !isFormLike(body);
}

/** 요청 키 생성용: body를 문자열 키로 변환 (안정 직렬화) */
function bodyKeyFromBody(body: unknown): string {
  if (isPlainJsonBody(body)) {
    return stableStringify(body);
  }
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  return "";
}

/** 실제 fetch 전송용 직렬화 + 헤더 보정(Content-Type) */
export function serializeBodyForRequest(
  rawBody: unknown,
  headers: Headers
): BodyInit | null | undefined {
  if (rawBody === undefined || rawBody === null) return null;

  if (isPlainJsonBody(rawBody)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return stableStringify(rawBody);
  }

  // 문자열/폼/바이너리 등은 그대로 통과
  return rawBody as BodyInit;
}

/**
 * 동일성 판단용 요청키 생성
 */
export function makeRequestKey(path: string, options: FetchApiOptions): string {
  const method = (options.method || "GET").toUpperCase();
  const url = path;
  const bodyStr = bodyKeyFromBody(options.body);
  return `${method} ${url} ${bodyStr}`;
}

/** 경로가 디듀프 제외 대상인지 */
export function isDedupeExcluded(path: string): boolean {
  return DEDUPE_EXCLUDE_PREFIX.some(prefix => path.startsWith(prefix));
}
