import type { ServiceItem } from "./service";

export interface BookingItem {
  _id?: string;
  service: string | ServiceItem;
  quantity: number;
  price: number;
  notes?: string;
  startTime?: string;
  endTime?: string;
  assignedRoom?: string;
}

export interface Booking {
  _id: string;
  bookingNumber?: string;
  status: string;
  bookingDate: string;
  bookingTime?: string;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  items: BookingItem[];
}

export interface BookingCheckoutPayload {
  appointmentDate: string;
  petId: string;
  voucherCode?: string;
  paymentMethod?: "cash" | "wallet" | "bank_transfer" | string;
  notes?: string;
}
