export type StaffModuleKey =
  | "overview"
  | "bookings"
  | "schedule"
  | "feedback"
  | "notifications"
  | "medical"
  | "news";

export interface StaffProfile {
  name: string;
  role: string;
}

export interface KPIItem {
  label: string;
  value: string;
  trend?: string;
}

export interface BookingCardModel {
  id: string;
  status: "Pending" | "Accepted" | "In Progress" | "Completed" | "Cancelled";
  customerName: string;
  email: string;
  dateTime: string;
  service: string;
  paymentMethod: string;
  paymentStatus: "Paid" | "Unpaid" | "Partially Paid";
  amount: string;
}

export interface ScheduleCardModel {
  time: string;
  bookingCode: string;
  pet: string;
  customer: string;
  service: string;
  staff: string;
  status: "Pending" | "In Progress" | "Completed";
}

export interface NotificationCardModel {
  title: string;
  type: string;
  targetAudience: string;
  createdBy: string;
  createdDate: string;
  scheduledAt: string;
  status: "Draft" | "Scheduled" | "Sent";
  delivery: string;
}

export interface MedicalRecordCardModel {
  pet: string;
  owner: string;
  recordId: string;
  recordType: string;
  summary: string;
  visitDate: string;
  assignedStaff: string;
  progress: string;
  status: "Open" | "In Review" | "Closed";
}

export interface NewsPostCardModel {
  thumbnail: string;
  title: string;
  date: string;
  category: string;
  targetAudience: string;
  status: "Draft" | "Published" | "Scheduled";
  tag: string;
}
