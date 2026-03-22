import { axiosClient } from "../axiosClient";
import type { AppNotification, NotificationPagination } from "../../types/notification";

interface NotificationsResponse {
  success: boolean;
  message: string;
  data: AppNotification[];
  pagination: NotificationPagination;
}

interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
  };
}

interface StaffOutboxItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface StaffOutboxResponse {
  success: boolean;
  message: string;
  data: StaffOutboxItem[];
  pagination: NotificationPagination;
}

interface CustomerUserItem {
  _id: string;
  name?: string;
  email?: string;
}

interface CustomerUsersResponse {
  success: boolean;
  message: string;
  data: CustomerUserItem[];
}

export async function getNotifications(params?: { page?: number; limit?: number; isRead?: boolean }) {
  const response = await axiosClient.get<NotificationsResponse>("/notifications", { params });
  return {
    notifications: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getUnreadCount() {
  const response = await axiosClient.get<UnreadCountResponse>("/notifications/unread-count");
  return response.data.data.count;
}

export async function markNotificationAsRead(id: string) {
  const response = await axiosClient.put(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await axiosClient.put("/notifications/read-all");
  return response.data;
}

export async function deleteNotification(id: string) {
  const response = await axiosClient.delete(`/notifications/${id}`);
  return response.data;
}

export async function deleteAllReadNotifications() {
  const response = await axiosClient.delete("/notifications/read");
  return response.data;
}

export async function getStaffOutbox(params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}) {
  const response = await axiosClient.get<StaffOutboxResponse>("/notifications/staff/outbox", {
    params,
  });

  return {
    rows: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getNotificationCustomers(search?: string) {
  const response = await axiosClient.get<CustomerUsersResponse>("/notifications/staff/customers", {
    params: search ? { search } : undefined,
  });

  return response.data.data;
}

export async function sendNotification(payload: {
  userId: string;
  title: string;
  body: string;
  type?: string;
  actionUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  const response = await axiosClient.post("/notifications/send", payload);
  return response.data;
}

export async function broadcastNotification(payload: {
  title: string;
  body: string;
  type?: string;
  actionUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  userFilter?: Record<string, unknown>;
}) {
  const response = await axiosClient.post("/notifications/broadcast", payload);
  return response.data;
}
