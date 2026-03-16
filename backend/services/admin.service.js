/**
 * Admin Service
 * Business logic for admin operations: user management, statistics, and transactions
 * 
 * ✅ ADDED: getSystemTransactions(), getTransactionSummary(), getTransactionByIdAdmin(), getTransactionsForExport() (UC-39)
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const { createError } = require('../utils/AppError');
const notificationService = require('./notification.service');
const { NOTIFICATION_TEMPLATES } = require('../constants/notification.constants');

// ==================== PRIVATE HELPERS ====================

/**
 * Normalize date range to start and end of day
 * @param {string|Date} from - Start date
 * @param {string|Date} to - End date
 * @returns {{ fromDate: Date, toDate: Date }}
 * @private
 */
const normalizeDateRange = (from, to) => {
  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  
  return { fromDate, toDate };
};

/**
 * Get default date range (30 days ago to today)
 * @returns {{ from: Date, to: Date }}
 * @private
 */
const getDefaultDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
};

/**
 * Validate if string is valid MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean}
 * @private
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ==================== USER MANAGEMENT ====================

/**
 * Get users list with filter, search, and pagination
 * @param {Object} query - Query parameters
 * @param {string} [query.search] - Search term for name, email, phone
 * @param {boolean} [query.isBlocked] - Filter by blocked status
 * @param {string} [query.role] - Filter by role
 * @param {number} [query.page=1] - Page number
 * @param {number} [query.limit=10] - Items per page
 * @param {string} [query.sortBy='createdAt'] - Sort field
 * @param {string} [query.sortOrder='desc'] - Sort direction
 * @returns {Promise<{ data: User[], pagination: Object }>}
 */
const getUsers = async ({ search, isBlocked, role, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) => {
  const filter = { isDeleted: false };
  
  // Search filter
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Block status filter
  if (typeof isBlocked === 'boolean') {
    filter.isBlocked = isBlocked;
  }
  
  // Role filter
  if (role) {
    filter.role = role;
  }
  
  // Build sort object
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  
  // Execute queries in parallel
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshTokens -twoFactorSecret -twoFactorBackupCodes -__v')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: users,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Get user by ID with populated blockedBy
 * @param {string} id - User ID
 * @returns {Promise<User>}
 * @throws {ApiError} 400 if invalid ID format
 * @throws {ApiError} 404 if user not found
 */
const getUserById = async (id) => {
  if (!isValidObjectId(id)) {
    throw createError.badRequest('Invalid user ID format');
  }
  
  const user = await User.findOne({ _id: id, isDeleted: false })
    .select('-password -refreshTokens -twoFactorSecret -twoFactorBackupCodes -__v')
    .populate('blockedBy', 'name email')
    .lean();
  
  if (!user) {
    throw createError.notFound('User not found');
  }
  
  return user;
};

/**
 * Block a user account
 * @param {string} targetUserId - ID of user to block
 * @param {string} adminId - ID of admin performing the action
 * @param {string} [reason] - Reason for blocking
 * @returns {Promise<{ user: User, message: string }>}
 * @throws {ApiError} 400 if invalid ID, already blocked, or blocking self
 * @throws {ApiError} 403 if trying to block another admin
 * @throws {ApiError} 404 if user not found
 */
const blockUser = async (targetUserId, adminId, reason) => {
  if (!isValidObjectId(targetUserId)) {
    throw createError.badRequest('Invalid user ID format');
  }
  
  // Cannot block yourself
  if (targetUserId === adminId.toString()) {
    throw createError.badRequest('Cannot block yourself');
  }
  
  const user = await User.findOne({ _id: targetUserId, isDeleted: false });
  
  if (!user) {
    throw createError.notFound('User not found');
  }
  
  // Cannot block another admin
  if (user.role === 'admin') {
    throw createError.forbidden('Cannot block another admin account');
  }
  
  // Check if already blocked
  if (user.isBlocked) {
    throw createError.badRequest('User is already blocked');
  }
  
  // Block the user
  await user.block(adminId, reason);

  // Notify: account blocked (fire-and-forget)
  setImmediate(() => {
    notificationService.send(
      targetUserId,
      NOTIFICATION_TEMPLATES.ACCOUNT_BLOCKED(reason)
    ).catch(err => console.error('[Notif] account_blocked:', err.message));
  });
  
  // Fetch updated user with populated blockedBy
  const updatedUser = await User.findById(targetUserId)
    .select('-password -refreshTokens -twoFactorSecret -twoFactorBackupCodes -__v')
    .populate('blockedBy', 'name email')
    .lean();
  
  return {
    user: updatedUser,
    message: 'User has been blocked successfully'
  };
};

/**
 * Unblock a user account
 * @param {string} targetUserId - ID of user to unblock
 * @param {string} adminId - ID of admin performing the action
 * @returns {Promise<{ user: User, message: string }>}
 * @throws {ApiError} 400 if invalid ID or user not blocked
 * @throws {ApiError} 404 if user not found
 */
const unblockUser = async (targetUserId, adminId) => {
  if (!isValidObjectId(targetUserId)) {
    throw createError.badRequest('Invalid user ID format');
  }
  
  const user = await User.findOne({ _id: targetUserId, isDeleted: false });
  
  if (!user) {
    throw createError.notFound('User not found');
  }
  
  // Check if not blocked
  if (!user.isBlocked) {
    throw createError.badRequest('User is not currently blocked');
  }
  
  // Unblock the user
  await user.unblock();

  // Notify: account restored (fire-and-forget)
  setImmediate(() => {
    notificationService.send(
      targetUserId,
      NOTIFICATION_TEMPLATES.ACCOUNT_UNBLOCKED()
    ).catch(err => console.error('[Notif] account_unblocked:', err.message));
  });
  
  // Fetch updated user
  const updatedUser = await User.findById(targetUserId)
    .select('-password -refreshTokens -twoFactorSecret -twoFactorBackupCodes -__v')
    .lean();
  
  return {
    user: updatedUser,
    message: 'User has been unblocked successfully'
  };
};

// ==================== STATISTICS ====================

/**
 * Get dashboard overview statistics
 * Uses Promise.all for parallel query execution for better performance
 * @returns {Promise<Object>} Overview statistics
 */
const getOverview = async () => {
  // Get start and end of today for "new today" queries
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  
  // Run all queries in parallel for better performance
  const [
    totalUsers,
    totalAdmins,
    blockedUsers,
    totalOrders,
    pendingOrders,
    revenueResult,
    newUsersToday,
    newOrdersToday
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['customer', 'staff'] }, isDeleted: false }),
    User.countDocuments({ role: 'admin', isDeleted: false }),
    User.countDocuments({ isBlocked: true, isDeleted: false }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'pending' }),
    Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]),
    User.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      isDeleted: false
    }),
    Booking.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    })
  ]);
  
  const completedOrders = revenueResult[0]?.count || 0;
  const totalRevenue = revenueResult[0]?.total || 0;
  const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;
  
  return {
    totalUsers,
    totalAdmins,
    blockedUsers,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue,
    avgOrderValue,
    newUsersToday,
    newOrdersToday
  };
};

