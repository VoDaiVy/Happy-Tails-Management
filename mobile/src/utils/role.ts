import type { UserRole } from "../types/auth";

function normalizeRole(role?: UserRole | string | null): UserRole | null {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "user" || value === "client" || value === "member") return "customer";
  if (value === "customer" || value === "staff" || value === "admin") return value;
  return null;
}

export function isCustomerRole(role?: UserRole | string | null) {
  return normalizeRole(role) === "customer";
}

export function isStaffRole(role?: UserRole | string | null) {
  return normalizeRole(role) === "staff";
}

export function isAdminRole(role?: UserRole | string | null) {
  return normalizeRole(role) === "admin";
}

export function isStaffOrAdminRole(role?: UserRole | string | null) {
  return isStaffRole(role) || isAdminRole(role);
}

export function canUseCustomerFeatures(role?: UserRole | string | null) {
  return isCustomerRole(role);
}
