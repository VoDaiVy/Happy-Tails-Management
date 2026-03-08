import { create } from "zustand";
import {
  fetchCartApi,
  addToCartApi,
  updateCartItemApi,
  removeCartItemApi,
  clearCartApi,
  checkoutCartApi,
} from "../api/cartApi";

/**
 * Global cart store (Zustand)
 *
 * Shape of `cart` from the API:
 *  { _id, userId, items[], totalPrice, totalItems, createdAt, updatedAt }
 *
 * Each item:
 *  { _id, serviceId, name, price, duration, imageUrl, quantity, subtotal, note }
 */
const useCartStore = create((set, get) => ({
  /* ─── state ─────────────────────────────── */
  cart: null, // full cart object from API
  isDrawerOpen: false,
  isLoading: false,
  error: null,

  /* ─── computed helpers ───────────────────── */
  getItemCount: () => get().cart?.totalItems ?? 0,
  getItems: () => get().cart?.items ?? [],
  getSubtotal: () => get().cart?.totalPrice ?? 0,

  /* ─── drawer ─────────────────────────────── */
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),

  /* ─── fetch cart ─────────────────────────── */
  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await fetchCartApi();
      set({ cart, isLoading: false });
    } catch (err) {
      // 401 = not logged in – silently reset cart
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        set({ cart: null, isLoading: false });
      } else {
        set({
          error: err?.response?.data?.message ?? "Failed to fetch cart",
          isLoading: false,
        });
      }
    }
  },

  /* ─── add item ───────────────────────────── */
  addItem: async ({ serviceId, quantity = 1, note = "" }) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await addToCartApi({ serviceId, quantity, note });
      set({ cart, isLoading: false, isDrawerOpen: true });
      return { success: true };
    } catch (err) {
      const message = err?.response?.data?.message ?? "Failed to add item";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  /* ─── update quantity ────────────────────── */
  updateQuantity: async (itemId, quantity) => {
    if (quantity < 1) {
      return get().removeItem(itemId);
    }
    set({ isLoading: true, error: null });
    try {
      const cart = await updateCartItemApi(itemId, quantity);
      set({ cart, isLoading: false });
    } catch (err) {
      set({
        error: err?.response?.data?.message ?? "Failed to update quantity",
        isLoading: false,
      });
    }
  },

  /* ─── remove item ────────────────────────── */
  removeItem: async (itemId) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await removeCartItemApi(itemId);
      set({ cart, isLoading: false });
    } catch (err) {
      set({
        error: err?.response?.data?.message ?? "Failed to remove item",
        isLoading: false,
      });
    }
  },

  /* ─── clear cart ─────────────────────────── */
  clearCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await clearCartApi();
      set({ cart, isLoading: false });
    } catch (err) {
      set({
        error: err?.response?.data?.message ?? "Failed to clear cart",
        isLoading: false,
      });
    }
  },

  /* ─── checkout ─────────────────────────────*/
  checkout: async (data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await checkoutCartApi(data);
      // After checkout the cart is emptied — refetch
      await get().fetchCart();
      set({ isLoading: false, isDrawerOpen: false });
      return { success: true, data: result };
    } catch (err) {
      const message = err?.response?.data?.message ?? "Checkout failed";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  /* ─── reset local state (on logout) ────────*/
  resetCart: () =>
    set({ cart: null, isDrawerOpen: false, isLoading: false, error: null }),
}));

export default useCartStore;
