export type BookingStatus = "pending" | "confirmed" | "in-progress" | "completed" | "cancelled";

export interface AdminBooking {
  _id: string;
  bookingNumber?: string;
  status: BookingStatus;
  bookingDate: string;
  bookingTime?: string;
  totalAmount: number;
  customer?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  assignedStaff?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  items: Array<{
    _id?: string;
    service?: {
      _id?: string;
      name?: string;
    };
    quantity?: number;
    price?: number;
  }>;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "staff" | "admin";
  isActive?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
}
