/**
 * Cart Routes
 * Shopping cart operations with Joi validation
 * 
 * ⚠️ CHECKOUT: Wallet-only payment method
 * ❌ REMOVED: PayOS webhook/return/cancel routes (not needed for wallet-only checkout)
 */

const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  checkout
} = require('../controllers/cartController');

const { protect, restrictTo } = require('../middleware/auth');
const { validate, validateParams } = require('../middleware/validate');
const {
  addToCartSchema,
  updateCartItemSchema,
  checkoutSchema,
  itemIdParamSchema
} = require('../validations/cart.validation');

const router = express.Router();

// ==================== PROTECTED ROUTES ====================
// All routes require authentication and customer role
router.use(protect);
router.use(restrictTo('customer'));

// Cart routes
router.route('/')
  .get(getCart)              // GET /api/cart - Get my cart
  .delete(clearCart);        // DELETE /api/cart - Clear cart

router.post('/add', validate(addToCartSchema), addToCart);  // POST /api/cart/add - Add item to cart

/**
 * POST /api/cart/checkout
 * Checkout cart - Payment via Wallet only
 * @body { note?: string, scheduledAt?: ISO date string }
 */
router.post('/checkout', validate(checkoutSchema), checkout);

router.route('/items/:itemId')
  .put(validateParams(itemIdParamSchema), validate(updateCartItemSchema), updateCartItem)
  .delete(validateParams(itemIdParamSchema), removeCartItem);

module.exports = router;
