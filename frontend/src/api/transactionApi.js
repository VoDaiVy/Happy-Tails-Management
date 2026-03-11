import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Transaction API
 * Admin - track system transactions
 */

// Get all transactions (Admin)
export const getAllTransactions = async (params = {}) => {
  const response = await axiosInstance.get("/transactions", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.transactions || normalized.data || [],
    pagination: normalized.data?.pagination || normalized.pagination,
  };
};

// Get transaction by ID
export const getTransactionById = async (id) => {
  const response = await axiosInstance.get(`/transactions/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.transaction || normalized.data,
  };
};

// Process transaction (Admin) - approve/reject
export const processTransaction = async (id, data) => {
  const response = await axiosInstance.put(`/transactions/${id}/process`, data);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to process transaction');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.transaction || normalized.data,
    message: normalized.message,
  };
};

// Get revenue statistics (Admin)
export const getRevenueStatistics = async (params = {}) => {
  const response = await axiosInstance.get("/transactions/statistics/revenue", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};
