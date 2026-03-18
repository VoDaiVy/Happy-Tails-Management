/**
 * PayOS Service
 * Handles all interactions with PayOS payment gateway
 */

const { payosClient, payosConfig } = require('../config/payos');
const Transaction = require('../models/Transaction');
const { createError } = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * SDK compatibility helpers.
 * @payos/node v2 exposes paymentRequests/webhooks namespaces.
 * We keep fallback support for legacy method names to avoid regressions.
 */
const callCreatePaymentLink = async (paymentData) => {
  if (payosClient?.paymentRequests?.create) {
    return payosClient.paymentRequests.create(paymentData);
  }

  if (typeof payosClient?.createPaymentLink === 'function') {
    return payosClient.createPaymentLink(paymentData);
  }

  throw createError.internal('PayOS client does not support create payment link', 'PAYOS_CLIENT_INVALID');
};

const callVerifyWebhookData = async (webhookBody) => {
  if (payosClient?.webhooks?.verify) {
    return payosClient.webhooks.verify(webhookBody);
  }

  if (typeof payosClient?.verifyPaymentWebhookData === 'function') {
    return payosClient.verifyPaymentWebhookData(webhookBody);
  }

  throw createError.internal('PayOS client does not support webhook verification', 'PAYOS_CLIENT_INVALID');
};

const callGetPaymentLinkInformation = async (orderCode) => {
  if (payosClient?.paymentRequests?.get) {
    return payosClient.paymentRequests.get(orderCode);
  }

  if (typeof payosClient?.getPaymentLinkInformation === 'function') {
    return payosClient.getPaymentLinkInformation(orderCode);
  }

  throw createError.internal('PayOS client does not support get payment link information', 'PAYOS_CLIENT_INVALID');
};

const callCancelPaymentLink = async (paymentLinkId, cancellationReason = undefined) => {
  if (payosClient?.paymentRequests?.cancel) {
    return payosClient.paymentRequests.cancel(paymentLinkId, cancellationReason);
  }

  if (typeof payosClient?.cancelPaymentLink === 'function') {
    return payosClient.cancelPaymentLink(paymentLinkId, cancellationReason);
  }

  throw createError.internal('PayOS client does not support cancel payment link', 'PAYOS_CLIENT_INVALID');
};

/**
 * Create a PayOS payment link for wallet deposit
 * @param {Object} params - Payment parameters
 * @param {ObjectId} params.userId - User ID
 * @param {ObjectId} params.walletId - Wallet ID
 * @param {number} params.amount - Amount in VND
 * @param {string} params.note - Optional note
 * @param {string} [params.returnUrl] - Optional per-request return URL
 * @param {string} [params.cancelUrl] - Optional per-request cancel URL
 * @param {Object} params.user - User object with fullName, email, phone
 * @param {Object} params.wallet - Wallet object for balanceBefore
 * @returns {Promise<Object>} { checkoutUrl, orderCode, transactionCode, expiredAt }
 */
const createPaymentLink = async ({ userId, walletId, amount, note, returnUrl, cancelUrl, user, wallet }) => {
  try {
    // Step 1: Generate unique numeric orderCode for PayOS
    const orderCode = await Transaction.generatePayOSOrderCode();
    
    // Step 2: Calculate expiry time
    const expiredAt = new Date(Date.now() + payosConfig.expireTime * 1000);
    const expiredAtUnix = Math.floor(expiredAt.getTime() / 1000);
    
    // Step 3: Create pending Transaction record FIRST
    const transactionCode = Transaction.generateCode();
    const transaction = await Transaction.create({
      transactionCode,
      userId,
      walletId,
      type: 'deposit',
      method: 'payos',
      status: 'pending',
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance, // Not yet updated
      payosOrderCode: orderCode,
      note: note || 'Nap tien vi',
      expiredAt
    });
    
    // Step 4: Build PayOS payment data
    // Description: max 25 chars, no special characters
    const description = `NAP VI ${orderCode}`.substring(0, 25);
    
    const paymentData = {
      orderCode: orderCode,
      amount: amount,
      description: description,
      returnUrl: returnUrl || payosConfig.returnUrl,
      cancelUrl: cancelUrl || payosConfig.cancelUrl,
      items: [{
        name: 'Nap tien vi',
        quantity: 1,
        price: amount
      }],
      buyerName: user.name || user.fullName || 'Customer',
      buyerEmail: user.email || '',
      buyerPhone: user.phone || '',
      expiredAt: expiredAtUnix
    };
    
    logger.info(`Creating PayOS payment link: orderCode=${orderCode}, amount=${amount}`);
    
    // Step 5: Call PayOS SDK
    const response = await callCreatePaymentLink(paymentData);
    
    // Step 6: Update Transaction with PayOS response
    transaction.payosPaymentLinkId = response.paymentLinkId;
    transaction.payosCheckoutUrl = response.checkoutUrl;
    transaction.metadata = {
      payosResponse: response,
      paymentData: paymentData,
      qrCode: response.qrCode
    };
    await transaction.save();
    
    logger.info(`PayOS payment link created: ${response.checkoutUrl}`);
    
    return {
      checkoutUrl: response.checkoutUrl,
      qrCode: response.qrCode,
      orderCode,
      transactionCode,
      amount,
      expiredAt
    };
    
  } catch (error) {
    logger.error(`PayOS createPaymentLink error: ${error.message}`);
    
    // If it's a PayOS API error
    if (error.response) {
      throw createError.internal(
        'Payment service unavailable. Please try again.',
        'PAYOS_ERROR'
      );
    }
    
    throw error;
  }
};

