/**
 * Admin Controller
 * Administrative operations (user management, system statistics, etc.)
 */

const User = require('../models/User');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Service = require('../models/Service');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all users
 * @route GET /api/admin/users
 * @access Private (Admin)
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { role, isActive, search } = req.query;
  
  const filter = { isDeleted: false };
  
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('-password -refreshTokens -twoFactorSecret -twoFactorBackupCodes')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

/**
 * Get user by ID
 * @route GET /api/admin/users/:id
 * @access Private (Admin)
 */
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshTokens -twoFactorSecret -twoFactorBackupCodes');

  if (!user || user.isDeleted) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

/**
 * Update user role
 * @route PUT /api/admin/users/:id/role
 * @access Private (Admin)
 */
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!['customer', 'staff', 'admin'].includes(role)) {
    return next(new AppError('Invalid role', 400, 'INVALID_ROLE'));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully',
    data: { user }
  });
});

/**
 * Ban/Unban user
 * @route PUT /api/admin/users/:id/ban
 * @access Private (Admin)
 */
exports.toggleUserBan = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user || user.isDeleted) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // Cannot ban yourself
  if (user.id === req.user.id) {
    return next(new AppError('You cannot ban yourself', 400, 'CANNOT_BAN_SELF'));
  }

  // Cannot ban other admins
  if (user.role === 'admin') {
    return next(new AppError('You cannot ban other administrators', 400, 'CANNOT_BAN_ADMIN'));
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: `User ${user.isActive ? 'unbanned' : 'banned'} successfully`,
    data: { user }
  });
});

/**
 * Delete user (soft delete)
 * @route DELETE /api/admin/users/:id
 * @access Private (Admin)
 */
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user || user.isDeleted) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // Cannot delete yourself
  if (user.id === req.user.id) {
    return next(new AppError('You cannot delete yourself', 400, 'CANNOT_DELETE_SELF'));
  }

  // Cannot delete other admins
  if (user.role === 'admin') {
    return next(new AppError('You cannot delete other administrators', 400, 'CANNOT_DELETE_ADMIN'));
  }

  user.isDeleted = true;
  user.isActive = false;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
    data: null
  });
});

/**
 * Get system statistics
 * @route GET /api/admin/statistics
 * @access Private (Admin)
 */
exports.getSystemStatistics = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    totalCustomers,
    totalStaff,
    totalBookings,
    pendingBookings,
    completedBookings,
    totalRevenue,
    totalServices
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ role: 'customer', isDeleted: false }),
    User.countDocuments({ role: 'staff', isDeleted: false }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'pending' }),
    Booking.countDocuments({ status: 'completed' }),
    Transaction.aggregate([
      { $match: { status: 'completed', type: { $in: ['payment', 'deposit'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Service.countDocuments({ isActive: true })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      statistics: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          staff: totalStaff
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          completed: completedBookings
        },
        revenue: totalRevenue[0]?.total || 0,
        services: totalServices
      }
    }
  });
});

/**
 * Get staff list
 * @route GET /api/admin/staff
 * @access Private (Admin, Staff)
 */
exports.getStaffList = catchAsync(async (req, res, next) => {
  const staff = await User.find({
    role: 'staff',
    isDeleted: false,
    isActive: true
  }).select('name email role');

  res.status(200).json({
    status: 'success',
    results: staff.length,
    data: { staff }
  });
});

// ==================== NEW ADMIN DASHBOARD APIs ====================

const adminService = require('../services/admin.service');
const ApiResponse = require('../utils/ApiResponse');
const { validate, validateQuery } = require('../middleware/validate');
const {
  blockUserSchema,
  getUsersQuerySchema,
  getRevenueQuerySchema,
  getTopServicesQuerySchema,
  getSystemTransactionsQuerySchema,
  getTransactionSummaryQuerySchema,
  transactionIdParamSchema
} = require('../validations/admin.validation');
const { sendCSVResponse, convertToCSV, TRANSACTION_CSV_FIELDS } = require('../utils/exportCsv');

