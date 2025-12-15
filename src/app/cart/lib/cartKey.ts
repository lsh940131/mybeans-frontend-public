export type KeySource = { cartId?: number; productId: number; optionValueIdList: number[] };

function normalizeOptValueIdList(arr?: number[]): number[] {
  if (!arr || arr.length === 0) return [];

  const nums = arr.map(Number).filter(v => Number.isFinite(v));
  nums.sort((a, b) => a - b);

  return nums;
}

/**
 * 상품 key 생성
 * 게스트일 경우 옵션 배열을 정렬
 */
export function makeItemKey(data: KeySource): string {
  const { cartId, productId, optionValueIdList } = data;

  // cartId가 있을 경우 멤버키
  if (cartId) {
    return `m:${cartId}`;
  }
  // 없을 경우 게스트키
  else {
    const normalized = normalizeOptValueIdList(optionValueIdList);
    const optValueIds = normalized.length ? normalized.join(",") : "-";
    return `g:${productId}:${optValueIds}`;
  }
}

export type parsedMember = { kind: "member"; cartId: number };
export type parsedGuest = { kind: "guest"; productId: number; optionValueIdList: number[] };

/**
 * 상품 key에서 source 추출해서 정리
 */
export function parseItemKey(key: string): parsedGuest | parsedMember {
  const source = key.split(":");
  const tag = source[0];

  if (tag === "m") {
    const cartId = Number(source[1]);

    return { kind: "member", cartId };
  }

  if (tag === "g") {
    const productId = Number(source[1]);
    const opt = source[2] ?? "-";
    const optionValueIdList =
      opt === "-" || opt.trim() === "" ? [] : opt.split(",").map(v => Number(v));

    return {
      kind: "guest",
      productId,
      optionValueIdList,
    };
  }

  throw new Error(`Unknown key prefix: ${key}`);
}
