import { axiosClient } from "../axiosClient";
import type { ServiceItem } from "../../types/service";

interface ServiceListResponse {
  success: boolean;
  message?: string;
  data: ServiceItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface ServiceResponse {
  success: boolean;
  message?: string;
  data: ServiceItem;
}

export interface ServiceUpsertPayload {
  name: string;
  category: string;
  price: number;
  duration: number;
  description?: string;
  petTypes?: string[];
  group?: "wet" | "dry";
  maxCapacity?: number;
  isActive?: boolean;
}

export async function getAdminServices(params?: { search?: string; isActive?: "true" | "false" | "all"; page?: number; limit?: number }) {
  const response = await axiosClient.get<ServiceListResponse>("/services", { params });
  return response.data;
}

export async function createAdminService(payload: ServiceUpsertPayload) {
  const response = await axiosClient.post<ServiceResponse>("/services", payload);
  return response.data;
}

export async function updateAdminService(serviceId: string, payload: Partial<ServiceUpsertPayload>) {
  const response = await axiosClient.put<ServiceResponse>(`/services/${serviceId}`, payload);
  return response.data;
}

export async function deleteAdminService(serviceId: string) {
  const response = await axiosClient.delete<{ success: boolean; message?: string }>(`/services/${serviceId}`);
  return response.data;
}
