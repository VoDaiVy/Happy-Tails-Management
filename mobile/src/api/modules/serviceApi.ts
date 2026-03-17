import { axiosClient } from "../axiosClient";
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
  return response.data;
}

export async function getServiceById(serviceId: string) {
  const response = await axiosClient.get<GetServiceDetailResponse>(`/services/${serviceId}`);
  return response.data.data;
}
