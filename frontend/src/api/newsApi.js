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
    data: normalized.data?.news || normalized.data || [],
    pagination: normalized.pagination,
  };
};

// Lấy tin tức theo slug
export const getNewsBySlug = async (slug) => {
  const response = await axiosInstance.get(`/news/${slug}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.news || normalized.data,
  };
};

// Tạo tin tức mới (Staff/Admin)
export const createNews = async (newsData) => {
  try {
    console.log("Creating news with data:", newsData);
    const response = await axiosInstance.post("/news", newsData);
    console.log("Create response:", response.data);
    
    const normalized = normalizeResponse(response);
    if (!normalized.success) {
      const error = new Error(normalized.message || 'Failed to create news');
      error.response = { data: normalized };
      throw error;
    }
    return {
      data: normalized.data?.news || normalized.data,
      message: normalized.message,
    };
  } catch (err) {
    console.error("Create news error:", {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
    });
    throw err;
  }
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
    data: normalized.data?.news || normalized.data,
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
