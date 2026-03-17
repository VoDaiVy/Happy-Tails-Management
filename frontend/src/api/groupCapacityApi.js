import axiosInstance from "./axiosInstance";

export const getGroupCapacities = async () => {
  const response = await axiosInstance.get("/admin/group-capacity");
  return response.data;
};

export const getGroupCapacityByGroup = async (group) => {
  const response = await axiosInstance.get(`/admin/group-capacity/${group}`);
  return response.data;
};

export const updateGroupCapacity = async (group, data) => {
  const response = await axiosInstance.put(`/admin/group-capacity/${group}`, data);
  return response.data;
};

export const initGroupCapacities = async () => {
  const response = await axiosInstance.post("/admin/group-capacity/init");
  return response.data;
};
