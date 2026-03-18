import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";
import type { CategoryListResponse } from "../../types/category";

export async function getCategories() {
  const response = await axiosClient.get<CategoryListResponse>("/categories", {
    params: { page: 1, limit: 100, isActive: "true" },
  });

  return extractPayload<CategoryListResponse["data"]>(response.data);
}

export async function getCategoryById(categoryId: string) {
  const response = await axiosClient.get(`/categories/${categoryId}`);
  return extractPayload<{ category?: Record<string, unknown> }>(response.data);
}

export async function createCategory(payload: {
  name: string;
  description?: string;
  isActive?: boolean;
  image?: string;
}) {
  const response = await axiosClient.post("/categories", payload);
  return extractPayload<{ category?: Record<string, unknown> }>(response.data);
}

export async function updateCategory(categoryId: string, payload: Partial<{
  name: string;
  description: string;
  isActive: boolean;
  image: string;
}>) {
  const response = await axiosClient.put(`/categories/${categoryId}`, payload);
  return extractPayload<{ category?: Record<string, unknown> }>(response.data);
}

export async function deleteCategory(categoryId: string) {
  const response = await axiosClient.delete(`/categories/${categoryId}`);
  return extractPayload<null>(response.data);
}
