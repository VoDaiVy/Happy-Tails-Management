import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Medical Record API
 * Admin/Staff only - view medical records
 */

// Get all medical records (Admin/Staff)
export const getAllMedicalRecords = async (params = {}) => {
  const response = await axiosInstance.get("/medical-records", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.records || normalized.data || [],
    pagination: normalized.data?.pagination || normalized.pagination,
  };
};

// Get medical record by ID
export const getMedicalRecordById = async (id) => {
  const response = await axiosInstance.get(`/medical-records/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.record || normalized.data,
  };
};
