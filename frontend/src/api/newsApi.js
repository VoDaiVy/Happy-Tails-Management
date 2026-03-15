import axiosInstance from "./axiosInstance";
import { extractResponseData, normalizeResponse } from "../utils/apiResponseHandler";

export const getAllNews = async (params = {}) => {
  const response = await axiosInstance.get("/news", { params });
  const normalized = normalizeResponse(response);

  return {
    ...normalized,
    data: extractResponseData(normalized, "news") || [],
  };
};

export const createNews = async (newsData) => {
  const response = await axiosInstance.post("/news", newsData);
  const normalized = normalizeResponse(response);

  return {
    ...normalized,
    data: extractResponseData(normalized, "news"),
  };
};

export const updateNews = async (id, newsData) => {
  const response = await axiosInstance.put(`/news/${id}`, newsData);
  const normalized = normalizeResponse(response);

  return {
    ...normalized,
    data: extractResponseData(normalized, "news"),
  };
};

export const deleteNews = async (id) => {
  const response = await axiosInstance.delete(`/news/${id}`);
  return normalizeResponse(response);
};

export default {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
};