/**
 * Get users list with filter, search, and pagination
 * @route GET /api/admin/users/list
 * @access Private (Admin)
 */
exports.getUsersList = catchAsync(async (req, res, next) => {
  // Validate query
  const { error, value } = getUsersQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    const errors = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, '')
    }));
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }
  
  const result = await adminService.getUsers(value);
  
  res.status(200).json(ApiResponse.success('Users fetched successfully', result.data, result.pagination));
});

/**
 * Get user detail by ID
 * @route GET /api/admin/users/:id/detail
 * @access Private (Admin)
 */
exports.getUserDetail = catchAsync(async (req, res, next) => {
  const user = await adminService.getUserById(req.params.id);
  
  res.status(200).json(ApiResponse.success('User fetched successfully', { user }));
});

/**
 * Block a user account
 * @route PUT /api/admin/users/:id/block
 * @access Private (Admin)
 */
exports.blockUserAccount = catchAsync(async (req, res, next) => {
  // Validate body
  const { error, value } = blockUserSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }
  
  const result = await adminService.blockUser(req.params.id, req.user._id, value.reason);
  
  res.status(200).json(ApiResponse.success(result.message, { user: result.user }));
});

/**
 * Unblock a user account
 * @route PUT /api/admin/users/:id/unblock
 * @access Private (Admin)
 */
exports.unblockUserAccount = catchAsync(async (req, res, next) => {
  const result = await adminService.unblockUser(req.params.id, req.user._id);
  
  res.status(200).json(ApiResponse.success(result.message, { user: result.user }));
});

/**
 * Get dashboard overview statistics
 * @route GET /api/admin/stats/overview
 * @access Private (Admin)
 */
exports.getOverview = catchAsync(async (req, res, next) => {
  const data = await adminService.getOverview();
  
  res.status(200).json(ApiResponse.success('Overview fetched successfully', data));
});

/**
 * Get revenue statistics with chart data
 * @route GET /api/admin/stats/revenue
 * @access Private (Admin)
 */
exports.getRevenueStats = catchAsync(async (req, res, next) => {
  // Validate query
  const { error, value } = getRevenueQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    const customError = error.details.find(d => d.type === 'any.custom');
    if (customError) {
      return next(new AppError(customError.context.message, 400, 'VALIDATION_ERROR'));
    }
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }
  
  const data = await adminService.getRevenueStats(value);
  
  res.status(200).json(ApiResponse.success('Revenue stats fetched successfully', data));
});

/**
 * Get top services by revenue
 * @route GET /api/admin/stats/top-services
 * @access Private (Admin)
 */
exports.getTopServices = catchAsync(async (req, res, next) => {
  // Validate query
  const { error, value } = getTopServicesQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }
  
  const data = await adminService.getTopServices(value);
  
  res.status(200).json(ApiResponse.success('Top services fetched successfully', data));
});

// ==================== TRANSACTION MANAGEMENT (UC-39) ====================

/**
 * Get all system transactions with filters
 * @route GET /api/admin/transactions
 * @access Private (Admin)
 */
exports.getSystemTransactions = catchAsync(async (req, res, next) => {
  // Validate query
  const { error, value } = getSystemTransactionsQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    const customError = error.details.find(d => d.type === 'any.custom');
    if (customError) {
      return next(new AppError(customError.context.message, 400, 'VALIDATION_ERROR'));
    }
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }
  
  const result = await adminService.getSystemTransactions(value);
  
  res.status(200).json(ApiResponse.success('Transactions fetched successfully', result.data, result.pagination));
});

/**
 * Get transaction summary statistics
 * @route GET /api/admin/transactions/summary
 * @access Private (Admin)
 */
