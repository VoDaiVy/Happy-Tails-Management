/**
 * Cart Controller
 * Handles shopping cart operations for customers
 */

const Cart = require('../models/Cart');
const Service = require('../models/Service');
const UserPet = require('../models/UserPet');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get my cart
 * @route GET /api/cart
 * @access Private (Customer)
 */
exports.getMyCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ userID: req.user.id })
    .populate('items.service')
    .populate('items.pet');

  if (!cart) {
    cart = await Cart.create({ userID: req.user.id, items: [] });
  }

  res.status(200).json({
    status: 'success',
    data: { cart }
  });
});

/**
 * Add item to cart
 * @route POST /api/cart/items
 * @access Private (Customer)
 */
exports.addToCart = catchAsync(async (req, res, next) => {
  const { serviceId, petId, quantity = 1, notes } = req.body;

  // Validate service exists
  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) {
    return next(new AppError('Service not found or inactive', 404, 'SERVICE_NOT_FOUND'));
  }

  // Validate pet belongs to user
  const pet = await UserPet.findOne({ _id: petId, userID: req.user.id, isActive: true });
  if (!pet) {
    return next(new AppError('Pet not found or does not belong to you', 404, 'PET_NOT_FOUND'));
  }

  // Find or create cart
  let cart = await Cart.findOne({ userID: req.user.id });
  if (!cart) {
    cart = await Cart.create({ userID: req.user.id, items: [] });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.service.toString() === serviceId && item.pet.toString() === petId
  );

  if (existingItemIndex > -1) {
    // Update quantity
    cart.items[existingItemIndex].quantity += quantity;
    cart.items[existingItemIndex].notes = notes || cart.items[existingItemIndex].notes;
  } else {
    // Add new item
    cart.items.push({
      service: serviceId,
      pet: petId,
      quantity,
      price: service.price,
      notes
    });
  }

  await cart.save();
  await cart.populate('items.service items.pet');

  res.status(200).json({
    status: 'success',
    message: 'Item added to cart',
    data: { cart }
  });
});

/**
 * Update cart item
 * @route PUT /api/cart/items/:itemId
 * @access Private (Customer)
 */
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity, notes } = req.body;

  const cart = await Cart.findOne({ userID: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404, 'CART_NOT_FOUND'));
  }

  const item = cart.items.id(itemId);
  if (!item) {
    return next(new AppError('Item not found in cart', 404, 'ITEM_NOT_FOUND'));
  }

  if (quantity !== undefined) {
    if (quantity < 1) {
      return next(new AppError('Quantity must be at least 1', 400, 'INVALID_QUANTITY'));
    }
    item.quantity = quantity;
  }

  if (notes !== undefined) {
    item.notes = notes;
  }

  await cart.save();
  await cart.populate('items.service items.pet');

  res.status(200).json({
    status: 'success',
    message: 'Cart item updated',
    data: { cart }
  });
});

/**
 * Remove item from cart
 * @route DELETE /api/cart/items/:itemId
 * @access Private (Customer)
 */
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ userID: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404, 'CART_NOT_FOUND'));
  }

  cart.items.pull(itemId);
  await cart.save();
  await cart.populate('items.service items.pet');

  res.status(200).json({
    status: 'success',
    message: 'Item removed from cart',
    data: { cart }
  });
});

/**
 * Clear cart
 * @route DELETE /api/cart
 * @access Private (Customer)
 */
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ userID: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404, 'CART_NOT_FOUND'));
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    status: 'success',
    message: 'Cart cleared',
    data: { cart }
  });
});
