import { axiosClient } from "../axiosClient";
import type { HealthResponse } from "../../types/api";

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await axiosClient.get<HealthResponse>("/health");
  return response.data;
}
