import axios from "axios";
import { env } from "../config/env";
import { ApiError, extractApiCode, extractApiDetails, extractApiMessage, mapBackendErrorMessage } from "../utils/apiError";

let accessToken: string | null = null;
let refreshTokenValue: string | null = null;
let onAuthInvalid: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshToken(token: string | null) {
  refreshTokenValue = token;
}

export function getRefreshToken() {
  return refreshTokenValue;
}

export function setAuthInvalidHandler(handler: (() => void) | null) {
  onAuthInvalid = handler;
}

export const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/refresh-token",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
];

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function requestTokenRefresh(): Promise<string | null> {
  if (!refreshTokenValue) {
    return null;
  }

  try {
    const response = await axios.post<{
      success: boolean;
      data?: {
        accessToken: string;
        refreshToken?: string;
      };
    }>(`${env.apiBaseUrl}/auth/refresh-token`, {
      refreshToken: refreshTokenValue,
    });

    const nextAccessToken = response.data?.data?.accessToken;
    if (!nextAccessToken) {
      return null;
    }

    setAccessToken(nextAccessToken);
    if (response.data?.data?.refreshToken) {
      setRefreshToken(response.data.data.refreshToken);
    }

    return nextAccessToken;
  } catch {
    return null;
  }
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error?.response) {
      return Promise.reject(new ApiError("Khong the ket noi may chu. Vui long kiem tra mang.", undefined, true, "NETWORK_ERROR"));
    }

    const statusCode = error.response.status as number;
    const originalRequest = error.config as { _retry?: boolean; url?: string; headers?: Record<string, string> };
    const requestUrl = originalRequest?.url || "";
    const isRefreshRequest = requestUrl.includes("/auth/refresh-token");
    const isPublicAuth = isPublicAuthRequest(requestUrl);

    if (statusCode === 401 && !originalRequest?._retry && !isRefreshRequest && !isPublicAuth) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = requestTokenRefresh();
      }

      const newAccessToken = await refreshPromise;
      refreshPromise = null;

      if (newAccessToken) {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        };
        return axiosClient(originalRequest);
      }

      setAccessToken(null);
      setRefreshToken(null);
      onAuthInvalid?.();
      return Promise.reject(new ApiError("Phien dang nhap da het han. Vui long dang nhap lai.", 401, false, "TOKEN_EXPIRED"));
    }

    const backendCode = extractApiCode(error.response.data);
    const backendDetails = extractApiDetails(error.response.data);
    const backendMessage = extractApiMessage(error.response.data);
    const fallbackMessage = typeof error.message === "string" ? error.message : "Yeu cau that bai";
    const finalMessage = mapBackendErrorMessage({
      code: backendCode,
      statusCode,
      fallback: backendMessage || fallbackMessage,
    });

    return Promise.reject(new ApiError(finalMessage, statusCode, false, backendCode || undefined, backendDetails));
  }
);
