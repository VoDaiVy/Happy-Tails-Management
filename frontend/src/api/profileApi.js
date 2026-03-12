import axiosInstance from "./axiosInstance";

// ==================== Profile APIs ====================

export const getMyProfile = async () => {
  const response = await axiosInstance.get("/profile/me");
  return response.data;
};

export const updateMyProfile = async (profileData) => {
  const response = await axiosInstance.put("/profile/me", profileData);
  return response.data;
};

export const updateAvatar = async (avatarUrl) => {
  const response = await axiosInstance.put("/profile/avatar", { avatar: avatarUrl });
  return response.data;
};

export const getProfileCompletion = async () => {
  const response = await axiosInstance.get("/profile/completion");
  return response.data;
};

export const deleteMyProfile = async () => {
  const response = await axiosInstance.delete("/profile/me");
  return response.data;
};

// ==================== Pet APIs ====================

export const getMyPets = async (params = {}) => {
  const response = await axiosInstance.get("/pets", { params });
  return response.data;
};

export const getPetById = async (petId) => {
  const response = await axiosInstance.get(`/pets/${petId}`);
  return response.data;
};

export const createPet = async (petData) => {
  const response = await axiosInstance.post("/pets", petData);
  return response.data;
};

export const updatePet = async (petId, petData) => {
  const response = await axiosInstance.put(`/pets/${petId}`, petData);
  return response.data;
};

export const deletePet = async (petId) => {
  const response = await axiosInstance.delete(`/pets/${petId}`);
  return response.data;
};

export const addMedicalRecord = async (petId, recordData) => {
  const response = await axiosInstance.post(`/pets/${petId}/medical-records`, recordData);
  return response.data;
};

export const addVaccination = async (petId, vaccinationData) => {
  const response = await axiosInstance.post(`/pets/${petId}/vaccinations`, vaccinationData);
  return response.data;
};

export const getVaccinationReminders = async (days = 30) => {
  const response = await axiosInstance.get("/pets/vaccination-reminders", { params: { days } });
  return response.data;
};

export const getPetStatistics = async () => {
  const response = await axiosInstance.get("/pets/statistics");
  return response.data;
};
