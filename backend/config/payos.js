/**
 * PayOS Payment Gateway Configuration
 * Initializes PayOS SDK client for payment processing
 */

const { PayOS } = require('@payos/node');
const logger = require('../utils/logger');

// Check if PayOS credentials are available
const hasPayOSCredentials = 
  process.env.PAYOS_CLIENT_ID && 
  process.env.PAYOS_API_KEY && 
  process.env.PAYOS_CHECKSUM_KEY;

// In production, credentials are required
if (!hasPayOSCredentials && process.env.NODE_ENV === 'production') {
  throw new Error('Missing required PayOS environment variables: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY');
}

/**
 * PayOS SDK Client Instance
 * In development mode without credentials, we create a mock client
 * @see https://payos.vn/docs/api/
 */
let payosClient = null;

if (hasPayOSCredentials) {
  try {
    // @payos/node v2 expects an options object instead of positional params.
    payosClient = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY
    });
    logger.info('PayOS client initialized successfully');
  } catch (error) {
    logger.error(`PayOS client initialization failed: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
} else {
  // Mock client for development without credentials
  logger.warn('PayOS credentials not found. Using mock client for development.');

  const mockCreatePaymentLink = async (data) => {
    logger.warn('MOCK PayOS: create payment link called');
    return {
      checkoutUrl: `http://localhost:3001/mock-payos/checkout?orderCode=${data.orderCode}`,
      paymentLinkId: `mock-link-${Date.now()}`,
      orderCode: data.orderCode,
      status: 'PENDING',
      qrCode: `MOCK-QR-${data.orderCode}`
    };
  };

  const mockVerifyWebhookData = async (data) => {
    logger.warn('MOCK PayOS: verify webhook called');
    return data?.data || data;
  };

  const mockGetPaymentLinkInformation = async (orderCode) => {
    logger.warn('MOCK PayOS: get payment link called');
    return { orderCode, status: 'PENDING' };
  };

  const mockCancelPaymentLink = async (paymentLinkIdOrOrderCode) => {
    logger.warn('MOCK PayOS: cancel payment link called');
    return {
      paymentLinkId: String(paymentLinkIdOrOrderCode),
      orderCode: Number(paymentLinkIdOrOrderCode) || null,
      status: 'CANCELLED'
    };
  };

  payosClient = {
    paymentRequests: {
      create: mockCreatePaymentLink,
      get: mockGetPaymentLinkInformation,
      cancel: mockCancelPaymentLink
    },
    webhooks: {
      verify: mockVerifyWebhookData
    },

    // Legacy aliases for backward compatibility
    createPaymentLink: mockCreatePaymentLink,
    verifyPaymentWebhookData: mockVerifyWebhookData,
    getPaymentLinkInformation: mockGetPaymentLinkInformation,
    cancelPaymentLink: mockCancelPaymentLink
  };
}

/**
 * PayOS Configuration Constants
 */
const payosConfig = {
  returnUrl: process.env.PAYOS_RETURN_URL || 'http://localhost:5173/wallet',
  cancelUrl: process.env.PAYOS_CANCEL_URL || 'http://localhost:5173/wallet',
  orderReturnUrl: process.env.PAYOS_ORDER_RETURN_URL || 'http://localhost:3001/api/cart/payos-return',
  orderCancelUrl: process.env.PAYOS_ORDER_CANCEL_URL || 'http://localhost:3001/api/cart/payos-cancel',
  webhookUrl: process.env.PAYOS_WEBHOOK_URL || 'http://localhost:5000/api/wallet/payos/webhook',
  // Payment link expiry time in seconds (15 minutes)
  expireTime: 15 * 60,
  // Minimum and maximum amounts (VND)
  minDeposit: 10000,      // 10K VND
  maxDeposit: 50000000,   // 50M VND
  minWithdraw: 50000,     // 50K VND
  maxWithdraw: 100000000  // 100M VND
};

module.exports = {
  payosClient,
  payosConfig
};