/**
 * Get revenue statistics with chart data
 * Revenue is based on completed bookings within the selected period.
 * Uses completedAt when available, falls back to updatedAt.
 * @param {Object} params - Query parameters
 * @param {string|Date} params.from - Start date
 * @param {string|Date} params.to - End date
 * @param {string} [params.groupBy='day'] - Grouping: day, week, or month
 * @returns {Promise<{ summary: Object, chart: Array }>}
 */
const getRevenueStats = async ({ from, to, groupBy = 'day' }) => {
  // Use defaults if not provided
  const defaults = getDefaultDateRange();
  const { fromDate, toDate } = normalizeDateRange(from || defaults.from, to || defaults.to);
  
  // Build date grouping expression based on groupBy
  let dateExpression;
  
  switch (groupBy) {
    case 'week':
      dateExpression = {
        $concat: [
          { $toString: { $isoWeekYear: '$revenueDate' } },
          '-W',
          {
            $cond: {
              if: { $lt: [{ $isoWeek: '$revenueDate' }, 10] },
              then: { $concat: ['0', { $toString: { $isoWeek: '$revenueDate' } }] },
              else: { $toString: { $isoWeek: '$revenueDate' } }
            }
          }
        ]
      };
      break;
    case 'month':
      dateExpression = { $dateToString: { format: '%Y-%m', date: '$revenueDate' } };
      break;
    case 'day':
    default:
      dateExpression = { $dateToString: { format: '%Y-%m-%d', date: '$revenueDate' } };
  }
  
  // Aggregation pipeline
  const chart = await Booking.aggregate([
    { $match: { status: 'completed' } },
    {
      $addFields: {
        revenueDate: { $ifNull: ['$completedAt', '$updatedAt'] }
      }
    },
    {
      $match: {
        revenueDate: { $gte: fromDate, $lte: toDate }
      }
    },
    {
      $group: {
        _id: dateExpression,
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        avgValue: { $avg: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        revenue: 1,
        orders: 1,
        avgValue: { $round: ['$avgValue', 0] }
      }
    }
  ]);
  
  // Calculate summary
  const totalRevenue = chart.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = chart.reduce((sum, item) => sum + item.orders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  
  return {
    summary: {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      periodFrom: fromDate.toISOString().split('T')[0],
      periodTo: toDate.toISOString().split('T')[0],
      groupBy
    },
    chart
  };
};

/**
 * Get top services by number of completed booking orders.
 * @param {Object} params - Query parameters
 * @param {string|Date} params.from - Start date
 * @param {string|Date} params.to - End date
 * @param {number} [params.limit=3] - Number of top services to return
 * @returns {Promise<{ summary: Object, data: Array }>}
 */
const getTopServices = async ({ from, to, limit = 3 }) => {
  // Use defaults if not provided
  const defaults = getDefaultDateRange();
  const { fromDate, toDate } = normalizeDateRange(from || defaults.from, to || defaults.to);
  
  // Aggregation pipeline
  const result = await Booking.aggregate([
    { $match: { status: 'completed' } },
    {
      $addFields: {
        revenueDate: { $ifNull: ['$completedAt', '$updatedAt'] }
      }
    },
    {
      $match: {
        revenueDate: { $gte: fromDate, $lte: toDate }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.service',
        totalRevenue: {
          $sum: {
            $multiply: [
              { $ifNull: ['$items.price', 0] },
              { $ifNull: ['$items.quantity', 1] },
            ],
          },
        },
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: { $ifNull: ['$items.quantity', 1] } },
        avgPrice: { $avg: '$items.price' }
      }
    },
    {
      $lookup: {
        from: 'services',
        localField: '_id',
        foreignField: '_id',
        as: 'serviceDoc',
      }
    },
    { $sort: { totalOrders: -1, totalRevenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        serviceId: '$_id',
        serviceName: {
          $ifNull: [
            { $arrayElemAt: ['$serviceDoc.name', 0] },
            'Unknown service',
          ],
        },
        totalRevenue: 1,
        totalOrders: 1,
        totalQuantity: 1,
        avgPrice: { $round: ['$avgPrice', 0] }
      }
    }
  ]);
  
  // Calculate totals and order share
  const grandTotal = result.reduce((sum, item) => sum + item.totalRevenue, 0);
  const grandOrders = result.reduce((sum, item) => sum + item.totalOrders, 0);
  
  const data = result.map((item, index) => ({
    rank: index + 1,
    ...item,
    orderShare: grandOrders > 0
      ? ((item.totalOrders / grandOrders) * 100).toFixed(2) + '%'
      : '0.00%',
    revenueShare: grandTotal > 0 
      ? ((item.totalRevenue / grandTotal) * 100).toFixed(2) + '%'
      : '0.00%'
  }));
  
  return {
    summary: {
      totalRevenue: grandTotal,
      totalServices: data.length,
      periodFrom: fromDate.toISOString().split('T')[0],
      periodTo: toDate.toISOString().split('T')[0]
    },
    data
  };
};

// ==================== TRANSACTION MANAGEMENT (UC-39) ====================

/**
 * Get all system transactions with filters (Admin)
 * @param {Object} query - Query parameters
 * @returns {Promise<{ data: Transaction[], pagination: Object }>}
 */
const getSystemTransactions = async (query = {}) => {
  const {
    userId,
    type,
    status,
    method,
    from,
    to,
    minAmount,
    maxAmount,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;
  
  // Step 1: Build filter dynamically
  const filter = {};
  
  if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (method) filter.method = method;
  
  // Amount range filter
  if (minAmount !== undefined || maxAmount !== undefined) {
    filter.amount = {};
    if (minAmount !== undefined) filter.amount.$gte = minAmount;
    if (maxAmount !== undefined) filter.amount.$lte = maxAmount;
  }
  
  // Date range filter with proper time boundaries
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from + 'T00:00:00.000Z');
    if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
  }
  
  // Step 2: Build sort + pagination
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;
  
  // Step 3: Execute queries in parallel
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('userId', 'fullName email phone avatar role')
      .populate('walletId', 'balance currency')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter)
  ]);
  
  // Step 4: Return with pagination
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
 * Get transaction summary statistics (Admin)
 * @param {Object} params - Query parameters { from, to }
 * @returns {Promise<Object>} Aggregated statistics
 */
