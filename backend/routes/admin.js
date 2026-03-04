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
  getStaffList
} = require('../controllers/adminController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// System statistics
router.get('/statistics', getSystemStatistics);  // GET /api/admin/statistics - Get system statistics

// Staff management (accessible to staff for viewing only)
router.get('/staff', restrictTo('admin', 'staff'), getStaffList);  // GET /api/admin/staff - Get staff list

// User management
router.get('/users', getAllUsers);  // GET /api/admin/users - Get all users
router.get('/users/:id', getUserById);  // GET /api/admin/users/:id - Get user by ID
router.put('/users/:id/role', updateUserRole);  // PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/ban', toggleUserBan);  // PUT /api/admin/users/:id/ban - Ban/Unban user
router.delete('/users/:id', deleteUser);  // DELETE /api/admin/users/:id - Delete user

module.exports = router;
