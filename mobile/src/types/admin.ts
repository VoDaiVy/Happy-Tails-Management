export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "staff" | "admin";
  isActive?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
}
