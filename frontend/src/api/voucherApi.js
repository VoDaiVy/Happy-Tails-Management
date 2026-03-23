import axiosInstance from "./axiosInstance";

/**
 * Voucher API
 * Admin - voucher management and AI suggestion
 */

// Get all vouchers (Admin)
export const getAllVouchers = async (params = {}) => {
  const response = await axiosInstance.get("/vouchers", { params });
  return response;
};

// Get voucher by ID (Admin)
export const getVoucherById = async (id) => {
  const response = await axiosInstance.get(`/vouchers/${id}`);
  return response;
};

// Create voucher (Admin)
export const createVoucher = async (data) => {
  const response = await axiosInstance.post("/vouchers", data);
  return response;
};

// Update voucher (Admin)
export const updateVoucher = async (id, data) => {
  const response = await axiosInstance.put(`/vouchers/${id}`, data);
  return response;
};

// Toggle voucher status (Admin)
export const toggleVoucherStatus = async (id) => {
  const response = await axiosInstance.put(`/vouchers/${id}/toggle`);
  return response;
};

// Delete voucher (Admin)
export const deleteVoucher = async (id) => {
  const response = await axiosInstance.delete(`/vouchers/${id}`);
  return response;
};

// Get available vouchers (Customer)
export const getAvailableVouchersForCustomer = async (params = {}) => {
  const response = await axiosInstance.get('/vouchers/available', { params });
  return response;
};

// AI Suggest Voucher (Admin)
export const aiSuggestVoucher = async () => {
  const response = await axiosInstance.post("/ai/suggest-voucher");
  return response;
};
