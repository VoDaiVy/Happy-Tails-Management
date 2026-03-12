/**
 * Wallet Controller
 * HTTP handlers for wallet operations
 * 
 * ❌ REMOVED: withdraw controller, checkoutWithWallet (moved to cart)
 * ✅ UPDATED: deposit controller (PayOS only, returns qrCode)
 * ✅ UPDATED: handlePayOSReturn (cleaner response)
 * ⚠️ NOTE: Checkout is now handled by /api/cart/checkout
 */

const walletService = require('../services/wallet.service');
const {
  depositSchema,
  getTransactionsQuerySchema
} = require('../validations/wallet.validation');
const { catchAsync } = require('../utils/catchAsync');
const { createError } = require('../utils/AppError');

/**
 * Get wallet information
 * GET /api/wallet
 */
const getWallet = catchAsync(async (req, res) => {
  const wallet = await walletService.getWallet(req.user._id);
  
  res.status(200).json({
    success: true,
    message: 'Wallet fetched successfully',
    data: wallet
  });
});

/**
 * Deposit money to wallet via PayOS
 * POST /api/wallet/deposit
 */
const deposit = catchAsync(async (req, res) => {
  // Validate request body
  const { error, value } = depositSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw createError.validation(
      error.details.map(d => d.message).join(', '),
      error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    );
  }
  
  const result = await walletService.deposit(req.user._id, value);
  
  res.status(200).json({
    success: true,
    message: 'Payment link created. Scan QR or use checkout URL to deposit.',
    data: {
      checkoutUrl: result.checkoutUrl,
      qrCode: result.qrCode,
      orderCode: result.orderCode,
      transactionCode: result.transactionCode,
      amount: result.amount,
      expiredAt: result.expiredAt
    }
  });
});

/**
 * Get transaction history
 * GET /api/wallet/transactions
 */
const getTransactions = catchAsync(async (req, res) => {
  // Validate query params
  const { error, value } = getTransactionsQuerySchema.validate(req.query, { abortEarly: false });
  if (error) {
    throw createError.validation(
      error.details.map(d => d.message).join(', '),
      error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    );
  }
  
  const result = await walletService.getTransactions(req.user._id, value);
  
  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: result.data,
    pagination: result.pagination
  });
});

/**
 * Handle PayOS webhook
 * POST /api/wallet/payos/webhook
 * NOTE: This is a PUBLIC endpoint - NO JWT auth
 * PayOS sends payment status updates here
 */
const handlePayOSWebhook = catchAsync(async (req, res) => {
  // PayOS requires fast response
  // Process webhook and return immediately
  const result = await walletService.handlePayOSWebhook(req.body);
  
  // PayOS expected response format
  res.status(200).json({
    code: '00',
    desc: 'success'
  });
});

/**
 * Handle PayOS return URL
 * GET /api/wallet/payos/return
 * User is redirected here after payment
 */
const handlePayOSReturn = catchAsync(async (req, res) => {
  const result = await walletService.handlePayOSReturn(req.query);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (result.success && result.data) {
    // Payment completed — redirect to wallet page with success flag
    return res.redirect(
      `${frontendUrl}/wallet?payment=success&amount=${result.data.amount || ''}&code=${result.data.transactionCode || ''}`
    );
  }

  // Cancelled or still pending
  const status = result.status || 'cancelled';
  return res.redirect(
    `${frontendUrl}/wallet?payment=${status}&code=${result.transactionCode || ''}`
  );
});

module.exports = {
  getWallet,
  deposit,
  getTransactions,
  handlePayOSWebhook,
  handlePayOSReturn
};
