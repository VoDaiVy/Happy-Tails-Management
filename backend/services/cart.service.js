/**
 * Cart Service
 * Business logic for cart operations
 * 
 * ⚠️ CHECKOUT: Wallet-only payment method
 */

const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Service = require('../models/Service');
const Room = require('../models/Room');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { createError } = require('../utils/AppError');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');
const { NOTIFICATION_TEMPLATES } = require('../constants/notification.constants');

const FALLBACK_ROOM_PRICE_BY_TYPE = {
  standard: 10,
  deluxe: 15,
  suite: 20,
  vip: 25,
};

const resolveRoomNightPrice = (room) => {
  const direct = Number(room?.pricePerNight ?? room?.price ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return FALLBACK_ROOM_PRICE_BY_TYPE[String(room?.type || 'standard').toLowerCase()] || 0;
};

/**
 * Get user's cart (create if not exists)
 * @param {string} userId - User's ID
 * @returns {Promise<Cart>} Cart document with populated items
 */
const getCart = async (userId) => {
  let cart = await Cart.findByUser(userId);
  
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  } else {
    cart.recalculate();
    await cart.save();
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
const addToCart = async (userId, payload) => {
  const {
    type = 'service',
    serviceId,
    roomId,
    quantity = 1,
    note = '',
    checkInDate,
    checkOutDate,
    nights,
    metadata = {}
  } = payload;
  
  // Step 2: Get or create cart
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  
  if (type === 'stay') {
    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      throw createError.notFound('Room not found');
    }

    const hasAnyStayDate = Boolean(checkInDate || checkOutDate);
    const hasFullStayDate = Boolean(checkInDate && checkOutDate);
    if (hasAnyStayDate && !hasFullStayDate) {
      throw createError.badRequest('Both check-in and check-out are required');
    }

    const checkIn = hasFullStayDate ? new Date(checkInDate) : null;
    const checkOut = hasFullStayDate ? new Date(checkOutDate) : null;
    if (
      hasFullStayDate &&
      (!checkIn ||
        !checkOut ||
        Number.isNaN(checkIn.getTime()) ||
        Number.isNaN(checkOut.getTime()) ||
        checkOut <= checkIn)
    ) {
      throw createError.badRequest('Check-in/check-out date is invalid');
    }

    const roomNightPrice = resolveRoomNightPrice(room);
    const calculatedNights = hasFullStayDate
      ? Math.max(1, Number(nights) || Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)))
      : 0;
    const staySubtotal = roomNightPrice * calculatedNights;
    const stayMetadata = {
      ...metadata,
      roomType: room.type,
      checkInDate: hasFullStayDate ? checkIn.toISOString() : null,
      checkOutDate: hasFullStayDate ? checkOut.toISOString() : null,
      nights: calculatedNights,
      pendingStay: !hasFullStayDate,
    };

    const existingStay = cart.items.find(
      (item) => (item.type || 'service') === 'stay' && item.roomId && item.roomId.toString() === roomId,
    );

    if (existingStay) {
      existingStay.quantity = 1;
      existingStay.duration = calculatedNights;
      existingStay.durationUnit = 'days';
      existingStay.unitPrice = roomNightPrice;
      existingStay.price = roomNightPrice;
      existingStay.subtotal = staySubtotal;
      existingStay.note = note || existingStay.note;
      existingStay.metadata = {
        ...existingStay.metadata,
        ...stayMetadata,
      };
    } else {
      cart.items.push({
        type: 'stay',
        refId: room._id,
        roomId: room._id,
        name: room.name,
        unitPrice: roomNightPrice,
        price: roomNightPrice,
        duration: calculatedNights,
        durationUnit: 'days',
        imageUrl: room.images && room.images[0] ? room.images[0] : null,
        quantity: 1,
        subtotal: staySubtotal,
        note,
        metadata: stayMetadata,
      });
    }

    cart.recalculate();
    await cart.save();
    return cart;
  }

  // Step 1: Validate service
  const service = await Service.findById(serviceId);

  if (!service) {
    throw createError.notFound('Service not found');
  }

  if (!service.isActive) {
    throw createError.badRequest('Service is currently unavailable');
  }

  // Step 3: Check if item already exists
  const existingItem = cart.items.find(
    item => (item.type || 'service') === 'service' && item.serviceId && item.serviceId.toString() === serviceId,
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > 99) {
      throw createError.badRequest('Maximum quantity is 99 per item');
    }
    existingItem.quantity = newQuantity;
    existingItem.unitPrice = service.price;
    existingItem.price = service.price;
    existingItem.duration = service.duration;
    existingItem.durationUnit = 'minutes';
    existingItem.refId = service._id;
    if (note) {
      existingItem.note = note;
    }
  } else {
    // Add new item with snapshot data
    cart.items.push({
      type: 'service',
      refId: service._id,
      serviceId,
      name: service.name,
      unitPrice: service.price,
      price: service.price,
      duration: service.duration,
      durationUnit: 'minutes',
      imageUrl: service.images && service.images[0] ? service.images[0] : null,
      quantity,
      subtotal: service.price * quantity,
      note,
      metadata: {
        ...metadata,
        group: service.group,
        maxCapacity: service.maxCapacity || 1,
      }
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
 * Payment method: Wallet only (ACID transaction)
 * @param {string} userId - User's ID
 * @param {Object} user - Full user object
 * @param {Object} data - Checkout data
 * @param {string} [data.note=''] - Order note
 * @param {Date} [data.scheduledAt=null] - Scheduled appointment time
 * @returns {Promise<{order: Order, transaction: Object, walletBalance: number}>} Created order
 */
const checkout = async (userId, user, { note = '', scheduledAt = null }) => {
  // Step 1: Validate cart
  const cart = await Cart.findByUser(userId);
  
  if (!cart || cart.items.length === 0) {
    throw createError.badRequest('Giỏ hàng trống');
  }
  
  // Step 2: Validate each item's service is still active
  const unavailableItems = [];
  
  for (const item of cart.items) {
      if ((item.type || 'service') === 'service' && item.serviceId && !item.serviceId.isActive) {
      unavailableItems.push({
        name: item.name,
        serviceId: item.serviceId._id || item.serviceId
      });
    }
  }
  
  if (unavailableItems.length > 0) {
    const error = createError.badRequest('Một số dịch vụ không còn khả dụng');
    error.errors = unavailableItems;
    throw error;
  }
  
  // Step 3: Re-validate prices (guard against price changes)
  let pricesUpdated = false;
  
  for (const item of cart.items) {
    if ((item.type || 'service') === 'service' && item.serviceId && item.price !== item.serviceId.price) {
      item.price = item.serviceId.price;
      item.unitPrice = item.serviceId.price;
      item.subtotal = item.price * item.quantity;
      pricesUpdated = true;
    }
  }
  
  if (pricesUpdated) {
    cart.recalculate();
  }
  
  // Step 4: Execute wallet checkout with ACID transaction
  return checkoutWithWallet(userId, cart, { note, scheduledAt });
};

/**
 * Wallet checkout - ACID transaction with instant payment
 * Vietnamese error messages for insufficient balance
 */
const checkoutWithWallet = async (userId, cart, { note, scheduledAt }) => {
  const session = await mongoose.startSession();
  
  let order;
  let transaction;
  let wallet;
  
  try {
    await session.withTransaction(async () => {
      // Get wallet and check balance
      wallet = await Wallet.findOne({ userId }).session(session);
      
      if (!wallet) {
        throw createError.badRequest('Ví không tồn tại. Vui lòng nạp tiền trước.', 'WALLET_NOT_FOUND');
      }
      
      if (wallet.balance < cart.totalPrice) {
        const shortfall = cart.totalPrice - wallet.balance;
        throw createError.badRequest(
          `Số dư ví không đủ. Cần thêm ${shortfall.toLocaleString('vi-VN')}đ để thanh toán.`,
          'INSUFFICIENT_BALANCE',
          {
            required: cart.totalPrice,
            available: wallet.balance,
            shortfall: shortfall
          }
        );
      }
      
      // Deduct from wallet
      const balanceBefore = wallet.balance;
      wallet.spend(cart.totalPrice);
      await wallet.save({ session });
      
      // Create order
      const orderCode = Order.generateOrderCode();
      const orderItems = cart.items
        .filter((item) => (item.type || 'service') === 'service')
        .map(item => ({
          serviceId: item.serviceId?._id || item.serviceId,
          name: item.name,
          price: item.price,
          duration: item.duration,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          subtotal: item.subtotal,
          note: item.note
        }));
      
      [order] = await Order.create([{
        orderCode,
        userId,
        items: orderItems,
        totalPrice: cart.totalPrice,
        totalItems: cart.totalItems,
        status: 'pending',
        paymentStatus: 'paid',
        paymentMethod: 'wallet',
        note,
        scheduledAt
      }], { session });
      
      // Create payment transaction
      [transaction] = await Transaction.create([{
        transactionCode: Transaction.generateCode(),
        userId,
        walletId: wallet._id,
        type: 'payment',
        method: 'system',
        status: 'completed',
        amount: cart.totalPrice,
        balanceBefore,
        balanceAfter: wallet.balance,
        referenceId: order.orderCode,
        note: `Thanh toán đơn hàng ${order.orderCode}`
      }], { session });
      
      // Clear cart
      cart.items = [];
      cart.recalculate();
      await cart.save({ session });
    });
    
    await session.endSession();
    
    logger.info(`Wallet order completed: orderCode=${order.orderCode}, userId=${userId}, amount=${order.totalPrice}`);

    // Notify: order created (fire-and-forget — must not block caller)
    setImmediate(() => {
      notificationService.send(
        userId,
        NOTIFICATION_TEMPLATES.ORDER_CREATED(order.orderCode, order.totalPrice)
      ).catch(err => console.error('[Notif] order_created:', err.message));
    });

    // Notify: payment success
    setImmediate(() => {
      notificationService.send(
        userId,
        NOTIFICATION_TEMPLATES.PAYMENT_SUCCESS(
          order.totalPrice,
          order.orderCode,
          wallet.balance
        )
      ).catch(err => console.error('[Notif] payment_success:', err.message));
    });
    
    return {
      order,
      transaction: {
        transactionCode: transaction.transactionCode,
        amount: transaction.amount
      },
      wallet: {
        balance: wallet.balance
      }
    };
    
  } catch (error) {
    await session.endSession();
    logger.error(`Wallet checkout failed: ${error.message}`);
    throw error;
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
