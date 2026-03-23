export interface ServiceItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  group?: "wet" | "dry";
  maxCapacity?: number;
  images?: string[];
  petTypes?: string[];
  rating?: number;
  totalReviews?: number;
  isActive?: boolean;
  category?: {
    _id?: string;
    name?: string;
    slug?: string;
  };
}

export interface ServiceListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: "true" | "false" | "all";
}
