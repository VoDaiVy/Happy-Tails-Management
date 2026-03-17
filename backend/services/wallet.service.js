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
 * Flatten PayOS payloads where useful data may be nested under `data`.
 * Supports webhook payloads and getPaymentLinkInformation responses.
 */
const extractPayOSPayload = (payload = {}) => {
  if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
    return {
      ...payload,
      ...payload.data,
      rawData: payload.data
    };
  }

  return payload || {};
};

const getLocalPayOSStatus = (transactionStatus) => {
  if (transactionStatus === 'completed') return 'PAID';
  if (transactionStatus === 'cancelled') return 'CANCELLED';
  if (transactionStatus === 'failed') return 'FAILED';
  return 'PENDING';
};

/**
 * Normalize PayOS responses to a single status vocabulary.
 */
const resolvePayOSStatus = (payload = {}) => {
  const data = extractPayOSPayload(payload);
  const code = data.code !== undefined && data.code !== null ? String(data.code) : null;
  const desc = data.desc ? String(data.desc) : '';
  const rawStatus = String(data.status || '').toUpperCase();
  const upperDesc = desc.toUpperCase();

  let normalizedStatus = 'PENDING';

  if (code === '00' || rawStatus === 'PAID' || rawStatus === 'SUCCESS') {
    normalizedStatus = 'PAID';
  } else if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELED' || upperDesc.includes('CANCEL')) {
    normalizedStatus = 'CANCELLED';
  } else if (rawStatus === 'EXPIRED' || upperDesc.includes('EXPIRE')) {
    normalizedStatus = 'EXPIRED';
  } else if (rawStatus === 'FAILED' || rawStatus === 'FAIL') {
    normalizedStatus = 'FAILED';
  } else if (code && code !== '00' && !rawStatus) {
    normalizedStatus = 'FAILED';
  }

  return {
    ...data,
    code,
    desc,
    normalizedStatus,
    orderCode: data.orderCode !== undefined && data.orderCode !== null
      ? Number(data.orderCode)
      : null,
    amount: Number(data.amount || 0) || 0,
  };
};

const buildDepositStatusPayload = (transaction, walletBalance = null, payosStatus = null) => ({
  transactionId: transaction._id,
  transactionCode: transaction.transactionCode,
  orderCode: transaction.payosOrderCode,
  amount: transaction.amount,
  status: transaction.status,
  payosStatus: payosStatus || getLocalPayOSStatus(transaction.status),
  checkoutUrl: transaction.payosCheckoutUrl,
  qrCode: transaction.metadata?.qrCode || transaction.metadata?.payosResponse?.qrCode || null,
  failureReason: transaction.failureReason,
  expiredAt: transaction.expiredAt,
  newBalance: walletBalance ?? transaction.balanceAfter ?? null,
});

const notifyDepositSuccess = (userId, amount, newBalance, transactionCode) => {
  setImmediate(() => {
    notificationService.send(
      userId,
      NOTIFICATION_TEMPLATES.DEPOSIT_SUCCESS(amount, newBalance, transactionCode)
    ).catch(err => console.error('[Notif] deposit_success:', err.message));
  });
};

const notifyDepositFailure = (userId, amount, transactionCode) => {
  setImmediate(() => {
    notificationService.send(
      userId,
      NOTIFICATION_TEMPLATES.DEPOSIT_FAILED(amount, transactionCode)
    ).catch(err => console.error('[Notif] deposit_failed:', err.message));
  });
};

/**
 * Idempotently complete a pending PayOS deposit transaction.
 */
