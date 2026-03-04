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
