import { axiosClient } from "../axiosClient";
import { extractPayload, extractPagination } from "../responseParser";
import type { ServiceItem, ServiceListQuery } from "../../types/service";
import { resolveImageList } from "../../utils/image";

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

function normalizeService(service: ServiceItem): ServiceItem {
  return {
    ...service,
    images: resolveImageList(service.images),
  };
}

export async function getServices(query: ServiceListQuery = {}) {
  const response = await axiosClient.get<ListServicesResponse>("/services", { params: query });
  const services = extractPayload<ServiceItem[]>(response.data).map(normalizeService);
  return {
    data: services,
    pagination: extractPagination<ListServicesResponse["pagination"]>(response.data) || undefined,
  };
}

export async function getServiceById(serviceId: string) {
  const response = await axiosClient.get<GetServiceDetailResponse>(`/services/${serviceId}`);
  return normalizeService(extractPayload<ServiceItem>(response.data));
}

export async function createService(payload: {
  name: string;
  price: number;
  duration: number;
  description?: string;
  category: string;
  petTypes?: string[];
  features?: string[];
  group?: "wet" | "dry";
  maxCapacity?: number;
  isActive?: boolean;
  image?: string;
  images?: string[];
}) {
  const response = await axiosClient.post("/services", payload);
  return extractPayload<{ service?: ServiceItem }>(response.data);
}

export async function uploadServiceImage(payload: {
  uri: string;
  type?: string;
  fileName?: string;
}) {
  const formData = new FormData();
  formData.append("image", {
    uri: payload.uri,
    type: payload.type || "image/jpeg",
    name: payload.fileName || `service-${Date.now()}.jpg`,
  } as unknown as Blob);

  const response = await axiosClient.post<{ data?: { url?: string } }>("/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const payloadData = extractPayload<{ url?: string }>(response.data);
  return payloadData.url || "";
}

export async function updateService(serviceId: string, payload: Partial<{
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string;
  petTypes: string[];
  features: string[];
  group: "wet" | "dry";
  isActive: boolean;
  image: string;
  images: string[];
}>) {
  const response = await axiosClient.put(`/services/${serviceId}`, payload);
  return extractPayload<{ service?: ServiceItem }>(response.data);
}

export async function deleteService(serviceId: string) {
  const response = await axiosClient.delete(`/services/${serviceId}`);
  return extractPayload<null>(response.data);
}
