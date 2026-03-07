import axiosInstance from "./axiosInstance";

/**
 * Booking API - Quản lý đơn đặt lịch
 */

// Lấy tất cả bookings (Staff/Admin)
export const getAllBookings = async (params = {}) => {
  const response = await axiosInstance.get("/bookings", { params });
  return response.data;
};

// Lấy bookings của tôi (Customer)
export const getMyBookings = async (params = {}) => {
  const response = await axiosInstance.get("/bookings/my", { params });
  return response.data;
};

// Lấy chi tiết booking
export const getBookingById = async (id) => {
  const response = await axiosInstance.get(`/bookings/${id}`);
  return response.data;
};

// Tạo booking từ giỏ hàng (Customer)
export const createBooking = async (bookingData) => {
  const response = await axiosInstance.post("/bookings", bookingData);
  return response.data;
};

// Checkout với kiểm tra availability (Customer)
export const checkoutBooking = async (checkoutData) => {
  const response = await axiosInstance.post("/bookings/checkout", checkoutData);
  return response.data;
};

// Tạo booking cho khách vãng lai (Staff/Admin)
export const createGuestBooking = async (guestBookingData) => {
  const response = await axiosInstance.post("/bookings/guest", guestBookingData);
  return response.data;
};

// Cập nhật trạng thái booking (Staff/Admin)
export const updateBookingStatus = async (id, status) => {
  const response = await axiosInstance.put(`/bookings/${id}/status`, { status });
  return response.data;
};

// Hủy booking
export const cancelBooking = async (id, reason) => {
  const response = await axiosInstance.put(`/bookings/${id}/cancel`, { reason });
  return response.data;
};

// Gán nhân viên cho booking (Staff/Admin)
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
