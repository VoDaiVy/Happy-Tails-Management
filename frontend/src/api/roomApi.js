import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Room API - Manage rooms
 */

// Get rooms list with filters
export const getRoomsList = async (params = {}) => {
  const response = await axiosInstance.get("/rooms", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.rooms || normalized.data || [],
    pagination: normalized.data?.pagination || normalized.pagination,
  };
};

// Get room details
export const getRoomById = async (id) => {
  const response = await axiosInstance.get(`/rooms/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.room || normalized.data,
  };
};

// Create new room
export const createRoom = async (data) => {
  const response = await axiosInstance.post("/rooms", data);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create room');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.room || normalized.data,
    message: normalized.message,
  };
};

// Update room
export const updateRoom = async (id, data) => {
  const response = await axiosInstance.put(`/rooms/${id}`, data);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update room');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.room || normalized.data,
    message: normalized.message,
  };
};

// Delete room
export const deleteRoom = async (id) => {
  const response = await axiosInstance.delete(`/rooms/${id}`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to delete room');
    error.response = { data: normalized };
    throw error;
  }
  return {
    message: normalized.message,
  };
};

export default {
  getRoomsList,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
