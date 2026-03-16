export interface Category {
  _id: string;
  name: string;
  slug?: string;
}

export interface CategoryListResponse {
  success: boolean;
  message: string;
  data: Category[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
