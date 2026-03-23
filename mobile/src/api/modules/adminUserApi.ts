import { axiosClient } from "../axiosClient";
import type { AdminUser } from "../../types/admin";

interface UsersListResponse {
  success: boolean;
  message: string;
  data: AdminUser[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface UserResponse {
  success?: boolean;
  status?: "success" | "error";
  message?: string;
  data?: {
    user?: AdminUser;
  };
}

interface QuickRegisterResponse {
  status: "success" | "error";
  message?: string;
  data?: {
    userID?: string;
    name?: string;
    email?: string;
    isNew?: boolean;
  };
}

export async function getAdminUsers(query: { search?: string; role?: string; isBlocked?: boolean; page?: number; limit?: number } = {}) {
  const response = await axiosClient.get<UsersListResponse>("/admin/users/list", { params: query });
  return response.data;
}

export async function updateAdminUserRole(userId: string, role: "customer" | "staff" | "admin") {
  const response = await axiosClient.put<UserResponse>(`/admin/users/${userId}/role`, { role });
  return response.data;
}

export async function blockAdminUser(userId: string, reason = "Blocked from mobile admin") {
  const response = await axiosClient.put<UserResponse>(`/admin/users/${userId}/block`, { reason });
  return response.data;
}

export async function unblockAdminUser(userId: string) {
  const response = await axiosClient.put<UserResponse>(`/admin/users/${userId}/unblock`);
  return response.data;
}

export async function deleteAdminUser(userId: string) {
  const response = await axiosClient.delete<UserResponse>(`/admin/users/${userId}`);
  return response.data;
}

export async function quickRegisterUser(payload: { fullName: string; phone: string }) {
  const response = await axiosClient.post<QuickRegisterResponse>("/users/staff/quick-register", payload);
  return response.data;
}
