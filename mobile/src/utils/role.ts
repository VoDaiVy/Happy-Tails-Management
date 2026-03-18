import type { UserRole } from "../types/auth";

export function isCustomerRole(role?: UserRole | string | null) {
  return role === "customer";
}

export function isStaffRole(role?: UserRole | string | null) {
  return role === "staff";
}

export function isAdminRole(role?: UserRole | string | null) {
  return role === "admin";
}

export function isStaffOrAdminRole(role?: UserRole | string | null) {
  return isStaffRole(role) || isAdminRole(role);
}

export function canUseCustomerFeatures(role?: UserRole | string | null) {
  return isCustomerRole(role);
}
