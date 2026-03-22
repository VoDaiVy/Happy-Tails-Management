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

// Get current customer's pets medical records
export const getMyPetsMedicalRecords = async (params = {}) => {
  const response = await axiosInstance.get("/medical-records/my-pets", {
    params,
  });
  return response;
};

// Get medical record by ID
export const getMedicalRecordById = async (id) => {
  const response = await axiosInstance.get(`/medical-records/${id}`);
  return response;
};

// Create medical record (Staff/Admin)
export const createMedicalRecord = async (payload) => {
  const response = await axiosInstance.post("/medical-records", payload);
  return response;
};

// Update medical record (Staff/Admin)
export const updateMedicalRecord = async (id, payload) => {
  const response = await axiosInstance.put(`/medical-records/${id}`, payload);
  return response;
};

// Update workflow stage + stage photos (Staff/Admin)
export const updateMedicalRecordStage = async (id, payload) => {
  const response = await axiosInstance.patch(
    `/medical-records/${id}/stage`,
    payload,
  );
  return response;
};
