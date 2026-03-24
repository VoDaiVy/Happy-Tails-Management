import { blockUserAccount, getAdminUsersList, unblockUserAccount, updateUserRole } from "./adminApi";
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

export async function getAdminUsers(query: { search?: string; role?: string; isBlocked?: boolean; page?: number; limit?: number } = {}): Promise<UsersListResponse> {
  const response = await getAdminUsersList({
    search: query.search,
    role: query.role as "customer" | "staff" | "admin" | undefined,
    isBlocked: query.isBlocked,
    page: query.page,
    limit: query.limit,
  });

  const data = (response.users || []).map((item: any) => ({
    _id: String(item._id || item.id || ""),
    name: String(item.name || item.fullName || "Unknown"),
    email: String(item.email || ""),
    role: (item.role || "customer") as AdminUser["role"],
    isActive: item.isActive,
    isBlocked: Boolean(item.isBlocked ?? (item.isActive === false)),
    isDeleted: item.isDeleted,
    createdAt: item.createdAt,
  }));

  return {
    success: true,
    message: "OK",
    data,
    pagination: response.pagination as UsersListResponse["pagination"],
  };
}

export async function blockAdminUser(userId: string, reason = "Blocked from mobile admin") {
  const response = await blockUserAccount(userId, reason);
  return {
    success: true,
    message: "User blocked",
    data: {
      user: response.user,
    },
  };
}

export async function unblockAdminUser(userId: string) {
  const response = await unblockUserAccount(userId);
  return {
    success: true,
    message: "User unblocked",
    data: {
      user: response.user,
    },
  };
}

export async function updateAdminUserRole(userId: string, role: "customer" | "staff" | "admin") {
  const response = await updateUserRole(userId, role);
  return {
    success: true,
    message: "User role updated",
    data: {
      user: response.user,
    },
  };
}
