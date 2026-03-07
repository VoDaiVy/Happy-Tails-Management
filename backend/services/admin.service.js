/**
 * Admin Service
 * Business logic for admin operations: user management and statistics
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const { createError } = require('../utils/AppError');

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
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } }
    ]),
    User.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      isDeleted: false
    }),
    Order.countDocuments({
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
 * Note: This aggregation can be slow on large datasets.
 * Recommend adding index { status: 1, createdAt: -1 } on Order model.
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
          { $toString: { $isoWeekYear: '$createdAt' } },
          '-W',
          {
            $cond: {
              if: { $lt: [{ $isoWeek: '$createdAt' }, 10] },
              then: { $concat: ['0', { $toString: { $isoWeek: '$createdAt' } }] },
              else: { $toString: { $isoWeek: '$createdAt' } }
            }
          }
        ]
      };
      break;
    case 'month':
      dateExpression = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      break;
    case 'day':
    default:
      dateExpression = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  }
  
  // Aggregation pipeline
  const chart = await Order.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: fromDate, $lte: toDate }
      }
    },
    {
      $group: {
        _id: dateExpression,
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
        avgValue: { $avg: '$totalPrice' }
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
 * Get top services by revenue
 * Note: $unwind on items[] can be expensive on large datasets.
 * Consider caching result for 5-10 minutes in production.
 * @param {Object} params - Query parameters
 * @param {string|Date} params.from - Start date
 * @param {string|Date} params.to - End date
 * @param {number} [params.limit=10] - Number of top services to return
 * @returns {Promise<{ summary: Object, data: Array }>}
 */
const getTopServices = async ({ from, to, limit = 10 }) => {
  // Use defaults if not provided
  const defaults = getDefaultDateRange();
  const { fromDate, toDate } = normalizeDateRange(from || defaults.from, to || defaults.to);
  
  // Aggregation pipeline
  const result = await Order.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: fromDate, $lte: toDate }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.serviceId',
        serviceName: { $first: '$items.name' },
        totalRevenue: { $sum: '$items.subtotal' },
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: '$items.quantity' },
        avgPrice: { $avg: '$items.price' }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        serviceId: '$_id',
        serviceName: 1,
        totalRevenue: 1,
        totalOrders: 1,
        totalQuantity: 1,
        avgPrice: { $round: ['$avgPrice', 0] }
      }
    }
  ]);
  
  // Calculate grand total and revenue share
  const grandTotal = result.reduce((sum, item) => sum + item.totalRevenue, 0);
  
  const data = result.map((item, index) => ({
    rank: index + 1,
    ...item,
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

module.exports = {
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  getOverview,
  getRevenueStats,
  getTopServices
};
