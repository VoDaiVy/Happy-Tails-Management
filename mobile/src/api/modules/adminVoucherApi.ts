import { axiosClient } from "../axiosClient";

export interface AdminVoucher {
  _id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed" | string;
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number | null;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number | null;
  usedCount?: number;
  isActive?: boolean;
}

export interface CreateVoucherPayload {
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  isActive?: boolean;
}

interface VoucherListResponse {
  status: "success" | "error";
  data: {
    vouchers: AdminVoucher[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

interface VoucherResponse {
  status: "success" | "error";
  message?: string;
  data: {
    voucher: AdminVoucher;
  };
}

export async function getAdminVouchers(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
  const response = await axiosClient.get<VoucherListResponse>("/vouchers", { params });
  return response.data.data;
}

export async function createAdminVoucher(payload: CreateVoucherPayload) {
  const response = await axiosClient.post<VoucherResponse>("/vouchers", payload);
  return response.data;
}

export async function updateAdminVoucher(voucherId: string, payload: Partial<CreateVoucherPayload>) {
  const response = await axiosClient.put<VoucherResponse>(`/vouchers/${voucherId}`, payload);
  return response.data;
}

export async function toggleAdminVoucher(voucherId: string) {
  const response = await axiosClient.put<VoucherResponse>(`/vouchers/${voucherId}/toggle`);
  return response.data;
}

export async function deleteAdminVoucher(voucherId: string) {
  const response = await axiosClient.delete<{ status: "success" | "error"; message?: string }>(`/vouchers/${voucherId}`);
  return response.data;
}