const completeDepositTransaction = async (transactionId, metadata = {}) => {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const transaction = await Transaction.findById(transactionId).session(session);

      if (!transaction) {
        throw createError.notFound('Transaction not found', 'TRANSACTION_NOT_FOUND');
      }

      const wallet = await Wallet.findById(transaction.walletId).session(session);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (transaction.status !== 'pending') {
        result = buildDepositStatusPayload(transaction, wallet.balance, 'PAID');
        return;
      }

      const balanceBefore = wallet.balance;

      wallet.deposit(transaction.amount);
      await wallet.save({ session });

      transaction.status = 'completed';
      transaction.balanceBefore = balanceBefore;
      transaction.balanceAfter = wallet.balance;
      transaction.failureReason = null;
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...(transaction.metadata || {}),
        ...metadata,
      };
      await transaction.save({ session });

      result = {
        ...buildDepositStatusPayload(transaction, wallet.balance, 'PAID'),
        userId: transaction.userId,
        completedNow: true,
      };
    });
  } finally {
    await session.endSession();
  }

  if (result?.completedNow) {
    notifyDepositSuccess(result.userId, result.amount, result.newBalance, result.transactionCode);
  }

  return result;
};

/**
 * Idempotently cancel or fail a pending PayOS deposit transaction.
 */
