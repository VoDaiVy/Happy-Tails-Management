import { axiosClient } from "../axiosClient";
import type { CartEnvelope } from "../../types/cart";

export async function getCart() {
  const response = await axiosClient.get<CartEnvelope>("/cart");
  return response.data.data;
}

export async function addToCart(payload: { serviceId: string; quantity?: number; note?: string }) {
  const response = await axiosClient.post<CartEnvelope>("/cart/add", payload);
  return response.data.data;
}

export async function updateCartItem(itemId: string, quantity: number) {
  const response = await axiosClient.put<CartEnvelope>(`/cart/items/${itemId}`, { quantity });
  return response.data.data;
}

export async function removeCartItem(itemId: string) {
  const response = await axiosClient.delete<CartEnvelope>(`/cart/items/${itemId}`);
  return response.data.data;
}

export async function clearCart() {
  const response = await axiosClient.delete<CartEnvelope>("/cart");
  return response.data.data;
}
