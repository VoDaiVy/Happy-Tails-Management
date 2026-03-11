import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Service API - Quản lý dịch vụ
 */

// Lấy tất cả dịch vụ
export const getAllServices = async (params = {}) => {
  const response = await axiosInstance.get("/services", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data || [],
    pagination: normalized.pagination,
  };
};

// Lấy chi tiết dịch vụ
export const getServiceById = async (id) => {
  const response = await axiosInstance.get(`/services/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// Tạo dịch vụ mới (Admin)
export const createService = async (serviceData) => {
  const response = await axiosInstance.post("/services", serviceData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create service');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Cập nhật dịch vụ (Admin)
export const updateService = async (id, serviceData) => {
  const response = await axiosInstance.put(`/services/${id}`, serviceData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update service');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Xóa dịch vụ (Admin)
export const deleteService = async (id) => {
  const response = await axiosInstance.delete(`/services/${id}`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to delete service');
    error.response = { data: normalized };
    throw error;
  }
  return {
    message: normalized.message,
  };
};

export default {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
