import axiosInstance from "./axiosInstance";

// Get current user's wallet info
export const getWallet = async () => {
  const response = await axiosInstance.get("/wallet");
  return response.data;
};

// Create a PayOS payment link to deposit money into wallet
export const depositToWallet = async ({ amount, note }) => {
  const response = await axiosInstance.post("/wallet/deposit", { amount, note });
  return response.data;
};

// Get and synchronize PayOS deposit status by orderCode
export const getPayOSDepositStatus = async (orderCode) => {
  const response = await axiosInstance.get(`/wallet/payos/status/${encodeURIComponent(orderCode)}`);
  return response.data;
};

// Get wallet transaction history
export const getWalletTransactions = async (params = {}) => {
  const response = await axiosInstance.get("/wallet/transactions", { params });
  return response.data;
};
