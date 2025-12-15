export type ProductGetSearchKeywordPayload = {
  id: number;
  keyword: string;
  createdAt: Date;
};

export type ProductSearchHistoryItem = {
  id?: number;
  keyword: string;
  createdAt: Date;
};

type ProductSearchHistoryMergeItem = {
  keyword: string;
  createdAt: Date;
};

export type ProductSearchHistoryMergeBody = {
  items: ProductSearchHistoryMergeItem[];
};
