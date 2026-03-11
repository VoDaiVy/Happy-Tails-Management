import axiosInstance from "./axiosInstance";
import { normalizeResponse } from "../utils/apiResponseHandler";

/**
 * Cart API — mirrors backend routes:
 *  GET    /api/cart
 *  POST   /api/cart/add
 *  PUT    /api/cart/items/:itemId
 *  DELETE /api/cart/items/:itemId
 *  DELETE /api/cart
 *  POST   /api/cart/checkout
 */

export const fetchCartApi = async () => {
  const res = await axiosInstance.get("/cart");
  const normalized = normalizeResponse(res);
  return normalized.data?.items || normalized.data;
};

export const addToCartApi = async ({ serviceId, quantity = 1, note = "" }) => {
  const res = await axiosInstance.post("/cart/add", {
    serviceId,
    quantity,
    note,
  });
  const normalized = normalizeResponse(res);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to add to cart');
    error.response = { data: normalized };
    throw error;
  }
  return normalized.data?.item || normalized.data;
};

export const updateCartItemApi = async (itemId, quantity) => {
  const res = await axiosInstance.put(`/cart/items/${itemId}`, { quantity });
  const normalized = normalizeResponse(res);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to update cart item');
    error.response = { data: normalized };
    throw error;
  }
  return normalized.data?.item || normalized.data;
};

export const removeCartItemApi = async (itemId) => {
  const res = await axiosInstance.delete(`/cart/items/${itemId}`);
  const normalized = normalizeResponse(res);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to remove cart item');
    error.response = { data: normalized };
    throw error;
  }
  return normalized.data?.item || normalized.data;
};

export const clearCartApi = async () => {
  const res = await axiosInstance.delete("/cart");
  const normalized = normalizeResponse(res);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to clear cart');
    error.response = { data: normalized };
    throw error;
  }
  return normalized.data;
};

export const checkoutCartApi = async (data = {}) => {
  const res = await axiosInstance.post("/cart/checkout", data);
  const normalized = normalizeResponse(res);
  if (!normalized.success) {
    const error = new Error(normalized.message || 'Failed to checkout');
    error.response = { data: normalized };
    throw error;
  }
  return normalized.data;
};
