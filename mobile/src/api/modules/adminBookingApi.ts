import { axiosClient } from "../axiosClient";
import type { AdminBooking, BookingStatus } from "../../types/admin";

interface BookingListResponse {
  status: "success" | "error";
  data: {
    bookings: AdminBooking[];
  };
}

interface BookingUpdateResponse {
  status: "success" | "error";
  message?: string;
  data: {
    booking: AdminBooking;
  };
}

export async function getAdminBookings(params?: { status?: string; date?: string }) {
  const response = await axiosClient.get<BookingListResponse>("/bookings", { params });
  return response.data.data.bookings;
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const response = await axiosClient.put<BookingUpdateResponse>(`/bookings/${bookingId}/status`, { status });
  return response.data;
}
