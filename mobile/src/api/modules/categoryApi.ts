import { axiosClient } from "../axiosClient";
import type { CategoryListResponse } from "../../types/category";

export async function getCategories() {
  const response = await axiosClient.get<CategoryListResponse>("/categories", {
    params: { page: 1, limit: 100, isActive: "true" },
  });

  return response.data.data;
}
