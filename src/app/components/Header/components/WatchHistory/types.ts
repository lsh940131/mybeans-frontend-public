// UI 통일 타입: historyId가 있으면 서버 레코드(회원), 없으면 게스트
export type WatchItemUI = {
  productId: number;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
  viewedAt: number; // epoch ms (서버 createdAt → ms 변환)
  historyId?: number; // 회원(서버) 히스토리의 id (게스트는 없음)
};
