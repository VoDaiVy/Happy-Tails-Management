export interface ServiceItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  images?: string[];
  features?: string[];
  petTypes?: string[];
  rating?: number;
  totalReviews?: number;
  isActive?: boolean;
  maxCapacity?: number;
  group?: "wet" | "dry";
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
