import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Category API - Quản lý danh mục
 */

// Lấy tất cả danh mục
export const getAllCategories = async (params = {}) => {
  const response = await axiosInstance.get("/categories", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data || [],
    pagination: normalized.pagination,
  };
};

// Lấy chi tiết danh mục
export const getCategoryById = async (id) => {
  const response = await axiosInstance.get(`/categories/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// Tạo danh mục mới (Admin)
export const createCategory = async (categoryData) => {
  const response = await axiosInstance.post("/categories", categoryData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create category');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Cập nhật danh mục (Admin)
export const updateCategory = async (id, categoryData) => {
  const response = await axiosInstance.put(`/categories/${id}`, categoryData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update category');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Xóa danh mục (Admin)
export const deleteCategory = async (id) => {
  const response = await axiosInstance.delete(`/categories/${id}`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to delete category');
    error.response = { data: normalized };
    throw error;
  }
  return {
    message: normalized.message,
  };
};
