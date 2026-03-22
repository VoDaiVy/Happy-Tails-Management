import axiosInstance from "./axiosInstance";

// Get current user's notifications
export const getMyNotifications = async (params = {}) => {
  const response = await axiosInstance.get("/notifications", { params });
  return response;
};

// Get unread notification count
export const getUnreadCount = async () => {
  const response = await axiosInstance.get("/notifications/unread-count");
  return response;
};

// Mark a single notification as read
export const markNotificationAsRead = async (id) => {
  const response = await axiosInstance.put(`/notifications/${id}/read`);
  return response;
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  const response = await axiosInstance.put("/notifications/read-all");
  return response;
};

// Send notification to a single user or "all"
export const sendNotification = async (payload) => {
  const response = await axiosInstance.post("/notifications/send", payload);
  return response;
};

// Broadcast notification to users by filter
export const broadcastNotification = async (payload) => {
  const response = await axiosInstance.post(
    "/notifications/broadcast",
    payload,
  );
  return response;
};

// Delete one notification from current user's inbox
export const deleteNotification = async (id) => {
  const response = await axiosInstance.delete(`/notifications/${id}`);
  return response;
};

// Delete all read notifications
export const deleteAllReadNotifications = async () => {
  const response = await axiosInstance.delete("/notifications/read");
  return response;
};

// Staff outbox: get aggregated sent notifications for management
export const getStaffOutbox = async (params = {}) => {
  const response = await axiosInstance.get("/notifications/staff/outbox", { params });
  return response;
};

// Staff: get customer users for notification audience picker
export const getStaffCustomers = async (params = {}) => {
  const response = await axiosInstance.get("/notifications/staff/customers", { params });
  return response;
};

export default {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendNotification,
  broadcastNotification,
  deleteNotification,
  deleteAllReadNotifications,
  getStaffOutbox,
  getStaffCustomers,
};