/**
 * Verify PayOS webhook data using SDK
 * @param {Object} webhookBody - Raw webhook request body
 * @returns {Promise<Object>} Verified webhook data
 * @throws {Error} If checksum verification fails
 */
const verifyWebhookData = async (webhookBody) => {
  try {
    // PayOS SDK handles HMAC-SHA256 checksum verification.
    const verifiedData = await callVerifyWebhookData(webhookBody);
    return verifiedData;
  } catch (error) {
    logger.error(`PayOS webhook verification failed: ${error.message}`);
    throw createError.badRequest('Invalid webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
  }
};

/**
 * Get payment link information from PayOS
 * @param {number} orderCode - PayOS order code
 * @returns {Promise<Object>} Payment link information
 */
const getPaymentLinkInfo = async (orderCode) => {
  try {
    const response = await callGetPaymentLinkInformation(orderCode);
    return response;
  } catch (error) {
    logger.error(`PayOS getPaymentLinkInfo error: ${error.message}`);
    throw createError.internal('Failed to get payment information', 'PAYOS_ERROR');
  }
};

/**
 * Cancel a PayOS payment link
 * @param {string} paymentLinkId - PayOS payment link ID
 * @returns {Promise<Object>} Cancellation response
 */
const cancelPaymentLink = async (paymentLinkId) => {
  try {
    const response = await callCancelPaymentLink(paymentLinkId);
    logger.info(`PayOS payment link cancelled: ${paymentLinkId}`);
    return response;
  } catch (error) {
    logger.error(`PayOS cancelPaymentLink error: ${error.message}`);
    // Don't throw error if cancellation fails - link might already be cancelled/expired
    return null;
  }
};

/**
 * Create a PayOS payment link for ORDER checkout
 * @param {Object} params - Payment parameters
 * @param {Object} params.order - Order document
 * @param {Object} params.user - User object with name, email, phone
 * @returns {Promise<Object>} { checkoutUrl, orderCode, paymentLinkId, expiredAt }
 */
const createOrderPaymentLink = async ({ order, user }) => {
  try {
    // Step 1: Generate unique numeric orderCode for PayOS
    const payosOrderCode = await Transaction.generatePayOSOrderCode();
    
    // Step 2: Calculate expiry time
    const expiredAt = new Date(Date.now() + payosConfig.expireTime * 1000);
    const expiredAtUnix = Math.floor(expiredAt.getTime() / 1000);
    
    // Step 3: Build PayOS payment data
    // Description: max 25 chars, no special characters
    const description = `DH ${order.orderCode}`.substring(0, 25);
    
    // Build items list from order
    const items = order.items.map(item => ({
      name: item.name.substring(0, 50), // PayOS name limit
      quantity: item.quantity,
      price: item.price
    }));
    
    const paymentData = {
      orderCode: payosOrderCode,
      amount: order.totalPrice,
      description: description,
      returnUrl: payosConfig.orderReturnUrl,
      cancelUrl: payosConfig.orderCancelUrl,
      items: items,
      buyerName: user.name || user.fullName || 'Customer',
      buyerEmail: user.email || '',
      buyerPhone: user.phone || '',
      expiredAt: expiredAtUnix
    };
    
    logger.info(`Creating PayOS order payment link: payosOrderCode=${payosOrderCode}, orderCode=${order.orderCode}, amount=${order.totalPrice}`);
    
    // Step 4: Call PayOS SDK
    const response = await callCreatePaymentLink(paymentData);
    
    logger.info(`PayOS order payment link created: ${response.checkoutUrl}`);
    
    return {
      checkoutUrl: response.checkoutUrl,
      payosOrderCode,
      paymentLinkId: response.paymentLinkId,
      expiredAt
    };
    
  } catch (error) {
    logger.error(`PayOS createOrderPaymentLink error: ${error.message}`);
    
    // If it's a PayOS API error
    if (error.response) {
      throw createError.internal(
        'Payment service unavailable. Please try again.',
        'PAYOS_ERROR'
      );
    }
    
    throw error;
  }
};

/**
 * Clean up expired pending transactions
 * Should be run via cron job in production
 * @returns {Promise<Object>} Cleanup result
 */
const cleanExpiredTransactions = async () => {
  try {
    const expiredIds = await Transaction.cleanExpiredTransactions();
    
    if (expiredIds.length > 0) {
      logger.info(`Cleaned ${expiredIds.length} expired transactions`);
    }
    
    return {
      cleaned: expiredIds.length,
      transactionIds: expiredIds
    };
  } catch (error) {
    logger.error(`cleanExpiredTransactions error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createPaymentLink,
  createOrderPaymentLink,
  verifyWebhookData,
  getPaymentLinkInfo,
  cancelPaymentLink,
  cleanExpiredTransactions
};
