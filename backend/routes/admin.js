/**
 * Admin Routes
 * Administrative operations
 */

const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserBan,
  deleteUser,
  getSystemStatistics,
  getStaffList,
  // New Admin Dashboard APIs
  getUsersList,
  getUserDetail,
  blockUserAccount,
  unblockUserAccount,
  getOverview,
  getRevenueStats,
  getTopServices
} = require('../controllers/adminController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// System statistics (legacy)
router.get('/statistics', getSystemStatistics);  // GET /api/admin/statistics - Get system statistics

// Staff management (accessible to staff for viewing only)
router.get('/staff', restrictTo('admin', 'staff'), getStaffList);  // GET /api/admin/staff - Get staff list

// ==================== NEW ADMIN DASHBOARD APIs ====================

// Statistics
router.get('/stats/overview', getOverview);  // GET /api/admin/stats/overview - Dashboard overview
router.get('/stats/revenue', getRevenueStats);  // GET /api/admin/stats/revenue - Revenue chart
router.get('/stats/top-services', getTopServices);  // GET /api/admin/stats/top-services - Top services

// User management with pagination (MUST be before /users/:id)
router.get('/users/list', getUsersList);  // GET /api/admin/users/list - Get users with pagination & filters

// Block/Unblock users
router.put('/users/:id/block', blockUserAccount);  // PUT /api/admin/users/:id/block - Block user
router.put('/users/:id/unblock', unblockUserAccount);  // PUT /api/admin/users/:id/unblock - Unblock user

// User detail (new)
router.get('/users/:id/detail', getUserDetail);  // GET /api/admin/users/:id/detail - Get user detail

// User management (legacy)
router.get('/users', getAllUsers);  // GET /api/admin/users - Get all users
router.get('/users/:id', getUserById);  // GET /api/admin/users/:id - Get user by ID
router.put('/users/:id/role', updateUserRole);  // PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/ban', toggleUserBan);  // PUT /api/admin/users/:id/ban - Ban/Unban user
router.delete('/users/:id', deleteUser);  // DELETE /api/admin/users/:id - Delete user

module.exports = router;
