export type NotificationType = "system" | "order" | "payment" | "promotion" | "account";

export interface AppNotification {
  _id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string | null;
  actionUrl?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

export interface NotificationPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
