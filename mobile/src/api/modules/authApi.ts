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

interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: string;
  };
}

interface BasicMessageResponse {
  success: boolean;
  message: string;
}

interface ForgotPasswordResponse extends BasicMessageResponse {
  devOnly?: {
    resetToken: string;
    resetUrl?: string;
    expiresIn?: string;
  };
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
}

interface GoogleLoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresIn?: string;
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

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const response = await axiosClient.post<ForgotPasswordResponse>("/auth/forgot-password", { email });
  return response.data;
}

export async function resetPassword(resetToken: string, password: string): Promise<BasicMessageResponse> {
  const response = await axiosClient.post<BasicMessageResponse>(`/auth/reset-password/${resetToken}`, { password });
  return response.data;
}

export async function refreshToken(refreshTokenValue: string): Promise<RefreshTokenResponse["data"]> {
  const response = await axiosClient.post<RefreshTokenResponse>("/auth/refresh-token", {
    refreshToken: refreshTokenValue,
  });
  return response.data.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
  const response = await axiosClient.put<ChangePasswordResponse>("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
}

export async function loginWithGoogle(idToken: string, device?: { platform?: "web" | "ios" | "android"; name?: string }) {
  const response = await axiosClient.post<GoogleLoginResponse>("/auth/google", {
    idToken,
    device,
  });

  const authData = response.data.data;
  setAccessToken(authData.accessToken);

  return {
    user: authData.user,
    tokens: {
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      expiresIn: authData.expiresIn,
    },
  };
}
