export interface Voucher {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  isAIGenerated?: boolean;
  createdAt?: string;
}

export interface CreateVoucherPayload {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  validUntil: string;
}
