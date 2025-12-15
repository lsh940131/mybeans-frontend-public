export type ProductOptionValue = {
  id: number;
  valueKr: string;
  valueEn: string;
  extraCharge: number;
};

export type ProductOption = {
  id: number;
  isRequired: boolean;
  nameKr: string;
  nameEn: string;
  valueList: ProductOptionValue[];
};

export type ProductCategory = {
  id: number;
  parentId: number | null;
  nameKr: string;
  nameEn: string;
};

export type ProductSeller = {
  id: number;
  name: string;
};

export type ProductImage = {
  id: number;
  url: string;
};

export type ProductDetail = {
  id: number;
  status: string;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
  price: number;
  category: ProductCategory;
  seller: ProductSeller;
  imageList: ProductImage[];
  optionList: ProductOption[];
};
