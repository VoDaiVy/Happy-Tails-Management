import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Voucher API
 * Admin - voucher management and AI suggestion
 */

// Get all vouchers (Admin)
export const getAllVouchers = async (params = {}) => {
  const response = await axiosInstance.get("/vouchers", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.vouchers || normalized.data || [],
    pagination: normalized.data?.pagination || normalized.pagination,
    results: normalized.results,
  };
};

// Get voucher by ID (Admin)
export const getVoucherById = async (id) => {
  const response = await axiosInstance.get(`/vouchers/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.voucher || normalized.data,
  };
};

// Create voucher (Admin)
export const createVoucher = async (data) => {
  const response = await axiosInstance.post("/vouchers", data);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create voucher');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.voucher || normalized.data,
    message: normalized.message,
  };
};

// Update voucher (Admin)
export const updateVoucher = async (id, data) => {
  const response = await axiosInstance.put(`/vouchers/${id}`, data);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update voucher');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.voucher || normalized.data,
    message: normalized.message,
  };
};

// Toggle voucher status (Admin)
export const toggleVoucherStatus = async (id) => {
  const response = await axiosInstance.put(`/vouchers/${id}/toggle`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to toggle voucher status');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.voucher || normalized.data,
    message: normalized.message,
  };
};

// Delete voucher (Admin)
export const deleteVoucher = async (id) => {
  const response = await axiosInstance.delete(`/vouchers/${id}`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to delete voucher');
    error.response = { data: normalized };
    throw error;
  }
  return {
    message: normalized.message,
  };
};

// AI Suggest Voucher (Admin)
export const aiSuggestVoucher = async () => {
  const response = await axiosInstance.post("/ai/suggest-voucher");
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
    message: normalized.message,
  };
};
