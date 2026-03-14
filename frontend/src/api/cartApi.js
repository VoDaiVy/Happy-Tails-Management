import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

const normalizeCartPayload = (response) => {
  const normalized = normalizeResponse(response);
  const data = normalized.data || {};
  const summary = {
    serviceSubtotal: Number(data.serviceSubtotal || 0),
    staySubtotal: Number(data.staySubtotal || 0),
    serviceDurationTotal: Number(data.serviceDurationTotal || 0),
    stayDurationTotal: Number(data.stayDurationTotal || 0),
    grandTotal: Number(data.grandTotal || data.totalPrice || 0),
    totalItems: Number(data.totalItems || 0),
  };

  return {
    success: normalized.success,
    message: normalized.message,
    data: {
      ...data,
      items: Array.isArray(data.items) ? data.items : [],
      summary,
    },
  };
};

export const getCart = async () => {
  const response = await axiosInstance.get("/cart");
  return normalizeCartPayload(response);
};

export const addServiceToCart = async ({ serviceId, quantity = 1, note = "", metadata = {} }) => {
  const response = await axiosInstance.post("/cart/add", {
    type: "service",
    serviceId,
    quantity,
    note,
    metadata,
  });
  return normalizeCartPayload(response);
};

export const addStayToCart = async ({ roomId, checkInDate, checkOutDate, nights, note = "", metadata = {} }) => {
  const response = await axiosInstance.post("/cart/add", {
    type: "stay",
    roomId,
    checkInDate,
    checkOutDate,
    nights,
    note,
    metadata,
  });
  return normalizeCartPayload(response);
};

export const updateCartItem = async (itemId, quantity) => {
  const response = await axiosInstance.put(`/cart/items/${itemId}`, { quantity });
  return normalizeCartPayload(response);
};

export const removeCartItem = async (itemId) => {
  const response = await axiosInstance.delete(`/cart/items/${itemId}`);
  return normalizeCartPayload(response);
};

export const clearCart = async () => {
  const response = await axiosInstance.delete("/cart");
  return normalizeCartPayload(response);
};

export default {
  getCart,
  addServiceToCart,
  addStayToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
