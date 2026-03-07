/**
 * Cart Controller
 * Handles shopping cart HTTP operations
 * 
 * ⚠️ CHECKOUT: Wallet-only payment method
 * ❌ REMOVED: PayOS webhook/return/cancel handlers
 */

const cartService = require('../services/cart.service');
const { catchAsync } = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get current user's cart
 * @route GET /api/cart
 * @access Private (Customer)
 */
const getCart = catchAsync(async (req, res) => {
  const cart = await cartService.getCart(req.user._id);
  
  res.status(200).json(ApiResponse.success('Cart fetched successfully', cart));
});

/**
 * Add item to cart
 * @route POST /api/cart/add
 * @access Private (Customer)
 */
const addToCart = catchAsync(async (req, res) => {
  const cart = await cartService.addToCart(req.user._id, req.body);
  
  res.status(200).json(ApiResponse.success('Item added to cart', cart));
});

/**
 * Update cart item quantity
 * @route PUT /api/cart/items/:itemId
 * @access Private (Customer)
 */
const updateCartItem = catchAsync(async (req, res) => {
  const cart = await cartService.updateCartItem(
    req.user._id,
    req.params.itemId,
    req.body
  );
  
  res.status(200).json(ApiResponse.success('Cart item updated', cart));
});

/**
 * Remove item from cart
 * @route DELETE /api/cart/items/:itemId
 * @access Private (Customer)
 */
const removeCartItem = catchAsync(async (req, res) => {
  const cart = await cartService.removeCartItem(req.user._id, req.params.itemId);
  
  res.status(200).json(ApiResponse.success('Item removed from cart', cart));
});

/**
 * Clear entire cart
 * @route DELETE /api/cart
 * @access Private (Customer)
 */
const clearCart = catchAsync(async (req, res) => {
  const cart = await cartService.clearCart(req.user._id);
  
  res.status(200).json(ApiResponse.success('Cart cleared', cart));
});

/**
 * Checkout cart and create order
 * Payment: Wallet only
 * @route POST /api/cart/checkout
 * @access Private (Customer)
 */
const checkout = catchAsync(async (req, res) => {
  const result = await cartService.checkout(req.user._id, req.user, req.body);
  
  res.status(201).json(ApiResponse.success('Đặt hàng thành công', result));
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  checkout
};
