/**
 * Wallet Service
 * Business logic for wallet operations with ACID transaction support
 * 
 * ❌ REMOVED: withdraw(), internal deposit method, checkoutWithWallet()
 * ✅ UPDATED: deposit() now PayOS-only, returns qrCode
 * ✅ UPDATED: getWallet() removes isLocked from response
 * ⚠️ NOTE: Checkout is now handled by cart.service.js
 */

const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const User = require('../models/User');
const Service = require('../models/Service');
const payosService = require('./payos.service');
const { createError } = require('../utils/AppError');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');
const { NOTIFICATION_TEMPLATES } = require('../constants/notification.constants');

/**
 * Format number to Vietnamese currency string
 * @param {number} amount - Amount in VND
 * @returns {string} Formatted string like "500,000 VND"
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
};

/**
 * Get wallet for user (creates if not exists)
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Wallet data
 */
const getWallet = async (userId) => {
  const wallet = await Wallet.findOrCreateByUser(userId);
  
  return {
    _id: wallet._id,
    balance: wallet.balance,
    currency: wallet.currency,
    totalDeposited: wallet.totalDeposited,
    totalSpent: wallet.totalSpent,
    formattedBalance: formatCurrency(wallet.balance),
    updatedAt: wallet.updatedAt
  };
};

/**
 * Deposit money to wallet via PayOS only
 * @param {ObjectId} userId - User ID
 * @param {Object} data - Deposit data { amount, note }
 * @returns {Promise<Object>} { checkoutUrl, qrCode, orderCode, transactionCode, amount, expiredAt }
 */
const deposit = async (userId, { amount, note }) => {
  // Step 1: Find or create wallet
  const wallet = await Wallet.findOrCreateByUser(userId);
  
  // Step 2: Find user info for PayOS
  const user = await User.findById(userId).select('fullName name email phone');
  
  if (!user) {
    throw createError.notFound('User not found', 'USER_NOT_FOUND');
  }
  
  // Step 3: Delegate to payosService
  const result = await payosService.createPaymentLink({
    userId,
    walletId: wallet._id,
    amount,
    note,
    user,
    wallet
  });
  
  logger.info(`PayOS deposit initiated: userId=${userId}, orderCode=${result.orderCode}`);
  
  // Step 4: Return with qrCode
  return {
    checkoutUrl: result.checkoutUrl,
    qrCode: result.qrCode,
    orderCode: result.orderCode,
    transactionCode: result.transactionCode,
    amount,
    expiredAt: result.expiredAt
  };
};

/**
 * Handle PayOS webhook callback
 * @param {Object} webhookBody - Raw webhook body from PayOS
 * @returns {Promise<Object>} Processing result
 */
const handlePayOSWebhook = async (webhookBody) => {
  // Step 1: Verify webhook signature
  let verifiedData;
  try {
    verifiedData = payosService.verifyWebhookData(webhookBody);
  } catch (error) {
    logger.error(`Webhook verification failed: ${error.message}`);
    throw createError.badRequest('Invalid webhook signature', 'INVALID_WEBHOOK');
  }
  
  // Step 2: Extract data
  const { orderCode, code, desc } = verifiedData;
  const status = code === '00' ? 'PAID' : (desc || 'FAILED');
  const amount = verifiedData.amount || webhookBody.data?.amount;
  
  logger.info(`PayOS webhook received: orderCode=${orderCode}, status=${status}`);
  
  // Step 3: Find pending transaction
  const transaction = await Transaction.findOne({
    payosOrderCode: orderCode,
    status: 'pending',
    type: 'deposit'
  });
  
  if (!transaction) {
    // Already processed or not found - return success for idempotency
    logger.info(`Transaction already processed or not found: orderCode=${orderCode}`);
    return { received: true, message: 'Already processed' };
  }
  
  // Step 4: Handle by status
  if (status === 'PAID' || code === '00') {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Get wallet with session
        const wallet = await Wallet.findById(transaction.walletId).session(session);
        
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        const balanceBefore = wallet.balance;
        
        // Update wallet balance
        wallet.deposit(transaction.amount);
        await wallet.save({ session });
        
        // Update transaction status
        transaction.status = 'completed';
        transaction.balanceBefore = balanceBefore;
        transaction.balanceAfter = wallet.balance;
        transaction.metadata = {
          ...transaction.metadata,
          webhookData: webhookBody
        };
        await transaction.save({ session });
      });
      
      await session.endSession();

      // Notify: deposit success (fire-and-forget — must run outside transaction)
      setImmediate(() => {
        notificationService.send(
          transaction.userId,
          NOTIFICATION_TEMPLATES.DEPOSIT_SUCCESS(
            transaction.amount,
            wallet.balance,
            transaction.transactionCode
          )
        ).catch(err => console.error('[Notif] deposit_success:', err.message));
      });
      
      logger.info(`PayOS deposit completed: orderCode=${orderCode}, amount=${transaction.amount}`);
      return { received: true, status: 'completed' };
      
    } catch (error) {
      await session.endSession();
      logger.error(`PayOS webhook processing failed: ${error.message}`);
      throw error;
    }
  }
  
  // Handle CANCELLED or EXPIRED
  if (status === 'CANCELLED' || status === 'EXPIRED' || code !== '00') {
    transaction.status = 'cancelled';
    transaction.failureReason = status;
    transaction.metadata = {
      ...transaction.metadata,
      webhookData: webhookBody
    };
    await transaction.save();

    // Notify: deposit failed (fire-and-forget)
    setImmediate(() => {
      notificationService.send(
        transaction.userId,
        NOTIFICATION_TEMPLATES.DEPOSIT_FAILED(
          transaction.amount,
          transaction.transactionCode
        )
      ).catch(err => console.error('[Notif] deposit_failed:', err.message));
    });
    
    logger.info(`PayOS deposit cancelled: orderCode=${orderCode}, reason=${status}`);
    return { received: true, status: 'cancelled' };
  }
  
  return { received: true };
};

