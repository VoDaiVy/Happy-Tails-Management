import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Upload a single image to Cloudinary through backend.
 */
export const uploadSingleImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await axiosInstance.post("/uploads/image", formData);
    const normalized = normalizeResponse(response);

    console.log("Single upload response:", normalized);

    if (!normalized.success) {
      throw new Error(normalized.message || "Failed to upload image");
    }

    const url = normalized.data?.url || "";
    console.log("Single image URL:", url);
    
    return url;
  } catch (err) {
    console.error("Single upload failed:", err);
    throw err;
  }
};

/**
 * Upload multiple images to Cloudinary through backend.
 */
export const uploadMultipleImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  try {
    console.log("Uploading", files.length, "files");
    const response = await axiosInstance.post("/uploads/images", formData);
    const normalized = normalizeResponse(response);

    console.log("Upload response:", normalized);
    console.log("Upload data:", normalized.data);

    if (!normalized.success) {
      throw new Error(normalized.message || "Failed to upload images");
    }

    const urls = (normalized.data?.files || []).map((file) => file.url).filter(Boolean);
    console.log("Extracted URLs:", urls);
    
    return urls;
  } catch (err) {
    console.error("Batch upload failed:", err);
    throw err;
  }
};

export default {
  uploadSingleImage,
  uploadMultipleImages,
};
