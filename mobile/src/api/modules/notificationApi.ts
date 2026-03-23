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

export interface StaffOutboxRow {
  _id: string;
  title?: string;
  body?: string;
  type?: string;
  createdAt?: string;
  totalRecipients?: number;
  deliveredCount?: number;
  readCount?: number;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

interface StaffOutboxResponse {
  success: boolean;
  message: string;
  data: StaffOutboxRow[];
  pagination?: NotificationPagination;
}

interface StaffCustomersResponse {
  success: boolean;
  message: string;
  data: Array<{ _id: string; name?: string; email?: string; avatar?: string }>;
}

export interface SendNotificationPayload {
  title: string;
  body: string;
  type?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
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

export async function getStaffOutbox(params?: { page?: number; limit?: number; search?: string }) {
  const response = await axiosClient.get<StaffOutboxResponse>("/notifications/staff/outbox", { params });
  return {
    rows: response.data.data || [],
    pagination: response.data.pagination,
  };
}

export async function getStaffCustomers(params?: { search?: string }) {
  const response = await axiosClient.get<StaffCustomersResponse>("/notifications/staff/customers", { params });
  return response.data.data || [];
}

export async function sendNotification(payload: SendNotificationPayload) {
  const response = await axiosClient.post("/notifications/send", payload);
  return response.data;
}

export async function broadcastNotification(payload: Omit<SendNotificationPayload, "userId">) {
  const response = await axiosClient.post("/notifications/broadcast", payload);
  return response.data;
}
