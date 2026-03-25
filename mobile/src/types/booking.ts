import type { ServiceItem } from "./service";
import type { Pet } from "./pet";

export interface BookingServiceRef {
  _id?: string;
  name?: string;
  price?: number;
  duration?: number;
}

export interface BookingItem {
  _id?: string;
  service: string | ServiceItem | BookingServiceRef;
  pet?: string | Pet;
  quantity: number;
  price: number;
  notes?: string;
  group?: string;
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
  serviceProgress?: {
    checkInPhotos?: string[];
    checkOutPhotos?: string[];
  };
}

export interface BookingCheckoutPayload {
  appointmentDate: string;
  petId: string;
  voucherCode?: string;
  paymentMethod?: "cash" | "wallet" | "bank_transfer" | string;
  notes?: string;
}
