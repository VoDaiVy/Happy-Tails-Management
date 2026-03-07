/**
 * Cart Routes
 * Shopping cart operations with Joi validation
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

// All cart routes require authentication and customer role
router.use(protect);
router.use(restrictTo('customer'));

// Cart routes
router.route('/')
  .get(getCart)              // GET /api/cart - Get my cart
  .delete(clearCart);        // DELETE /api/cart - Clear cart

router.post('/add', validate(addToCartSchema), addToCart);  // POST /api/cart/add - Add item to cart
router.post('/checkout', validate(checkoutSchema), checkout); // POST /api/cart/checkout - Checkout

router.route('/items/:itemId')
  .put(validateParams(itemIdParamSchema), validate(updateCartItemSchema), updateCartItem)      // PUT /api/cart/items/:itemId - Update cart item
  .delete(validateParams(itemIdParamSchema), removeCartItem);  // DELETE /api/cart/items/:itemId - Remove item from cart

module.exports = router;
