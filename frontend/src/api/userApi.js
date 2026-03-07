import axiosInstance from "./axiosInstance";

/**
 * User Management API - Quản lý người dùng
 */

// ==================== USER MANAGEMENT ====================

// Lấy danh sách users với filter, search, pagination
export const getUsersList = async (params = {}) => {
  const response = await axiosInstance.get("/admin/users/list", { params });
  return response.data;
};

// Lấy chi tiết user
export const getUserDetail = async (id) => {
  const response = await axiosInstance.get(`/admin/users/${id}/detail`);
  return response.data;
};

// Block user
export const blockUser = async (id, reason = "") => {
  const response = await axiosInstance.put(`/admin/users/${id}/block`, { reason });
  return response.data;
};

// Unblock user
export const unblockUser = async (id) => {
  const response = await axiosInstance.put(`/admin/users/${id}/unblock`);
  return response.data;
};

// Cập nhật role user
export const updateUserRole = async (id, role) => {
  const response = await axiosInstance.put(`/admin/users/${id}/role`, { role });
  return response.data;
};

// ==================== STATISTICS ====================

// Lấy overview dashboard
export const getOverview = async () => {
  const response = await axiosInstance.get("/admin/stats/overview");
  return response.data;
};

// Lấy thống kê doanh thu
export const getRevenueStats = async (params = {}) => {
  const response = await axiosInstance.get("/admin/stats/revenue", { params });
  return response.data;
};

// Lấy top services
export const getTopServices = async (params = {}) => {
  const response = await axiosInstance.get("/admin/stats/top-services", { params });
  return response.data;
};

// ==================== STAFF MANAGEMENT ====================

// Lấy danh sách staff
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
  getOverview,
  getRevenueStats,
  getTopServices,
  getStaffList,
};
