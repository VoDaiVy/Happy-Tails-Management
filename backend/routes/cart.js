/**
 * Cart Routes
 * Shopping cart operations for customers
 */

const express = require('express');
const {
  getMyCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All cart routes require authentication and customer role
router.use(protect);
router.use(restrictTo('customer'));

// Cart routes
router.route('/')
  .get(getMyCart)           // GET /api/cart - Get my cart
  .delete(clearCart);       // DELETE /api/cart - Clear cart

router.post('/items', addToCart);  // POST /api/cart/items - Add item to cart

router.route('/items/:itemId')
  .put(updateCartItem)      // PUT /api/cart/items/:itemId - Update cart item
  .delete(removeFromCart);  // DELETE /api/cart/items/:itemId - Remove item from cart

module.exports = router;
