/**
 * Notification Routes
 * Notification management
 */

const express = require('express');
const {
  getMyNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getAllNotifications,
  updateNotification
} = require('../controllers/notificationController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// Routes for all authenticated users
router.get('/my', getMyNotifications);  // GET /api/notifications/my - Get my notifications
router.put('/read-all', markAllAsRead);  // PUT /api/notifications/read-all - Mark all as read
router.put('/:id/read', markAsRead);  // PUT /api/notifications/:id/read - Mark notification as read
router.delete('/:id', deleteNotification);  // DELETE /api/notifications/:id - Delete notification

// Staff and Admin routes
router.get('/', restrictTo('staff', 'admin'), getAllNotifications);  // GET /api/notifications - Get all notifications
router.post('/', restrictTo('staff', 'admin'), createNotification);  // POST /api/notifications - Create notification
router.put('/:id', restrictTo('staff', 'admin'), updateNotification);  // PUT /api/notifications/:id - Update notification

module.exports = router;