const getTransactionSummary = async ({ from, to } = {}) => {
  // Build date filter (default: last 30 days)
  const defaults = getDefaultDateRange();
  const fromDate = from ? new Date(from + 'T00:00:00.000Z') : defaults.from;
  const toDate = to ? new Date(to + 'T23:59:59.999Z') : defaults.to;
  
  // Run MongoDB aggregation pipeline
  const result = await Transaction.aggregate([
    {
      $match: { createdAt: { $gte: fromDate, $lte: toDate } }
    },
    {
      $facet: {
        // Overall totals
        overall: [
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              avgAmount: { $avg: '$amount' }
            }
          }
        ],
        // Group by type
        byType: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          }
        ],
        // Group by method
        byMethod: [
          {
            $group: {
              _id: '$method',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          }
        ],
        // Group by status
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          }
        ],
        // Daily trend (for mini chart)
        dailyTrend: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          },
          { $sort: { '_id': 1 } },
          { $project: { _id: 0, date: '$_id', count: 1, totalAmount: 1 } }
        ]
      }
    }
  ]);
  
  // Post-process aggregation result
  const overall = result[0].overall[0] || { totalTransactions: 0, totalAmount: 0, avgAmount: 0 };
  
  // Convert byType array → object
  const byType = { deposit: { count: 0, amount: 0 }, payment: { count: 0, amount: 0 }, refund: { count: 0, amount: 0 } };
  result[0].byType.forEach(item => {
    byType[item._id] = { count: item.count, amount: item.totalAmount };
  });
  
  // Convert byMethod array → object
  const byMethod = { payos: { count: 0, amount: 0 }, system: { count: 0, amount: 0 } };
  result[0].byMethod.forEach(item => {
    byMethod[item._id] = { count: item.count, amount: item.totalAmount };
  });
  
  // Convert byStatus array → object
  const byStatus = { pending: { count: 0, amount: 0 }, completed: { count: 0, amount: 0 }, failed: { count: 0, amount: 0 }, cancelled: { count: 0, amount: 0 } };
  result[0].byStatus.forEach(item => {
    byStatus[item._id] = { count: item.count, amount: item.totalAmount };
  });
  
  return {
    period: {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0]
    },
    overall: {
      totalTransactions: overall.totalTransactions,
      totalAmount: overall.totalAmount,
      avgAmount: Math.round(overall.avgAmount || 0)
    },
    byType,
    byMethod,
    byStatus,
    dailyTrend: result[0].dailyTrend
  };
};

