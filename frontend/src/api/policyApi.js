import axios from "axios";
import axiosInstance from "./axiosInstance";

const publicAxios = axios.create({
  baseURL: axiosInstance.defaults.baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Policy API
 */

export const getAllPolicies = async (params = {}) => {
  const response = await axiosInstance.get("/policies", { params });
  return response.data;
};

// Public fetch for guest + customer screens (no auth interceptor coupling)
export const getPublicPolicies = async (params = {}) => {
  const response = await publicAxios.get("/policies", { params });
  return response.data;
};

export const getPolicyBySlug = async (slug) => {
  const response = await axiosInstance.get(
    `/policies/${encodeURIComponent(slug)}`,
  );
  return response.data;
};

export const getPublicPolicyBySlug = async (slug) => {
  const response = await publicAxios.get(
    `/policies/${encodeURIComponent(slug)}`,
  );
  return response.data;
};

export default {
  getAllPolicies,
  getPublicPolicies,
  getPolicyBySlug,
  getPublicPolicyBySlug,
};
