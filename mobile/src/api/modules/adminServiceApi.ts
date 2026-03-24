import { createService, getServices, uploadServiceImage } from "./serviceApi";

interface ServiceListResponse {
  success: boolean;
  message?: string;
  data: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function getAdminServices(params?: {
  search?: string;
  category?: string;
  isActive?: "true" | "false" | "all";
  page?: number;
  limit?: number;
}): Promise<ServiceListResponse> {
  const response = await getServices({
    search: params?.search,
    category: params?.category,
    isActive: params?.isActive,
    page: params?.page,
    limit: params?.limit,
  });

  return {
    success: true,
    data: response.data,
    pagination: response.pagination,
  };
}

export async function createAdminService(payload: {
  name: string;
  description?: string;
  price: number;
  duration: number;
  category: string;
  features?: string[];
  petTypes?: string[];
  group?: "wet" | "dry";
  isActive?: boolean;
  images?: string[];
}) {
  const response = await createService(payload);
  return {
    success: true,
    data: response,
  };
}

export async function uploadAdminServiceImage(payload: {
  uri: string;
  type?: string;
  fileName?: string;
}) {
  const url = await uploadServiceImage(payload);
  return {
    success: true,
    data: { url },
  };
}
