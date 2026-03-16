import axios from "axios";
import { env } from "../config/env";
import { ApiError, extractApiMessage } from "../utils/apiError";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error?.response) {
      return Promise.reject(new ApiError("Khong the ket noi may chu. Vui long kiem tra mang.", undefined, true));
    }

    const statusCode = error.response.status as number;
    const backendMessage = extractApiMessage(error.response.data);
    const fallbackMessage = typeof error.message === "string" ? error.message : "Yeu cau that bai";

    return Promise.reject(new ApiError(backendMessage || fallbackMessage, statusCode));
  }
);
