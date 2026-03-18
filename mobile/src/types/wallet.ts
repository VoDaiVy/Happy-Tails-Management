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
  failureReason?: string | null;
  payosOrderCode?: number;
  payosCheckoutUrl?: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  processedAt?: string;
  expiredAt?: string;
  walletId?: {
    _id?: string;
    balance?: number;
    currency?: string;
  };
  createdAt: string;
}

export interface PayOSDepositStatus {
  transactionId: string;
  transactionCode: string;
  orderCode: number;
  amount: number;
  status: string;
  payosStatus?: string;
  checkoutUrl?: string;
  qrCode?: string;
  failureReason?: string | null;
  expiredAt?: string;
  newBalance?: number | null;
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
