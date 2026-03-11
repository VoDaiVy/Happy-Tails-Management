import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * User Management API - Manage users
 */

// ==================== USER MANAGEMENT ====================

// Get users list with filter, search, pagination
export const getUsersList = async (params = {}) => {
  const response = await axiosInstance.get("/admin/users/list", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data || [],
    pagination: normalized.pagination,
  };
};

// Get user details
export const getUserDetail = async (id) => {
  const response = await axiosInstance.get(`/admin/users/${id}/detail`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.user || normalized.data,
  };
};

// Block user
export const blockUser = async (id, reason = "") => {
  const response = await axiosInstance.put(`/admin/users/${id}/block`, { reason });
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to block user');
    error.response = { data: normalized };
    throw error;
  }
  return {
    message: normalized.message,
  };
};

// Unblock user
export const unblockUser = async (id) => {
  const response = await axiosInstance.put(`/admin/users/${id}/unblock`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to unblock user');
    error.response = { data: normalized };
    throw error;
  }
  return {
    message: normalized.message,
  };
};

// Update user role
export const updateUserRole = async (id, role) => {
  const response = await axiosInstance.put(`/admin/users/${id}/role`, { role });
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update user role');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.user || normalized.data,
    message: normalized.message,
  };
};

// ==================== STATISTICS ====================

// Get dashboard overview
export const getOverview = async () => {
  const response = await axiosInstance.get("/admin/stats/overview");
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// Get revenue statistics
export const getRevenueStats = async (params = {}) => {
  const response = await axiosInstance.get("/admin/stats/revenue", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// Get top services
export const getTopServices = async (params = {}) => {
  const response = await axiosInstance.get("/admin/stats/top-services", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// ==================== STAFF MANAGEMENT ====================

// Get staff list
export const getStaffList = async () => {
  const response = await axiosInstance.get("/admin/staff");
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

export default {
  getUsersList,
  getUserDetail,
  blockUser,
  unblockUser,
  updateUserRole,
  getOverview,
  getRevenueStats,
  getTopServices,
  getStaffList,
};
