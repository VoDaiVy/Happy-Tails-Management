import axiosInstance from "./axiosInstance";

/**
 * Room API - Quản lý phòng
 */

// Lấy danh sách phòng với filter
export const getRoomsList = async (params = {}) => {
  const response = await axiosInstance.get("/rooms", { params });
  return response.data;
};

// Lấy chi tiết phòng
export const getRoomById = async (id) => {
  const response = await axiosInstance.get(`/rooms/${id}`);
  return response.data;
};

// Tạo phòng mới
export const createRoom = async (data) => {
  const response = await axiosInstance.post("/rooms", data);
  return response.data;
};

// Cập nhật phòng
export const updateRoom = async (id, data) => {
  const response = await axiosInstance.put(`/rooms/${id}`, data);
  return response.data;
};

// Xóa phòng
export const deleteRoom = async (id) => {
  const response = await axiosInstance.delete(`/rooms/${id}`);
  return response.data;
};

export default {
  getRoomsList,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