/**
 * Get transaction history for user (enhanced version)
 * @param {ObjectId} userId - User ID
 * @param {Object} query - Query params
 * @returns {Promise<Object>} Transactions with pagination
 */
const getTransactions = async (userId, query = {}) => {
  const {
    type,
    status,
    method,
    from,
    to,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;
  
  // Step 1: Build filter
  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (method) filter.method = method;
  
  // Date range filter with proper time boundaries
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from + 'T00:00:00.000Z');
    if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
  }
  
  // Step 2: Build sort
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  
  // Step 3: Paginate
  const skip = (page - 1) * limit;
  
  // Step 4: Execute queries in parallel
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .select('transactionCode type method amount balanceBefore balanceAfter status referenceId note failureReason createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter)
  ]);
  
  // Step 5: Return with enhanced pagination
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: transactions,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Get transaction by ID (user can only see their own)
 * @param {ObjectId} userId - User ID from JWT
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Transaction document
 */
const getTransactionById = async (userId, transactionId) => {
  // Validate transactionId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw createError.badRequest('Invalid transaction ID format');
  }
  
  // Find transaction - userId check ensures user can ONLY see their own transactions
  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId: new mongoose.Types.ObjectId(userId)
  })
    .populate('walletId', 'balance currency')
    .lean();
  
  if (!transaction) {
    throw createError.notFound('Transaction not found');
  }
  
  return transaction;
};

/**
 * Handle PayOS return URL (user redirected after payment)
 * Handles both success, cancel, and processing states
 * @param {Object} queryParams - URL query parameters { orderCode, status, cancel }
 * @returns {Promise<Object>} Transaction status with appropriate message
 */
const handlePayOSReturn = async (queryParams) => {
  const { orderCode, status, cancel } = queryParams;
  
  if (!orderCode) {
    return {
      success: false,
      message: 'Không tìm thấy giao dịch'
    };
  }
  
  // Find transaction
  const transaction = await Transaction.findOne({
    payosOrderCode: parseInt(orderCode)
  });
  
  if (!transaction) {
    return {
      success: false,
      message: 'Không tìm thấy giao dịch'
    };
  }
  
  // Get wallet for balance info
  const wallet = await Wallet.findById(transaction.walletId);
  
  // If cancelled by user
  if (cancel === 'true' || status === 'CANCELLED') {
    if (transaction.status === 'pending') {
      transaction.status = 'cancelled';
      transaction.failureReason = 'User cancelled';
      await transaction.save();
      
      // Cancel PayOS payment link
      if (transaction.payosPaymentLinkId) {
        await payosService.cancelPaymentLink(transaction.payosPaymentLinkId);
      }
    }
    
    return {
      success: false,
      message: 'Giao dịch đã bị huỷ',
      transactionCode: transaction.transactionCode,
      status: 'cancelled'
    };
  }
  
  // Payment successful - return with details
  if (transaction.status === 'completed') {
    return {
      success: true,
      message: 'Nạp tiền thành công',
      data: {
        transactionCode: transaction.transactionCode,
        amount: transaction.amount,
        newBalance: wallet ? wallet.balance : null,
        formattedAmount: formatCurrency(transaction.amount)
      }
    };
  }
  
  // Still pending/processing
  return {
    success: false,
    message: 'Giao dịch đang được xử lý',
    transactionCode: transaction.transactionCode,
    status: transaction.status
  };
};

module.exports = {
  getWallet,
  deposit,
  handlePayOSWebhook,
  getTransactions,
  getTransactionById,
  handlePayOSReturn
};
