/**
 * Transaction Routes
 * Financial transaction management
 */

const express = require('express');
const {
  getMyTransactions,
  getAllTransactions,
  getTransactionById,
  createDeposit,
  processTransaction,
  getRevenueStatistics
} = require('../controllers/transactionController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All transaction routes require authentication
router.use(protect);

// Customer routes
router.get('/my', restrictTo('customer'), getMyTransactions);  // GET /api/transactions/my - Get my transactions
router.post('/deposit', restrictTo('customer'), createDeposit);  // POST /api/transactions/deposit - Create deposit

// Admin routes
router.get('/statistics/revenue', restrictTo('admin'), getRevenueStatistics);  // GET /api/transactions/statistics/revenue - Get revenue stats
router.get('/', restrictTo('admin'), getAllTransactions);  // GET /api/transactions - Get all transactions
router.put('/:id/process', restrictTo('admin'), processTransaction);  // PUT /api/transactions/:id/process - Process transaction

// Shared routes (with permission checks)
router.get('/:id', getTransactionById);  // GET /api/transactions/:id - Get transaction details

module.exports = router;
