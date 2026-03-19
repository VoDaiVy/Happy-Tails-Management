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