const stopPendingDepositTransaction = async (transactionId, reason, metadata = {}) => {
  const existing = await Transaction.findById(transactionId);

  if (!existing) {
    throw createError.notFound('Transaction not found', 'TRANSACTION_NOT_FOUND');
  }

  if (existing.status !== 'pending') {
    const wallet = existing.walletId ? await Wallet.findById(existing.walletId).select('balance') : null;
    return buildDepositStatusPayload(existing, wallet?.balance ?? null, getLocalPayOSStatus(existing.status));
  }

  const nextStatus = reason === 'FAILED' ? 'failed' : 'cancelled';

  const updated = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: 'pending' },
    {
      $set: {
        status: nextStatus,
        failureReason: reason,
        processedAt: new Date(),
        metadata: {
          ...(existing.metadata || {}),
          ...metadata,
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    const latest = await Transaction.findById(transactionId);
    const wallet = latest?.walletId ? await Wallet.findById(latest.walletId).select('balance') : null;
    return buildDepositStatusPayload(latest, wallet?.balance ?? null, getLocalPayOSStatus(latest.status));
  }

  notifyDepositFailure(updated.userId, updated.amount, updated.transactionCode);

  const wallet = updated.walletId ? await Wallet.findById(updated.walletId).select('balance') : null;
  return buildDepositStatusPayload(updated, wallet?.balance ?? null, reason);
};

/**
 * Sync a deposit transaction using PayOS API when webhook is unavailable.
 */
const syncDepositTransactionStatus = async ({ orderCode, userId = null, source = 'status-api' }) => {
  const numericOrderCode = Number(orderCode);

  if (!numericOrderCode || Number.isNaN(numericOrderCode)) {
    throw createError.badRequest('Invalid PayOS order code', 'INVALID_ORDER_CODE');
  }

  const filter = {
    payosOrderCode: numericOrderCode,
    type: 'deposit'
  };

  if (userId) {
    filter.userId = new mongoose.Types.ObjectId(userId);
  }

  const transaction = await Transaction.findOne(filter);

  if (!transaction) {
    throw createError.notFound('Transaction not found', 'TRANSACTION_NOT_FOUND');
  }

  if (transaction.status !== 'pending') {
    const wallet = transaction.walletId ? await Wallet.findById(transaction.walletId).select('balance') : null;
    return buildDepositStatusPayload(transaction, wallet?.balance ?? null);
  }

  try {
    const payosInfo = await payosService.getPaymentLinkInfo(numericOrderCode);
    const payosState = resolvePayOSStatus(payosInfo);
    const syncMetadata = {
      lastStatusSyncAt: new Date().toISOString(),
      lastStatusSyncSource: source,
      payosStatusResponse: payosInfo,
    };

    if (payosState.normalizedStatus === 'PAID') {
      return completeDepositTransaction(transaction._id, syncMetadata);
    }

    if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(payosState.normalizedStatus)) {
      return stopPendingDepositTransaction(transaction._id, payosState.normalizedStatus, syncMetadata);
    }

    const latest = await Transaction.findById(transaction._id);
    const wallet = latest.walletId ? await Wallet.findById(latest.walletId).select('balance') : null;
    return buildDepositStatusPayload(latest, wallet?.balance ?? null, payosState.normalizedStatus);
  } catch (error) {
    logger.warn(`PayOS status sync failed for orderCode=${numericOrderCode}: ${error.message}`);
    const latest = await Transaction.findById(transaction._id);
    const wallet = latest.walletId ? await Wallet.findById(latest.walletId).select('balance') : null;
    return buildDepositStatusPayload(latest, wallet?.balance ?? null);
  }
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
    verifiedData = await payosService.verifyWebhookData(webhookBody);
  } catch (error) {
    logger.error(`Webhook verification failed: ${error.message}`);
    throw createError.badRequest('Invalid webhook signature', 'INVALID_WEBHOOK');
  }

  const payosState = resolvePayOSStatus(verifiedData);
  const { orderCode, normalizedStatus } = payosState;

  if (!orderCode) {
    throw createError.badRequest('Webhook missing orderCode', 'INVALID_WEBHOOK');
  }

  logger.info(`PayOS webhook received: orderCode=${orderCode}, status=${normalizedStatus}`);

  const transaction = await Transaction.findOne({
    payosOrderCode: orderCode,
    type: 'deposit'
  });

  if (!transaction) {
    logger.info(`Transaction not found for PayOS webhook: orderCode=${orderCode}`);
    return { received: true, message: 'Transaction not found' };
  }

  if (normalizedStatus === 'PAID') {
    const result = await completeDepositTransaction(transaction._id, {
      webhookReceivedAt: new Date().toISOString(),
      verifiedWebhookData: verifiedData,
      webhookBody,
    });

    logger.info(`PayOS deposit completed: orderCode=${orderCode}, amount=${result.amount}`);
    return { received: true, status: result.status };
  }

  if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(normalizedStatus)) {
    const result = await stopPendingDepositTransaction(transaction._id, normalizedStatus, {
      webhookReceivedAt: new Date().toISOString(),
      verifiedWebhookData: verifiedData,
      webhookBody,
    });

    logger.info(`PayOS deposit stopped: orderCode=${orderCode}, reason=${normalizedStatus}`);
    return { received: true, status: result.status };
  }

  return { received: true, status: 'pending' };
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
      .select('transactionCode type method amount balanceBefore balanceAfter status referenceId note failureReason createdAt payosCheckoutUrl payosOrderCode expiredAt')
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
      total,
      pages: Math.ceil(total / limit),
      totalPages: Math.ceil(total / limit) // kept for backwards compat
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
  
  // If cancelled by user
  if (cancel === 'true' || status === 'CANCELLED') {
    try {
      const synced = await syncDepositTransactionStatus({ orderCode, source: 'return-cancel' });

      if (synced.status === 'pending') {
        await stopPendingDepositTransaction(synced.transactionId, 'CANCELLED', {
          returnQuery: queryParams,
          returnReceivedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn(`PayOS return cancel sync failed for orderCode=${orderCode}: ${error.message}`);
    }

    return {
      success: false,
      message: 'Giao dịch đã bị huỷ',
      transactionCode: null,
      status: 'cancelled'
    };
  }

  const transaction = await syncDepositTransactionStatus({ orderCode, source: 'return-url' });

  if (transaction.status === 'completed') {
    return {
      success: true,
      message: 'Nạp tiền thành công',
      data: {
        transactionCode: transaction.transactionCode,
        amount: transaction.amount,
        newBalance: transaction.newBalance,
        formattedAmount: formatCurrency(transaction.amount)
      }
    };
  }

  return {
    success: false,
    message: 'Giao dịch đang được xử lý',
    transactionCode: transaction.transactionCode,
    status: transaction.status
  };
};

/**
 * Get PayOS deposit status for the current user and synchronize it when possible.
 */
const getPayOSDepositStatus = async (userId, orderCode) => {
  return syncDepositTransactionStatus({ orderCode, userId, source: 'wallet-page' });
};

module.exports = {
  getWallet,
  deposit,
  handlePayOSWebhook,
  getTransactions,
  getTransactionById,
  handlePayOSReturn,
  getPayOSDepositStatus
};
