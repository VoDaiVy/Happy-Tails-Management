import { axiosClient } from "../axiosClient";
import type {
  PayOSDepositStatus,
  WalletInfo,
  WalletTransaction,
  WalletTransactionListResponse,
} from "../../types/wallet";

export async function getWalletInfo() {
  const response = await axiosClient.get<{ success: boolean; message: string; data: WalletInfo }>("/wallet");
  return response.data.data;
}

export async function getWalletTransactions(query?: { page?: number; limit?: number; type?: string; status?: string }) {
  const response = await axiosClient.get<WalletTransactionListResponse>("/wallet/transactions", {
    params: query,
  });
  return response.data;
}

export async function createDepositLink(payload: {
  amount: number;
  note?: string;
  returnUrl?: string;
  cancelUrl?: string;
}) {
  const response = await axiosClient.post<{
    success: boolean;
    message: string;
    data: {
      checkoutUrl: string;
      qrCode?: string;
      orderCode: number;
      transactionCode: string;
      amount: number;
      expiredAt?: string;
    };
  }>("/wallet/deposit", payload);
  return response.data.data;
}

export async function getPayOSDepositStatus(orderCode: number | string) {
  const response = await axiosClient.get<{
    success: boolean;
    message: string;
    data: PayOSDepositStatus;
  }>(`/wallet/payos/status/${orderCode}`);

  return response.data.data;
}

export async function getWalletTransactionById(transactionId: string) {
  const response = await axiosClient.get<{
    success: boolean;
    message: string;
    data: WalletTransaction;
  }>(`/wallet/transactions/${transactionId}`);

  return response.data.data;
}
