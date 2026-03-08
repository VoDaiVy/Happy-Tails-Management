import axiosInstance from "./axiosInstance";

/**
 * Medical Record API
 * Admin/Staff only - view medical records
 */

// Get all medical records (Admin/Staff)
export const getAllMedicalRecords = async (params = {}) => {
  const response = await axiosInstance.get("/medical-records", { params });
  return response;
};

// Get medical record by ID
export const getMedicalRecordById = async (id) => {
  const response = await axiosInstance.get(`/medical-records/${id}`);
  return response;
};
