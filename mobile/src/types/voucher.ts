export interface AvailableVoucher {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed" | string;
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number | null;
  validUntil: string;
  usageLimit?: number | null;
  usedCount?: number;
}

export interface AvailableVoucherListResponse {
  status: "success" | "error";
  results: number;
  data: {
    vouchers: AvailableVoucher[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}
