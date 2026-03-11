import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * News API - Quản lý tin tức
 */

// Lấy tất cả tin tức
export const getAllNews = async (params = {}) => {
  const response = await axiosInstance.get("/news", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data || [],
    pagination: normalized.pagination,
  };
};

// Lấy tin tức theo slug
export const getNewsBySlug = async (slug) => {
  const response = await axiosInstance.get(`/news/${slug}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// Tạo tin tức mới (Staff/Admin)
export const createNews = async (newsData) => {
  const response = await axiosInstance.post("/news", newsData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create news');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Cập nhật tin tức (Staff/Admin)
export const updateNews = async (id, newsData) => {
  const response = await axiosInstance.put(`/news/${id}`, newsData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update news');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Xóa tin tức (Admin)
export const deleteNews = async (id) => {
  const response = await axiosInstance.delete(`/news/${id}`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to delete news');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
  };
};

export default {
  getAllNews,
  getNewsBySlug,
  createNews,
  updateNews,
  deleteNews,
};
