import axiosInstance from "./axiosInstance";

/**
 * News API - Dashboard + public news integration
 */

export const getAllNews = async (params = {}) => {
  const response = await axiosInstance.get("/news", { params });
  return response.data;
};

export const getNewsBySlug = async (slug) => {
  const response = await axiosInstance.get(`/news/${encodeURIComponent(slug)}`);
  return response.data;
};

export const uploadNewsImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await axiosInstance.post("/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const createNews = async (payload) => {
  const response = await axiosInstance.post("/news", payload);
  return response.data;
};

export const updateNews = async (id, payload) => {
  const response = await axiosInstance.put(`/news/${id}`, payload);
  return response.data;
};

export const deleteNews = async (id) => {
  const response = await axiosInstance.delete(`/news/${id}`);
  return response.data;
};

export default {
  getAllNews,
  getNewsBySlug,
  uploadNewsImage,
  createNews,
  updateNews,
  deleteNews,
};
