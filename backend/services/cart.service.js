/**
 * Cart Service
 * Business logic for cart operations
 */

const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Service = require('../models/Service');
const { createError } = require('../utils/AppError');

/**
 * Get user's cart (create if not exists)
 * @param {string} userId - User's ID
 * @returns {Promise<Cart>} Cart document with populated items
 */
const getCart = async (userId) => {
  let cart = await Cart.findByUser(userId);
  
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  
  return cart;
};

/**
 * Add item to cart
 * @param {string} userId - User's ID
 * @param {Object} data - Item data
 * @param {string} data.serviceId - Service ID to add
 * @param {number} [data.quantity=1] - Quantity to add
 * @param {string} [data.note=''] - Optional note
 * @returns {Promise<Cart>} Updated cart
 */
const addToCart = async (userId, { serviceId, quantity = 1, note = '' }) => {
  // Step 1: Validate service
  const service = await Service.findById(serviceId);
  
  if (!service) {
    throw createError.notFound('Service not found');
  }
  
  if (!service.isActive) {
    throw createError.badRequest('Service is currently unavailable');
  }
  
  // Step 2: Get or create cart
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  
  // Step 3: Check if item already exists
  const existingItem = cart.items.find(
    item => item.serviceId.toString() === serviceId
  );
  
  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > 99) {
      throw createError.badRequest('Maximum quantity is 99 per item');
    }
    existingItem.quantity = newQuantity;
    if (note) {
      existingItem.note = note;
    }
  } else {
    // Add new item with snapshot data
    cart.items.push({
      serviceId,
      name: service.name,
      price: service.price,
      duration: service.duration,
      imageUrl: service.images && service.images[0] ? service.images[0] : null,
      quantity,
      subtotal: service.price * quantity,
      note
    });
  }
  
  // Step 4: Recalculate & save
  cart.recalculate();
  await cart.save();
  
  return cart;
};

/**
 * Update cart item quantity
 * @param {string} userId - User's ID
 * @param {string} itemId - Cart item's _id
 * @param {Object} data - Update data
 * @param {number} data.quantity - New quantity
 * @returns {Promise<Cart>} Updated cart
 */
const updateCartItem = async (userId, itemId, { quantity }) => {
  const cart = await Cart.findOne({ userId });
  
  if (!cart) {
    throw createError.notFound('Cart not found');
  }
  
  const item = cart.items.id(itemId);
  
  if (!item) {
    throw createError.notFound('Cart item not found');
  }
  
  item.quantity = quantity;
  cart.recalculate();
  await cart.save();
  
  return cart;
};

/**
 * Remove item from cart
 * @param {string} userId - User's ID
 * @param {string} itemId - Cart item's _id
 * @returns {Promise<Cart>} Updated cart
 */
const removeCartItem = async (userId, itemId) => {
  const cart = await Cart.findOne({ userId });
  
  if (!cart) {
    throw createError.notFound('Cart not found');
  }
  
  const item = cart.items.id(itemId);
  
  if (!item) {
    throw createError.notFound('Cart item not found');
  }
  
  cart.items.pull({ _id: itemId });
  cart.recalculate();
  await cart.save();
  
  return cart;
};

/**
 * Clear all items from cart
 * @param {string} userId - User's ID
 * @returns {Promise<Cart>} Cleared cart
 */
const clearCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  
  if (!cart) {
    // Return empty cart structure for idempotent behavior
    return { userId, items: [], totalPrice: 0, totalItems: 0 };
  }
  
  cart.items = [];
  cart.recalculate();
  await cart.save();
  
  return cart;
};

/**
 * Checkout cart and create order
 * @param {string} userId - User's ID
 * @param {Object} data - Checkout data
 * @param {string} [data.paymentMethod='cash'] - Payment method
 * @param {string} [data.note=''] - Order note
 * @param {Date} [data.scheduledAt=null] - Scheduled appointment time
 * @returns {Promise<{order: Order}>} Created order
 */
const checkout = async (userId, { paymentMethod = 'cash', note = '', scheduledAt = null }) => {
  // Step 1: Validate cart
  const cart = await Cart.findByUser(userId);
  
  if (!cart || cart.items.length === 0) {
    throw createError.badRequest('Cart is empty');
  }
  
  // Step 2: Validate each item's service is still active
  const unavailableItems = [];
  
  for (const item of cart.items) {
    if (item.serviceId && !item.serviceId.isActive) {
      unavailableItems.push({
        name: item.name,
        serviceId: item.serviceId._id || item.serviceId
      });
    }
  }
  
  if (unavailableItems.length > 0) {
    const error = createError.badRequest('Some services are no longer available');
    error.errors = unavailableItems;
    throw error;
  }
  
  // Step 3: Re-validate prices (guard against price changes)
  let pricesUpdated = false;
  
  for (const item of cart.items) {
    if (item.serviceId && item.price !== item.serviceId.price) {
      item.price = item.serviceId.price;
      item.subtotal = item.price * item.quantity;
      pricesUpdated = true;
    }
  }
  
  if (pricesUpdated) {
    cart.recalculate();
  }
  
  // Step 4: Create Order
  const orderCode = Order.generateOrderCode();
  
  // Snapshot items (copy data, not references)
  const orderItems = cart.items.map(item => ({
    serviceId: item.serviceId._id || item.serviceId,
    name: item.name,
    price: item.price,
    duration: item.duration,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    subtotal: item.subtotal,
    note: item.note
  }));
  
  try {
    const order = await Order.create({
      orderCode,
      userId,
      items: orderItems,
      totalPrice: cart.totalPrice,
      totalItems: cart.totalItems,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod,
      note,
      scheduledAt
    });
    
    // Step 5: Clear cart only after order is successfully created
    cart.items = [];
    cart.recalculate();
    await cart.save();
    
    // Step 6: Return order
    return { order };
  } catch (err) {
    // Cart remains intact if order creation fails
    throw err;
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  checkout
};
