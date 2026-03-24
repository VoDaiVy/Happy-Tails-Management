export interface PolicyItem {
  _id: string;
  title: string;
  slug: string;
  content: string;
  type: "terms" | "privacy" | "refund" | "cancellation" | "general" | string;
  version?: string;
  isActive?: boolean;
  effectiveDate?: string;
  createdAt?: string;
}