/**
 * Get transaction by ID (Admin - can see any transaction)
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Transaction document with populated user and wallet
 */
const getTransactionByIdAdmin = async (transactionId) => {
  if (!isValidObjectId(transactionId)) {
    throw createError.badRequest('Invalid transaction ID format');
  }
  
  const transaction = await Transaction.findById(transactionId)
    .populate('userId', 'fullName email phone avatar role isBlocked')
    .populate('walletId', 'balance currency totalDeposited totalSpent')
    .lean();
  
  if (!transaction) {
    throw createError.notFound('Transaction not found');
  }
  
  return transaction;
};

/**
 * Get transactions for CSV export (Admin)
 * @param {Object} query - Same filters as getSystemTransactions
 * @returns {Promise<Array>} Array of transactions for export
 */
const getTransactionsForExport = async (query = {}) => {
  const {
    userId,
    type,
    status,
    method,
    from,
    to,
    minAmount,
    maxAmount
  } = query;
  
  // Build filter (same logic as getSystemTransactions)
  const filter = {};
  
  if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (method) filter.method = method;
  
  if (minAmount !== undefined || maxAmount !== undefined) {
    filter.amount = {};
    if (minAmount !== undefined) filter.amount.$gte = minAmount;
    if (maxAmount !== undefined) filter.amount.$lte = maxAmount;
  }
  
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from + 'T00:00:00.000Z');
    if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
  }
  
  // Check total count first (hard limit: 10,000)
  const total = await Transaction.countDocuments(filter);
  
  if (total > 10000) {
    throw createError.badRequest('Too many records (max 10,000). Please apply filters to narrow results.');
  }
  
  // Get all matching transactions
  const transactions = await Transaction.find(filter)
    .populate('userId', 'fullName email')
    .select('transactionCode type method amount balanceBefore balanceAfter status note failureReason referenceId createdAt')
    .sort({ createdAt: -1 })
    .lean();
  
  return transactions;
};

module.exports = {
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  getOverview,
  getRevenueStats,
  getTopServices,
  // Transaction management (UC-39)
  getSystemTransactions,
  getTransactionSummary,
  getTransactionByIdAdmin,
  getTransactionsForExport
};