exports.getTransactionSummary = catchAsync(async (req, res, next) => {
  // Validate query
  const { error, value } = getTransactionSummaryQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    const customError = error.details.find(d => d.type === 'any.custom');
    if (customError) {
      return next(new AppError(customError.context.message, 400, 'VALIDATION_ERROR'));
    }
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }
  
  const data = await adminService.getTransactionSummary(value);
  
  res.status(200).json(ApiResponse.success('Transaction summary fetched successfully', data));
});

/**
 * Get any transaction by ID (Admin can see any transaction)
 * @route GET /api/admin/transactions/:id
 * @access Private (Admin)
 */
exports.getTransactionByIdAdmin = catchAsync(async (req, res, next) => {
  // Validate params
  const { error, value } = transactionIdParamSchema.validate(req.params, {
    abortEarly: false
  });
  
  if (error) {
    return next(new AppError('Invalid transaction ID format', 400, 'INVALID_TRANSACTION_ID'));
  }
  
  const transaction = await adminService.getTransactionByIdAdmin(value.id);
  
  res.status(200).json(ApiResponse.success('Transaction fetched successfully', { transaction }));
});

/**
 * Export transactions to CSV
 * @route GET /api/admin/transactions/export
 * @access Private (Admin)
 */
exports.exportTransactions = catchAsync(async (req, res, next) => {
  // Validate query (same as getSystemTransactions but without pagination)
  const { error, value } = getSystemTransactionsQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    const customError = error.details.find(d => d.type === 'any.custom');
    if (customError) {
      return next(new AppError(customError.context.message, 400, 'VALIDATION_ERROR'));
    }
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }
  
  // Get transactions for export (no pagination, max 10k)
  const transactions = await adminService.getTransactionsForExport(value);
  
  // Flatten data for CSV
  const flattenedData = transactions.map(tx => ({
    transactionCode: tx.transactionCode,
    type: tx.type,
    method: tx.method,
    amount: tx.amount,
    balanceBefore: tx.balanceBefore,
    balanceAfter: tx.balanceAfter,
    status: tx.status,
    userName: tx.userId?.fullName || 'N/A',
    userEmail: tx.userId?.email || 'N/A',
    note: tx.note || '',
    failureReason: tx.failureReason || '',
    referenceId: tx.referenceId || '',
    createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : ''
  }));
  
  // Convert to CSV
  const csvString = convertToCSV(flattenedData, TRANSACTION_CSV_FIELDS);
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `transactions_export_${timestamp}.csv`;
  
  // Send CSV response
  sendCSVResponse(res, csvString, filename);
});

// ==================== NOTIFICATION MANAGEMENT ====================

const notificationService = require('../services/notification.service');
const {
  sendNotificationSchema,
  broadcastNotificationSchema
} = require('../validations/notification.validation');

/**
 * Send a notification to a specific user (or all users if userId === 'all')
 * @route   POST /api/admin/notifications/send
 * @access  Private (Admin)
 */
exports.sendNotification = catchAsync(async (req, res, next) => {
  const { error, value } = sendNotificationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }

  const { userId, ...payload } = value;

  if (userId === 'all') {
    const result = await notificationService.broadcast(payload, {});
    return res.status(200).json(ApiResponse.success('Broadcast sent', result));
  }

  // Verify target user exists before sending
  const targetUser = await User.findOne({ _id: userId, isDeleted: false });
  if (!targetUser) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  const notification = await notificationService.send(userId, payload);
  res.status(200).json(ApiResponse.success('Notification sent', { notification }));
});

/**
 * Broadcast a notification to all users (or a filtered subset)
 * @route   POST /api/admin/notifications/broadcast
 * @access  Private (Admin)
 */
exports.broadcastNotification = catchAsync(async (req, res, next) => {
  const { error, value } = broadcastNotificationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
  }

  const { userFilter, ...payload } = value;
  const result = await notificationService.broadcast(payload, userFilter || {});

  res.status(200).json(ApiResponse.success('Broadcast sent successfully', result));
});
