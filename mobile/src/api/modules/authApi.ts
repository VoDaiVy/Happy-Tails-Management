import { axiosClient, setAccessToken } from "../axiosClient";
import type { AuthUser, LoginResponseData } from "../../types/auth";

interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface RegisterApiResponse {
  success: boolean;
  message: string;
  data?: LoginResponseData;
}

interface LoginApiResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
}

interface MeApiResponse {
  success: boolean;
  data: {
    user: AuthUser;
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponseData> {
  const response = await axiosClient.post<LoginApiResponse>("/auth/login", payload);
  const authData = response.data.data;
  setAccessToken(authData.tokens.accessToken);
  return authData;
}

export async function register(payload: RegisterPayload) {
  const response = await axiosClient.post<RegisterApiResponse>("/auth/register", payload);
  return response.data;
}

export async function getMe(): Promise<AuthUser> {
  const response = await axiosClient.get<MeApiResponse>("/auth/me");
  return response.data.data.user;
}

export async function logout() {
  try {
    await axiosClient.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

export async function verifyEmail(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  const response = await axiosClient.post("/auth/verify-email", { email, otp });
  return response.data;
}

export async function resendVerification(email: string) {
  const response = await axiosClient.post("/auth/resend-verification", { email });
  return response.data;
}
