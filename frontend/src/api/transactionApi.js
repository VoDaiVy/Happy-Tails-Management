import axiosInstance from "./axiosInstance";

/**
 * Transaction API
 * Admin - track system transactions
 */

// Get all transactions (Admin)
export const getAllTransactions = async (params = {}) => {
  const response = await axiosInstance.get("/transactions", { params });
  return response;
};

// Get transaction by ID
export const getTransactionById = async (id) => {
  const response = await axiosInstance.get(`/transactions/${id}`);
  return response;
};

// Process transaction (Admin) - approve/reject
export const processTransaction = async (id, data) => {
  const response = await axiosInstance.put(`/transactions/${id}/process`, data);
  return response;
};

// Get revenue statistics (Admin)
export const getRevenueStatistics = async (params = {}) => {
  const response = await axiosInstance.get("/transactions/statistics/revenue", { params });
  return response;
};
