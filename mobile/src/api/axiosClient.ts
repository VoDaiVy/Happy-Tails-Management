import axios from "axios";
import { env } from "../config/env";
import { ApiError, extractApiCode, extractApiDetails, extractApiMessage, mapBackendErrorMessage } from "../utils/apiError";

let accessToken: string | null = null;
let refreshTokenValue: string | null = null;
let onAuthInvalid: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

const FALLBACK_API_BASE_URLS = [
  env.apiBaseUrl,
  "http://10.0.2.2:3001/api",
  "http://localhost:3001/api",
  "http://127.0.0.1:3001/api",
].filter((value, index, list) => value && list.indexOf(value) === index);

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

function shouldSkipRefreshForRequest(requestUrl: string) {
  const publicAuthPaths = [
    "/auth/login",
    "/auth/register",
    "/auth/google",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/auth/resend-verification",
  ];

  return publicAuthPaths.some((path) => requestUrl.includes(path));
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
    const response = await axiosClient.post<{
      success: boolean;
      data?: {
        accessToken: string;
        refreshToken?: string;
      };
    }>("/auth/refresh-token", {
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
      const originalRequest = error?.config as {
        _triedBaseUrls?: string[];
        baseURL?: string;
      };
      const requestBaseUrl = originalRequest?.baseURL || env.apiBaseUrl;
      const triedBaseUrls = originalRequest?._triedBaseUrls || [requestBaseUrl];
      const nextFallback = FALLBACK_API_BASE_URLS.find((candidate) => !triedBaseUrls.includes(candidate));

      if (originalRequest && nextFallback) {
        originalRequest._triedBaseUrls = [...triedBaseUrls, nextFallback];
        originalRequest.baseURL = nextFallback;
        return axiosClient(originalRequest);
      }

      const fallbackMessage = typeof error?.message === "string" ? error.message : "";
      const isTimeout = error?.code === "ECONNABORTED" || fallbackMessage.toLowerCase().includes("timeout");
      const finalMessage = isTimeout
        ? mapBackendErrorMessage({ statusCode: 503, fallback: fallbackMessage })
        : "Khong the ket noi may chu. Vui long kiem tra mang.";

      return Promise.reject(new ApiError(finalMessage, isTimeout ? 503 : undefined, true, isTimeout ? "SERVER_TEMP_UNAVAILABLE" : "NETWORK_ERROR"));
    }

    const statusCode = error.response.status as number;
    const originalRequest = error.config as { _retry?: boolean; url?: string; headers?: Record<string, string> };
    const requestUrl = originalRequest?.url || "";
    const isRefreshRequest = requestUrl.includes("/auth/refresh-token");
    const skipRefresh = shouldSkipRefreshForRequest(requestUrl);

    if (statusCode === 401 && !originalRequest?._retry && !isRefreshRequest && !skipRefresh) {
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
