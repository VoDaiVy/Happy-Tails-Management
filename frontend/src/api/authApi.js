import axiosInstance from "./axiosInstance";

export const loginApi = async (email, password) => {
  const response = await axiosInstance.post("/auth/login", { email, password });
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await axiosInstance.post("/auth/register", userData);
  return response.data;
};

export const logoutApi = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};
