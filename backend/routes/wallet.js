/**
 * Wallet Routes
 * Routes for wallet management and PayOS integration (deposit only)
 * 
 * ❌ REMOVED: POST /withdraw, GET /payos/cancel, POST /checkout
 * ✅ KEPT: GET /, POST /deposit, GET /transactions
 * ✅ KEPT: POST /payos/webhook (public), GET /payos/return (public)
 * ✅ ADDED: GET /transactions/:id (UC-26)
 * ⚠️ NOTE: Checkout moved to /api/cart/checkout (wallet-only)
 */

const express = require('express');
const {
  getWallet,
  deposit,
  getTransactions,
  getTransactionById,
  getPayOSDepositStatus,
  handlePayOSWebhook,
  handlePayOSReturn
} = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ==================== PUBLIC ROUTES (PayOS callbacks) ====================

/**
 * @route   POST /api/wallet/payos/webhook
 * @desc    Handle PayOS webhook callback
 * @access  Public (verified via PayOS checksum)
 * @note    PayOS sends payment status updates here
 *          Must return { code: '00', desc: 'success' } quickly
 */
router.post('/payos/webhook', handlePayOSWebhook);

/**
 * @route   GET /api/wallet/payos/return
 * @desc    Handle PayOS return URL
 * @access  Public
 * @note    User is redirected here after successful/failed/cancelled payment
 */
router.get('/payos/return', handlePayOSReturn);

/**
 * @route   GET /api/wallet/payos/cancel
 * @desc    Handle PayOS cancel URL
 * @access  Public
 * @note    Uses the same handler so Wallet can redirect back cleanly after cancellation
 */
router.get('/payos/cancel', handlePayOSReturn);

// ==================== PROTECTED ROUTES (Require authentication) ====================

// All routes below require authentication
router.use(protect);

/**
 * @route   GET /api/wallet/payos/status/:orderCode
 * @desc    Sync and get PayOS deposit status for current user
 * @access  Private
 */
router.get('/payos/status/:orderCode', getPayOSDepositStatus);

/**
 * @route   GET /api/wallet
 * @desc    Get current user's wallet info
 * @access  Private
 * @returns { balance, currency, totalDeposited, totalSpent, formattedBalance }
 */
router.get('/', getWallet);

/**
 * @route   POST /api/wallet/deposit
 * @desc    Create PayOS payment link to deposit money
 * @access  Private
 * @body    { amount: number, note?: string }
 * @returns { checkoutUrl, qrCode, orderCode, transactionCode, amount, expiredAt }
 */
router.post('/deposit', deposit);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history
 * @access  Private
 * @query   type, status, method, from, to, page, limit, sortBy, sortOrder
 */
router.get('/transactions', getTransactions);

/**
 * @route   GET /api/wallet/transactions/:id
 * @desc    Get transaction detail by ID
 * @access  Private (user can only see their own transactions)
 */
router.get('/transactions/:id', getTransactionById);

module.exports = router;
