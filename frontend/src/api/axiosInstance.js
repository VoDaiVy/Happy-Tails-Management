import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth endpoints that should NOT trigger token refresh on 401
const AUTH_ENDPOINTS = ["/auth/login", "/auth/google", "/auth/register", "/auth/refresh-token"];

// Request interceptor - attach access token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for auth endpoints (login, register, refresh-token)
    const isAuthEndpoint = AUTH_ENDPOINTS.some((url) =>
      originalRequest.url?.includes(url)
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;
      console.log('🔄 Token expired, attempting refresh...');

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data.tokens.accessToken;
        console.log('✅ Token refreshed successfully');
        localStorage.setItem("accessToken", newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry the original request with new token
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('❌ Refresh token failed:', {
          status: refreshError.response?.status,
          message: refreshError.response?.data?.message
        });
        
        // Only logout if refresh token is truly invalid (401/403)
        if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
          console.log('🚪 Logging out due to invalid refresh token');
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
