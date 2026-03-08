import axiosInstance from "./axiosInstance";

// Profile APIs
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

// Pet APIs
export const getMyPets = async () => {
  const response = await axiosInstance.get("/pets");
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
