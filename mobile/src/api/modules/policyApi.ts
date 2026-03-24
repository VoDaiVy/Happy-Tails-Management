import { axiosClient } from "../axiosClient";
import type { PolicyItem } from "../../types/policy";

interface PolicyListResponse {
  status: "success" | "error";
  data: { policies: PolicyItem[] };
}

interface PolicyDetailResponse {
  status: "success" | "error";
  data: { policy: PolicyItem };
}

interface PolicyActionResponse {
  status: "success" | "error";
  message: string;
  data: { policy: PolicyItem };
}

export async function getPolicies(params?: { type?: string }) {
  const response = await axiosClient.get<PolicyListResponse>("/policies", { params });
  return response.data.data.policies;
}

export async function getPolicyBySlug(slug: string) {
  const response = await axiosClient.get<PolicyDetailResponse>(`/policies/${slug}`);
  return response.data.data.policy;
}

export async function createPolicy(payload: {
  title: string;
  content: string;
  type: string;
  version?: string;
  isActive?: boolean;
}) {
  const response = await axiosClient.post<PolicyActionResponse>("/policies", payload);
  return response.data;
}

export async function updatePolicy(policyId: string, payload: Partial<{ title: string; content: string; type: string; version: string; isActive: boolean }>) {
  const response = await axiosClient.put<PolicyActionResponse>(`/policies/${policyId}`, payload);
  return response.data;
}

export async function deletePolicy(policyId: string) {
  const response = await axiosClient.delete<{ status: string; message: string }>(`/policies/${policyId}`);
  return response.data;
}
