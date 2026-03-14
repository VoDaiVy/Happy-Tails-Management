import axiosInstance from "./axiosInstance";

export const getMyPets = async (params = {}) => {
  const response = await axiosInstance.get("/pets", { params });
  return response.data;
};

export const getMyPetById = async (id) => {
  const response = await axiosInstance.get(`/pets/${id}`);
  return response.data;
};
