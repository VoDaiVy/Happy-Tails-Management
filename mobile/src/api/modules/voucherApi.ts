import { axiosClient } from "../axiosClient";
import { extractPayload, extractPagination } from "../responseParser";
import type { AvailableVoucher, AvailableVoucherListResponse } from "../../types/voucher";
import { formatVnd } from "../../utils/currency";

export async function getAvailableVouchers(query?: { search?: string; page?: number; limit?: number }) {
  const response = await axiosClient.get<AvailableVoucherListResponse>("/vouchers/available", {
    params: query,
  });

  const payload = extractPayload<{ vouchers?: AvailableVoucher[] }>(response.data);
  return payload.vouchers || [];
}

export function formatVoucherPreview(voucher: AvailableVoucher) {
  if (voucher.discountType === "percentage") {
    const max = voucher.maxDiscount ? `, up to ${formatVnd(voucher.maxDiscount)}` : "";
    return `Save ${voucher.discountValue}%${max}`;
  }

  return `Save ${formatVnd(voucher.discountValue)}`;
}

export interface AdminVoucherListQuery {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
}

export async function getAllVouchers(query: AdminVoucherListQuery = {}) {
  const response = await axiosClient.get("/vouchers", { params: query });
  return {
    data: extractPayload<{ vouchers?: AvailableVoucher[] }>(response.data),
    pagination: extractPagination<Record<string, unknown>>(response.data) || undefined,
  };
}

export async function getVoucherById(voucherId: string) {
  const response = await axiosClient.get(`/vouchers/${voucherId}`);
  return extractPayload<{ voucher?: AvailableVoucher }>(response.data);
}

export async function createVoucher(payload: {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number;
  validFrom?: string;
  validUntil: string;
  usageLimit?: number;
  isActive?: boolean;
}) {
  const response = await axiosClient.post("/vouchers", payload);
  return extractPayload<{ voucher?: AvailableVoucher }>(response.data);
}

export async function updateVoucher(voucherId: string, payload: Partial<{
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSpend: number;
  maxDiscount: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  isActive: boolean;
}>) {
  const response = await axiosClient.put(`/vouchers/${voucherId}`, payload);
  return extractPayload<{ voucher?: AvailableVoucher }>(response.data);
}

export async function toggleVoucherStatus(voucherId: string) {
  const response = await axiosClient.put(`/vouchers/${voucherId}/toggle`);
  return extractPayload<{ voucher?: AvailableVoucher }>(response.data);
}

export async function deleteVoucher(voucherId: string) {
  const response = await axiosClient.delete(`/vouchers/${voucherId}`);
  return extractPayload<null>(response.data);
}
