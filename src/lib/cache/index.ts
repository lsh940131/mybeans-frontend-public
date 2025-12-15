import { LruCache } from "./lruCache";

// 이미지 원본 크기 캐시
export type ImageSize = { w: number; h: number };
export const imageSizeCache = new LruCache<string, ImageSize>(200, 30 * 60 * 1000);
