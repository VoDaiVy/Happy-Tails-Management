import { axiosClient } from "../axiosClient";
import { extractPagination, extractPayload } from "../responseParser";
import type { AuthUser } from "../../types/auth";

export interface AdminUsersQuery {
  isBlocked?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "email" | "name";
  sortOrder?: "asc" | "desc";
  role?: "customer" | "staff" | "admin";
}

export interface RevenueStatsQuery {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
}

export interface TopServicesQuery {
  from?: string;
  to?: string;
  limit?: number;
}

export interface AdminTransactionsQuery {
  search?: string;
  userId?: string;
  type?: "deposit" | "payment" | "refund";
  status?: "pending" | "completed" | "failed" | "cancelled";
  method?: "payos" | "system";
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "amount";
  sortOrder?: "asc" | "desc";
}

export interface AdminNotificationPayload {
  title: string;
  message: string;
  type?: string;
  priority?: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}

export interface GroupCapacityPayload {
  group: "wet" | "dry";
  maxCapacity?: number;
  roomCount?: number;
  slotsPerRoom?: number;
  description?: string;
  isActive?: boolean;
}

export async function getAdminOverview() {
  const response = await axiosClient.get("/admin/stats/overview");
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function getAdminRevenueStats(query: RevenueStatsQuery = {}) {
  const response = await axiosClient.get("/admin/stats/revenue", { params: query });
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function getAdminTopServices(query: TopServicesQuery = {}) {
  const response = await axiosClient.get("/admin/stats/top-services", { params: query });
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function getAdminUsersList(query: AdminUsersQuery = {}) {
  const response = await axiosClient.get("/admin/users/list", { params: query });
  const payload = extractPayload<{ users?: AuthUser[] } | AuthUser[]>(response.data);
  const users = Array.isArray(payload) ? payload : payload.users || [];
  return {
    users,
    pagination: extractPagination<Record<string, unknown>>(response.data) || undefined,
  };
}

export async function getAdminUserDetail(userId: string) {
  const response = await axiosClient.get(`/admin/users/${userId}/detail`);
  const payload = extractPayload<{ user?: AuthUser }>(response.data);
  return payload.user as AuthUser;
}

export async function blockUserAccount(userId: string, reason?: string) {
  const response = await axiosClient.put(`/admin/users/${userId}/block`, { reason });
  return extractPayload<{ user?: AuthUser }>(response.data);
}

export async function unblockUserAccount(userId: string) {
  const response = await axiosClient.put(`/admin/users/${userId}/unblock`);
  return extractPayload<{ user?: AuthUser }>(response.data);
}

export async function updateUserRole(userId: string, role: "customer" | "staff" | "admin") {
  const response = await axiosClient.put(`/admin/users/${userId}/role`, { role });
  return extractPayload<{ user?: AuthUser }>(response.data);
}

export async function toggleUserBan(userId: string) {
  const response = await axiosClient.put(`/admin/users/${userId}/ban`);
  return extractPayload<{ user?: AuthUser }>(response.data);
}

export async function softDeleteUser(userId: string) {
  const response = await axiosClient.delete(`/admin/users/${userId}`);
  return extractPayload<null>(response.data);
}

export async function permanentDeleteUser(userId: string) {
  const response = await axiosClient.delete(`/admin/users/${userId}/permanent`);
  return extractPayload<null>(response.data);
}

export async function getStaffList() {
  const response = await axiosClient.get("/admin/staff");
  const payload = extractPayload<{ staff?: AuthUser[] }>(response.data);
  return payload.staff || [];
}

export async function getSystemStatistics() {
  const response = await axiosClient.get("/admin/statistics");
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function getAdminTransactions(query: AdminTransactionsQuery = {}) {
  const response = await axiosClient.get("/admin/transactions", { params: query });
  const payload = extractPayload<{ transactions?: Record<string, unknown>[] } | Record<string, unknown>[]>(response.data);
  const transactions = Array.isArray(payload) ? payload : payload.transactions || [];
  return {
    transactions,
    pagination: extractPagination<Record<string, unknown>>(response.data) || undefined,
  };
}

export async function getAdminTransactionSummary(query: { from?: string; to?: string } = {}) {
  const response = await axiosClient.get("/admin/transactions/summary", { params: query });
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function getAdminTransactionById(transactionId: string) {
  const response = await axiosClient.get(`/admin/transactions/${transactionId}`);
  const payload = extractPayload<{ transaction?: Record<string, unknown> }>(response.data);
  return payload.transaction || null;
}

export async function sendNotificationToUser(userId: string | "all", payload: AdminNotificationPayload) {
  const response = await axiosClient.post("/admin/notifications/send", {
    userId,
    ...payload,
  });
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function broadcastNotification(payload: AdminNotificationPayload & { userFilter?: Record<string, unknown> }) {
  const response = await axiosClient.post("/admin/notifications/broadcast", payload);
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function getGroupCapacities() {
  const response = await axiosClient.get("/admin/group-capacity");
  return extractPayload<{ configs?: Record<string, unknown>[] }>(response.data);
}

export async function getGroupCapacity(group: "wet" | "dry") {
  const response = await axiosClient.get(`/admin/group-capacity/${group}`);
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function initializeDefaultGroupCapacities() {
  const response = await axiosClient.post("/admin/group-capacity/init");
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function createGroupCapacity(payload: GroupCapacityPayload) {
  const response = await axiosClient.post("/admin/group-capacity", payload);
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function updateGroupCapacity(group: "wet" | "dry", payload: Partial<GroupCapacityPayload>) {
  const response = await axiosClient.put(`/admin/group-capacity/${group}`, payload);
  return extractPayload<Record<string, unknown>>(response.data);
}

export async function deleteGroupCapacity(group: "wet" | "dry") {
  const response = await axiosClient.delete(`/admin/group-capacity/${group}`);
  return extractPayload<null>(response.data);
}
