import axiosInstance from "./axiosInstance";

/**
 * Category API - Quản lý danh mục
 */

// Lấy tất cả danh mục
export const getAllCategories = async (params = {}) => {
  const response = await axiosInstance.get("/categories", { params });
  return response.data;
};

// Lấy chi tiết danh mục
export const getCategoryById = async (id) => {
  const response = await axiosInstance.get(`/categories/${id}`);
  return response.data;
};

// Tạo danh mục mới (Admin)
export const createCategory = async (categoryData) => {
  const response = await axiosInstance.post("/categories", categoryData);
  return response.data;
};

// Cập nhật danh mục (Admin)
export const updateCategory = async (id, categoryData) => {
  const response = await axiosInstance.put(`/categories/${id}`, categoryData);
  return response.data;
};

// Xóa danh mục (Admin)
export const deleteCategory = async (id) => {
  const response = await axiosInstance.delete(`/categories/${id}`);
  return response.data;
};
