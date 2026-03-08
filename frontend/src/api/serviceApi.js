import axiosInstance from "./axiosInstance";

/**
 * Service API - Quản lý dịch vụ
 */

// Lấy tất cả dịch vụ
export const getAllServices = async (params = {}) => {
  const response = await axiosInstance.get("/services", { params });
  return response.data;
};

// Lấy chi tiết dịch vụ
export const getServiceById = async (id) => {
  const response = await axiosInstance.get(`/services/${id}`);
  return response.data;
};

// Tạo dịch vụ mới (Admin)
export const createService = async (serviceData) => {
  const response = await axiosInstance.post("/services", serviceData);
  return response.data;
};

// Cập nhật dịch vụ (Admin)
export const updateService = async (id, serviceData) => {
  const response = await axiosInstance.put(`/services/${id}`, serviceData);
  return response.data;
};

// Xóa dịch vụ (Admin)
export const deleteService = async (id) => {
  const response = await axiosInstance.delete(`/services/${id}`);
  return response.data;
};

export default {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
