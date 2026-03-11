import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Pet API - Manage user's pets
 * All endpoints are user-scoped (only their own pets)
 */

// Get all my pets with filters and pagination
export const getMyPets = async (params = {}) => {
  const response = await axiosInstance.get("/pets", { params });
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.pets || normalized.data || [],
    pagination: normalized.data?.pagination || normalized.pagination,
    stats: normalized.data?.stats,
  };
};

// Get single pet by ID
export const getMyPetById = async (id) => {
  const response = await axiosInstance.get(`/pets/${id}`);
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data?.pet || normalized.data,
  };
};

// Create new pet
export const createPet = async (petData) => {
  const response = await axiosInstance.post("/pets", petData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create pet');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.pet || normalized.data,
    message: normalized.message,
  };
};

// Update pet
export const updatePet = async (id, petData) => {
  const response = await axiosInstance.put(`/pets/${id}`, petData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update pet');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.pet || normalized.data,
    message: normalized.message,
  };
};

// Delete pet
export const deletePet = async (id) => {
  const response = await axiosInstance.delete(`/pets/${id}`);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to delete pet');
    error.response = { data: normalized };
    throw error;
  }
  return {
    message: normalized.message,
  };
};

// Quick create pet (Staff only)
export const quickCreatePet = async (petData) => {
  const response = await axiosInstance.post("/pets/staff/quick-create", petData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to create pet');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data?.pet || normalized.data,
    message: normalized.message,
  };
};

// Get pet statistics
export const getPetStatistics = async () => {
  const response = await axiosInstance.get("/pets/statistics");
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// Get vaccination reminders
export const getVaccinationReminders = async () => {
  const response = await axiosInstance.get("/pets/vaccination-reminders");
  const normalized = normalizeResponse(response);
  return {
    data: normalized.data,
  };
};

// Add medical record to pet
export const addMedicalRecord = async (petId, recordData) => {
  const response = await axiosInstance.post(`/pets/${petId}/medical-records`, recordData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to add medical record');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

// Add vaccination to pet
export const addVaccination = async (petId, vaccinationData) => {
  const response = await axiosInstance.post(`/pets/${petId}/vaccinations`, vaccinationData);
  const normalized = normalizeResponse(response);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to add vaccination');
    error.response = { data: normalized };
    throw error;
  }
  return {
    data: normalized.data,
    message: normalized.message,
  };
};

export default {
  getMyPets,
  getMyPetById,
  createPet,
  updatePet,
  deletePet,
  quickCreatePet,
  getPetStatistics,
  getVaccinationReminders,
  addMedicalRecord,
  addVaccination,
};
