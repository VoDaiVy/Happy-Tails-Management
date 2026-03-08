import axiosInstance from "./axiosInstance";

export const getMyBookings = async (status) => {
  const params = {};
  if (status && status !== "all") params.status = status;
  const response = await axiosInstance.get("/bookings/my", { params });
  return response.data;
};

export const getMyPetsMedicalRecords = async () => {
  const response = await axiosInstance.get("/medical-records/my-pets");
  return response.data;
};

export const getMedicalRecordById = async (id) => {
  const response = await axiosInstance.get(`/medical-records/${encodeURIComponent(id)}`);
  return response.data;
};
