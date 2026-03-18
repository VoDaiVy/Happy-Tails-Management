import axiosInstance from "./axiosInstance";

export const extractAuthData = (responseData) => {
  const payload = responseData?.data || {};
  const tokens = payload.tokens || {};

  return {
    user: payload.user || null,
    accessToken: tokens.accessToken || payload.accessToken || null,
    refreshToken: tokens.refreshToken || payload.refreshToken || null,
    expiresIn: tokens.expiresIn || payload.expiresIn || null,
  };
};

export const loginApi = async (email, password) => {
  const response = await axiosInstance.post("/auth/login", { email, password });
  return response.data;
};

export const googleLoginApi = async (idToken, device = {}) => {
  const response = await axiosInstance.post("/auth/google", { idToken, device });
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await axiosInstance.post("/auth/register", userData);
  return response.data;
};

export const verifyEmailApi = async (email, otp) => {
  const response = await axiosInstance.post("/auth/verify-email", { email, otp });
  return response.data;
};

export const resendVerificationApi = async (email) => {
  const response = await axiosInstance.post("/auth/resend-verification", { email });
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await axiosInstance.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPasswordApi = async (resetToken, password, confirmPassword) => {
  const response = await axiosInstance.post(`/auth/reset-password/${resetToken}`, {
    password,
    confirmPassword,
  });
  return response.data;
};

export const logoutApi = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};
