export type RawSP = Record<string, string | string[] | undefined>;

/** searchParams(객체 형태)에서 지정한 key들만 뽑아 URLSearchParams로 변환 */
export function pickParams(sp: RawSP, keys: readonly string[]): URLSearchParams {
  const qs = new URLSearchParams();
  for (const k of keys) {
    const v = sp[k];
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach(x => qs.append(k, String(x)));
    else qs.set(k, String(v));
  }
  return qs;
}

/** 모든 쿼리를 그대로 URLSearchParams로 변환(필요 시) */
export function spToQS(sp: RawSP): URLSearchParams {
  const qs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v === undefined) return;
    if (Array.isArray(v)) v.forEach(x => qs.append(k, String(x)));
    else qs.set(k, String(v));
  });
  return qs;
}

/** searchParams의 특정 key 값을 넘겨 Set<number>로 변환 */
export function parseIdList(raw: string | null): Set<number> {
  if (!raw) return new Set<number>();

  return new Set(
    raw
      .split(",")
      .map(v => Number(v.trim()))
      .filter(Number.isFinite)
  );
}
