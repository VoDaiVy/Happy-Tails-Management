import axiosInstance from "./axiosInstance";

/**
 * User Management API - Manage users
 */

// ==================== USER MANAGEMENT ====================

// Get users list with filter, search, pagination
export const getUsersList = async (params = {}) => {
  const response = await axiosInstance.get("/admin/users/list", { params });
  return response.data;
};

// Get user details
export const getUserDetail = async (id) => {
  const response = await axiosInstance.get(`/admin/users/${id}/detail`);
  return response.data;
};

// Block user
export const blockUser = async (id, reason = "") => {
  const body = reason && reason.trim() ? { reason: reason.trim() } : {};
  const response = await axiosInstance.put(`/admin/users/${id}/block`, body);
  return response.data;
};

// Unblock user
export const unblockUser = async (id) => {
  const response = await axiosInstance.put(`/admin/users/${id}/unblock`);
  return response.data;
};

// Update user role
export const updateUserRole = async (id, role) => {
  const response = await axiosInstance.put(`/admin/users/${id}/role`, { role });
  return response.data;
};

// Permanently delete user (hard delete)
export const permanentDeleteUser = async (id) => {
  const response = await axiosInstance.delete(`/admin/users/${id}/permanent`);
  return response.data;
};

// ==================== STATISTICS ====================

// Get dashboard overview
export const getOverview = async () => {
  const response = await axiosInstance.get("/admin/stats/overview");
  return response.data;
};

// Get revenue statistics
export const getRevenueStats = async (params = {}) => {
  const response = await axiosInstance.get("/admin/stats/revenue", { params });
  return response.data;
};

// Get top services
export const getTopServices = async (params = {}) => {
  const response = await axiosInstance.get("/admin/stats/top-services", { params });
  return response.data;
};

// ==================== STAFF MANAGEMENT ====================

// Get staff list
export const getStaffList = async () => {
  const response = await axiosInstance.get("/admin/staff");
  return response.data;
};

export default {
  getUsersList,
  getUserDetail,
  blockUser,
  unblockUser,
  updateUserRole,
  permanentDeleteUser,
  getOverview,
  getRevenueStats,
  getTopServices,
  getStaffList,
};
