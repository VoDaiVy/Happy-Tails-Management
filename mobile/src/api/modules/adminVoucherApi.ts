import { axiosClient } from "../axiosClient";
import type { CreateVoucherPayload, Voucher } from "../../types/voucher";

interface VoucherListResponse {
  status: "success" | "error";
  data: {
    vouchers: Voucher[];
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
    voucher: Voucher;
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
