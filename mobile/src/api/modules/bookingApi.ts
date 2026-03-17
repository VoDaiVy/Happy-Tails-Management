import { axiosClient } from "../axiosClient";
import type { Booking, BookingCheckoutPayload } from "../../types/booking";

interface MyBookingsResponse {
  status: "success" | "error";
  results: number;
  data: {
    bookings: Booking[];
  };
}

interface CheckoutBookingResponse {
  status: "success" | "error";
  message: string;
  data: {
    booking: Booking;
    schedule?: Array<{
      service: string;
      group: string;
      room: string;
      startTime: string;
      endTime: string;
      durationMins: number;
    }>;
    totalAmount: number;
  };
}

export async function getMyBookings(status?: string): Promise<Booking[]> {
  const response = await axiosClient.get<MyBookingsResponse>("/bookings/my", {
    params: status ? { status } : undefined,
  });
  return response.data.data.bookings;
}

export async function checkoutBooking(payload: BookingCheckoutPayload) {
  const response = await axiosClient.post<CheckoutBookingResponse>("/bookings/checkout", payload);
  return response.data;
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const response = await axiosClient.put(`/bookings/${bookingId}/cancel`, {
    reason,
  });
  return response.data;
}
