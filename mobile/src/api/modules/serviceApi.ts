import { axiosClient } from "../axiosClient";
import { extractPayload, extractPagination } from "../responseParser";
import type { ServiceItem, ServiceListQuery } from "../../types/service";

interface ListServicesResponse {
  success: boolean;
  message: string;
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

interface GetServiceDetailResponse {
  success: boolean;
  message: string;
  data: ServiceItem;
}

export async function getServices(query: ServiceListQuery = {}) {
  const response = await axiosClient.get<ListServicesResponse>("/services", { params: query });
  return {
    data: extractPayload<ServiceItem[]>(response.data),
    pagination: extractPagination<ListServicesResponse["pagination"]>(response.data) || undefined,
  };
}

export async function getServiceById(serviceId: string) {
  const response = await axiosClient.get<GetServiceDetailResponse>(`/services/${serviceId}`);
  return extractPayload<ServiceItem>(response.data);
}

export async function createService(payload: {
  name: string;
  price: number;
  duration: number;
  description?: string;
  category?: string;
  petTypes?: string[];
  isActive?: boolean;
  image?: string;
}) {
  const response = await axiosClient.post("/services", payload);
  return extractPayload<{ service?: ServiceItem }>(response.data);
}

export async function updateService(serviceId: string, payload: Partial<{
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string;
  petTypes: string[];
  isActive: boolean;
  image: string;
}>) {
  const response = await axiosClient.put(`/services/${serviceId}`, payload);
  return extractPayload<{ service?: ServiceItem }>(response.data);
}

export async function deleteService(serviceId: string) {
  const response = await axiosClient.delete(`/services/${serviceId}`);
  return extractPayload<null>(response.data);
}
