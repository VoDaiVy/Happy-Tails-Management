export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface HealthResponse {
  success: boolean;
  message: string;
  environment?: string;
  uptime?: number;
}
