import axiosInstance from "./axiosInstance";

/**
 * Room API - Manage rooms
 */

// Get rooms list with filters
export const getRoomsList = async (params = {}) => {
  const response = await axiosInstance.get("/rooms", { params });
  return response.data;
};

// Get room details
export const getRoomById = async (id) => {
  const response = await axiosInstance.get(`/rooms/${id}`);
  return response.data;
};

// Create new room
export const createRoom = async (data) => {
  const response = await axiosInstance.post("/rooms", data);
  return response.data;
};

// Update room
export const updateRoom = async (id, data) => {
  const response = await axiosInstance.put(`/rooms/${id}`, data);
  return response.data;
};

// Delete room
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
