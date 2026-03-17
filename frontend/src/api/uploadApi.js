import axiosInstance from "./axiosInstance";
import { extractResponseData, normalizeResponse } from "../utils/apiResponseHandler";

export const uploadSingleImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await axiosInstance.post("/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const normalized = normalizeResponse(response);
  const data = extractResponseData(normalized);

  return data?.url || "";
};

export const uploadMultipleImages = async (files) => {
  const formData = new FormData();

  Array.from(files || []).forEach((file) => {
    formData.append("images", file);
  });

  const response = await axiosInstance.post("/uploads/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const normalized = normalizeResponse(response);
  const data = extractResponseData(normalized);

  return data?.files || [];
};

export default {
  uploadSingleImage,
  uploadMultipleImages,
};