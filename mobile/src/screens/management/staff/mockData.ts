import type {
  BookingCardModel,
  KPIItem,
  MedicalRecordCardModel,
  NewsPostCardModel,
  NotificationCardModel,
  ScheduleCardModel,
  StaffProfile,
} from "./types";

export const staffProfileMock: StaffProfile = {
  name: "Linh Tran",
  role: "Staff Coordinator",
};

export const overviewKPI: KPIItem[] = [
  { label: "Total Bookings", value: "1,248", trend: "+8.1%" },
  { label: "Today's Bookings", value: "34", trend: "+4" },
  { label: "Pending Bookings", value: "16", trend: "Needs action" },
  { label: "Completed Bookings", value: "1,102", trend: "88% done" },
];

export const bookingsMock: BookingCardModel[] = [
  {
    id: "BK-240321-001",
    status: "Pending",
    customerName: "Ngoc Anh",
    email: "ngocanh@gmail.com",
    dateTime: "22 Mar 2026, 09:30",
    service: "Full Grooming",
    paymentMethod: "Cash",
    paymentStatus: "Unpaid",
    amount: "1,200,000 VND",
  },
  {
    id: "BK-240321-002",
    status: "In Progress",
    customerName: "Thao Nguyen",
    email: "thaon@gmail.com",
    dateTime: "22 Mar 2026, 10:00",
    service: "Spa + Nail Trim",
    paymentMethod: "PayOS",
    paymentStatus: "Paid",
    amount: "850,000 VND",
  },
  {
    id: "BK-240321-003",
    status: "Completed",
    customerName: "Minh Khang",
    email: "mkhang@gmail.com",
    dateTime: "22 Mar 2026, 08:15",
    service: "Bath & Brush",
    paymentMethod: "Card",
    paymentStatus: "Paid",
    amount: "650,000 VND",
  },
];

export const scheduleMock: Record<string, ScheduleCardModel[]> = {
  "Today - 22 Mar": [
    {
      time: "09:00",
      bookingCode: "BK-240321-001",
      pet: "Milo (Corgi)",
      customer: "Ngoc Anh",
      service: "Full Grooming",
      staff: "Nhi",
      status: "Pending",
    },
    {
      time: "10:30",
      bookingCode: "BK-240321-004",
      pet: "Luna (Poodle)",
      customer: "Mai Linh",
      service: "Medical Check",
      staff: "Khanh",
      status: "In Progress",
    },
  ],
  "Tomorrow - 23 Mar": [
    {
      time: "11:00",
      bookingCode: "BK-240322-010",
      pet: "Bim (Shiba)",
      customer: "Hoang Long",
      service: "Spa + Massage",
      staff: "Trang",
      status: "Pending",
    },
  ],
};

export const feedbackStats = {
  totalReviews: 248,
  averageRating: 4.7,
  filteredResult: 31,
};

export const notificationStats = [
  { label: "Total notifications", value: "128" },
  { label: "Sent today", value: "16" },
  { label: "Scheduled", value: "7" },
  { label: "Drafts", value: "12" },
];

export const notificationsMock: NotificationCardModel[] = [
  {
    title: "Weekend Promo Reminder",
    type: "Promotion",
    targetAudience: "All Customers",
    createdBy: "Staff Linh",
    createdDate: "21 Mar 2026",
    scheduledAt: "22 Mar 2026, 08:00",
    status: "Scheduled",
    delivery: "Push + Email",
  },
  {
    title: "Booking Confirmation Delay",
    type: "System",
    targetAudience: "Customers with pending bookings",
    createdBy: "Staff Nhi",
    createdDate: "20 Mar 2026",
    scheduledAt: "Sent immediately",
    status: "Sent",
    delivery: "Push",
  },
];

export const medicalStats = [
  { label: "Total records", value: "512" },
  { label: "Open", value: "27" },
  { label: "In review", value: "18" },
  { label: "Closed", value: "467" },
];

export const medicalRecordsMock: MedicalRecordCardModel[] = [
  {
    pet: "Milo",
    owner: "Ngoc Anh",
    recordId: "MR-1032",
    recordType: "Post-grooming check",
    summary: "Mild skin dryness, moisturizing advised.",
    visitDate: "22 Mar 2026",
    assignedStaff: "Khanh",
    progress: "80%",
    status: "In Review",
  },
  {
    pet: "Luna",
    owner: "Mai Linh",
    recordId: "MR-1033",
    recordType: "Vaccination follow-up",
    summary: "No adverse reaction after vaccine.",
    visitDate: "21 Mar 2026",
    assignedStaff: "Trang",
    progress: "100%",
    status: "Closed",
  },
];

export const newsMock: NewsPostCardModel[] = [
  {
    thumbnail: "Grooming Tips",
    title: "5 tips to reduce pet anxiety before grooming",
    date: "22 Mar 2026",
    category: "Pet Care",
    targetAudience: "All Customers",
    status: "Published",
    tag: "News Feed",
  },
  {
    thumbnail: "Clinic Update",
    title: "Updated vaccination schedule in April",
    date: "20 Mar 2026",
    category: "Medical",
    targetAudience: "Pet Owners",
    status: "Draft",
    tag: "Internal",
  },
];

export const recentNewsActivity = [
  "Published post: Grooming tips",
  "Draft created: Vaccination schedule",
  "Updated banner image for Spring campaign",
];
