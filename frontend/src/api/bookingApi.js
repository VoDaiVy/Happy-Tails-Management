import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Booking API - Manage booking orders
 */

// Get all bookings (Staff/Admin)
export const getAllBookings = async (params = {}) => {
  const response = await axiosInstance.get("/bookings", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.bookings || normalized.data || [],
    pagination: normalized.data?.pagination || normalized.pagination,
  };
};

// Get my bookings (Customer)
export const getMyBookings = async (params = {}) => {
  const response = await axiosInstance.get("/bookings/my", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.bookings || normalized.data || [],
    pagination: normalized.data?.pagination || normalized.pagination,
  };
};

// Get booking details
export const getBookingById = async (id) => {
  const response = await axiosInstance.get(`/bookings/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.booking || normalized.data,
  };
};

// Create booking from cart (Customer)
export const createBooking = async (bookingData) => {
  const response = await axiosInstance.post("/bookings", bookingData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create booking');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.booking || normalized.data,
    message: normalized.message,
  };
};

// Checkout with availability check (Customer)
export const checkoutBooking = async (checkoutData) => {
  const response = await axiosInstance.post("/bookings/checkout", checkoutData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to checkout');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Create booking for walk-in customer (Staff/Admin)
export const createGuestBooking = async (guestBookingData) => {
  const response = await axiosInstance.post("/bookings/guest", guestBookingData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create guest booking');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.booking || normalized.data,
    message: normalized.message,
  };
};

// Update booking status (Staff/Admin)
export const updateBookingStatus = async (id, status) => {
  const response = await axiosInstance.put(`/bookings/${id}/status`, { status });
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update booking status');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.booking || normalized.data,
    message: normalized.message,
  };
};

// Cancel booking
export const cancelBooking = async (id, reason) => {
  const response = await axiosInstance.put(`/bookings/${id}/cancel`, { reason });
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to cancel booking');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.booking || normalized.data,
    message: normalized.message,
  };
};

// Assign staff to booking (Staff/Admin)
export const assignStaffToBooking = async (id, staffId) => {
  const response = await axiosInstance.put(`/bookings/${id}/assign-staff`, { staffId });
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to assign staff');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.booking || normalized.data,
    message: normalized.message,
  };
};

export default {
  getAllBookings,
  getMyBookings,
  getBookingById,
  createBooking,
  checkoutBooking,
  createGuestBooking,
  updateBookingStatus,
  cancelBooking,
  assignStaffToBooking,
};
