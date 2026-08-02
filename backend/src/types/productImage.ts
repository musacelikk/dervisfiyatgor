export type ProductImage = {
  id: number;
  stockCode: string;
  objectKey: string;
  url: string;
  sortOrder: number;
  createdAt: string;
};

export type ProductImageInput = {
  stockCode: string;
  objectKey: string;
  url: string;
};
