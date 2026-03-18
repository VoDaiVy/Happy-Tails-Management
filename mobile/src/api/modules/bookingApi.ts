import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";
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

interface BookingDetailResponse {
  status: "success" | "error";
  data: {
    booking: Booking;
  };
}

interface AvailableSlotsResponse {
  status: "success" | "error";
  data: {
    disabledSlots: string[];
    serviceDisabledSlots: string[];
    petConflictSlots: string[];
    serviceId: string;
    petId: string | null;
    date: string;
    group: string;
    maxCapacity: number;
  };
}

export async function getMyBookings(status?: string): Promise<Booking[]> {
  const response = await axiosClient.get<MyBookingsResponse>("/bookings/my", {
    params: status ? { status } : undefined,
  });
  const payload = extractPayload<{ bookings?: Booking[] }>(response.data);
  return payload.bookings || [];
}

export async function checkoutBooking(payload: BookingCheckoutPayload) {
  const response = await axiosClient.post<CheckoutBookingResponse>("/bookings/checkout", payload);
  return response.data;
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const response = await axiosClient.put(`/bookings/${bookingId}/cancel`, {
    reason,
  });
  return extractPayload<{
    booking?: Booking;
    wallet?: unknown;
    refund?: unknown;
  }>(response.data);
}

export async function getBookingById(bookingId: string): Promise<Booking> {
  const response = await axiosClient.get<BookingDetailResponse>(`/bookings/${bookingId}`);
  const payload = extractPayload<{ booking?: Booking }>(response.data);
  return payload.booking as Booking;
}

export async function getAvailableSlots(params: {
  date: string;
  serviceId: string;
  petId?: string;
}) {
  const response = await axiosClient.get<AvailableSlotsResponse>("/bookings/available-slots", {
    params,
  });
  return extractPayload<AvailableSlotsResponse["data"]>(response.data);
}

export interface GuestBookingPayload {
  guestInfo: {
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    service?: string;
    serviceId?: string;
    quantity?: number;
    note?: string;
  }>;
  appointmentDate?: string;
  bookingDate?: string;
  bookingTime?: string;
  petInfo?: {
    petName: string;
    petType: string;
  };
  guestPet?: {
    petName: string;
    petType: string;
  };
  notes?: string;
  paymentMethod?: "cash" | "wallet" | "bank_transfer" | string;
}

export interface GetAllBookingsQuery {
  status?: string;
  date?: string;
  customer?: string;
}

export interface UpdateBookingStatusPayload {
  status: string;
  medicalRecord?: {
    notes?: string;
    photos?: string[];
  };
}

export async function createGuestBooking(payload: GuestBookingPayload) {
  const response = await axiosClient.post("/bookings/guest", payload);
  return extractPayload<{
    booking: Booking;
    schedule?: Array<{
      service: string;
      group: string;
      room: string;
      startTime: string;
      endTime: string;
      durationMins: number;
    }>;
  }>(response.data);
}

export async function getAllBookings(query: GetAllBookingsQuery = {}): Promise<Booking[]> {
  const response = await axiosClient.get("/bookings", { params: query });
  const payload = extractPayload<{ bookings?: Booking[] }>(response.data);
  return payload.bookings || [];
}

export async function updateBookingStatus(bookingId: string, payload: UpdateBookingStatusPayload) {
  const response = await axiosClient.put(`/bookings/${bookingId}/status`, payload);
  const data = extractPayload<{ booking?: Booking }>(response.data);
  return data.booking as Booking;
}

export async function assignStaffToBooking(bookingId: string, staffId: string) {
  const response = await axiosClient.put(`/bookings/${bookingId}/assign-staff`, { staffId });
  const data = extractPayload<{ booking?: Booking }>(response.data);
  return data.booking as Booking;
}
