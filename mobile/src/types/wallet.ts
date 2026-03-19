export interface WalletInfo {
  _id: string;
  balance: number;
  currency: string;
  totalDeposited: number;
  totalSpent: number;
  formattedBalance: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  _id: string;
  transactionCode: string;
  type: "deposit" | "payment" | "refund" | string;
  amount: number;
  status: "pending" | "completed" | "failed" | "cancelled" | string;
  method?: string;
  paymentMethod?: string;
  note?: string;
  description?: string;
  createdAt: string;
}

export interface WalletTransactionListResponse {
  success: boolean;
  message: string;
  data: WalletTransaction[];
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
