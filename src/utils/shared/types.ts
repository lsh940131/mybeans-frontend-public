/** 확장 옵션: 단기 디듀프/합류 제어 */
export type FetchApiOptions = Omit<RequestInit, "body"> & {
  // 객체/원시/폼 어떤 것이든 허용 (내부에서 직렬화/그대로 전달 판단)
  body?: unknown;
  // 동일 요청 단기 디듀프 활성화(기본: true)
  dedupe?: boolean;
  // 인플라이트 합류 활성화(기본: true)
  coalesce?: boolean;
  // 직전 성공 응답 재사용 허용(기본: "success")
  reuseLast?: "success" | "never";
  // 쿨다운 윈도우(ms, 기본: 300)
  windowMs?: number;
};
