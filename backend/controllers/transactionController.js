/**
 * Transaction Controller
 * Handles financial transaction operations
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get my transactions
 * @route GET /api/transactions/my
 * @access Private (Customer)
 */
exports.getMyTransactions = catchAsync(async (req, res, next) => {
  const { type, status } = req.query;
  
  const filter = { user: req.user.id };
  if (type) filter.type = type;
  if (status) filter.status = status;

  const transactions = await Transaction.find(filter)
    .populate('booking', 'bookingNumber')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: { transactions }
  });
});

/**
 * Get all transactions
 * @route GET /api/transactions
 * @access Private (Admin)
 */
exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const { type, status, user, startDate, endDate } = req.query;
  
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (user) filter.user = user;
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const transactions = await Transaction.find(filter)
    .populate('user', 'name email')
    .populate('booking', 'bookingNumber')
    .populate('processedBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: { transactions }
  });
});

/**
 * Get transaction by ID
 * @route GET /api/transactions/:id
 * @access Private (Customer - own, Admin)
 */
exports.getTransactionById = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate('user booking processedBy');

  if (!transaction) {
    return next(new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND'));
  }

  // Check permission
  if (req.user.role === 'customer' && transaction.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this transaction', 403, 'FORBIDDEN'));
  }

  res.status(200).json({
    status: 'success',
    data: { transaction }
  });
});

/**
 * Create deposit transaction
 * @route POST /api/transactions/deposit
 * @access Private (Customer)
 */
exports.createDeposit = catchAsync(async (req, res, next) => {
  const { amount, paymentMethod, description } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError('Invalid amount', 400, 'INVALID_AMOUNT'));
  }

  const transaction = await Transaction.create({
    user: req.user.id,
    type: 'deposit',
    amount,
    paymentMethod,
    description,
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    message: 'Deposit request created successfully',
    data: { transaction }
  });
});

/**
 * Create withdrawal transaction
 * @route POST /api/transactions/withdraw
 * @access Private (Customer)
 */
exports.createWithdrawal = catchAsync(async (req, res, next) => {
  const { amount, paymentMethod, description } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError('Invalid amount', 400, 'INVALID_AMOUNT'));
  }

  const transaction = await Transaction.create({
    user: req.user.id,
    type: 'withdrawal',
    amount,
    paymentMethod,
    description,
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    message: 'Withdrawal request created successfully',
    data: { transaction }
  });
});

/**
 * Process transaction (approve/reject)
 * @route PUT /api/transactions/:id/process
 * @access Private (Admin)
 */
exports.processTransaction = catchAsync(async (req, res, next) => {
  const { status, notes } = req.body;

  if (!['completed', 'failed', 'cancelled'].includes(status)) {
    return next(new AppError('Invalid status', 400, 'INVALID_STATUS'));
  }

  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    return next(new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND'));
  }

  if (transaction.status !== 'pending') {
    return next(new AppError('Transaction has already been processed', 400, 'ALREADY_PROCESSED'));
  }

  transaction.status = status;
  transaction.notes = notes;
  transaction.processedBy = req.user.id;
  transaction.processedAt = Date.now();

  await transaction.save();
  await transaction.populate('user processedBy');

  res.status(200).json({
    status: 'success',
    message: 'Transaction processed successfully',
    data: { transaction }
  });
});

/**
 * Get revenue statistics
 * @route GET /api/transactions/statistics/revenue
 * @access Private (Admin)
 */
exports.getRevenueStatistics = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const matchStage = {
    status: 'completed',
    type: { $in: ['payment', 'deposit'] }
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const statistics = await Transaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      statistics: statistics[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        averageAmount: 0
      }
    }
  });
});
