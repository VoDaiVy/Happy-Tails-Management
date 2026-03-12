import axiosInstance from "./axiosInstance";

/**
 * Booking API - Manage booking orders
 */

// Get all bookings (Staff/Admin)
export const getAllBookings = async (params = {}) => {
  const response = await axiosInstance.get("/bookings", { params });
  return response.data;
};

// Get my bookings (Customer)
export const getMyBookings = async (params = {}) => {
  const response = await axiosInstance.get("/bookings/my", { params });
  return response.data;
};

export const getMyPetsMedicalRecords = async () => {
  const response = await axiosInstance.get("/medical-records/my-pets");
  return response.data;
};

export const getMedicalRecordById = async (id) => {
  const response = await axiosInstance.get(`/medical-records/${encodeURIComponent(id)}`);
  return response.data;
};
// Get booking details
export const getBookingById = async (id) => {
  const response = await axiosInstance.get(`/bookings/${id}`);
  return response.data;
};

// Create booking from cart (Customer)
export const createBooking = async (bookingData) => {
  const response = await axiosInstance.post("/bookings", bookingData);
  return response.data;
};

// Checkout with availability check (Customer)
export const checkoutBooking = async (checkoutData) => {
  const response = await axiosInstance.post("/bookings/checkout", checkoutData);
  return response.data;
};

// Create booking for walk-in customer (Staff/Admin)
export const createGuestBooking = async (guestBookingData) => {
  const response = await axiosInstance.post("/bookings/guest", guestBookingData);
  return response.data;
};

// Update booking status (Staff/Admin)
export const updateBookingStatus = async (id, status) => {
  const response = await axiosInstance.put(`/bookings/${id}/status`, { status });
  return response.data;
};

// Cancel booking
export const cancelBooking = async (id, reason) => {
  const response = await axiosInstance.put(`/bookings/${id}/cancel`, { reason });
  return response.data;
};

// Assign staff to booking (Staff/Admin)
export const assignStaffToBooking = async (id, staffId) => {
  const response = await axiosInstance.put(`/bookings/${id}/assign-staff`, { staffId });
  return response.data;
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
