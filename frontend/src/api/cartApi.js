import axiosInstance from "./axiosInstance";

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
  return res.data.data;
};

export const addToCartApi = async ({ serviceId, quantity = 1, note = "" }) => {
  const res = await axiosInstance.post("/cart/add", {
    serviceId,
    quantity,
    note,
  });
  return res.data.data;
};

export const updateCartItemApi = async (itemId, quantity) => {
  const res = await axiosInstance.put(`/cart/items/${itemId}`, { quantity });
  return res.data.data;
};

export const removeCartItemApi = async (itemId) => {
  const res = await axiosInstance.delete(`/cart/items/${itemId}`);
  return res.data.data;
};

export const clearCartApi = async () => {
  const res = await axiosInstance.delete("/cart");
  return res.data.data;
};

export const checkoutCartApi = async (data = {}) => {
  const res = await axiosInstance.post("/cart/checkout", data);
  return res.data.data;
};
