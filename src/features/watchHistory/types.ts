type PwhProductPayload = {
  id: number;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
};

export type PwhListItemPayload = {
  id: number; // historyId
  createdAt: Date;
  product: PwhProductPayload;
};

export type ProductListPayload = {
  count: number;
  list: PwhListItemPayload[];
};
