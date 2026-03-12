/**
 * Notification Routes
 * User-facing notification endpoints (read, mark, delete)
 * Admin notification endpoints live in routes/admin.js
 */

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ⚠️ Static routes MUST be declared before dynamic /:id routes to avoid
//    Express matching 'unread-count', 'read-all', or 'read' as an :id param.

router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/read', notificationController.deleteAllRead);
router.get('/', notificationController.getNotifications);

// Dynamic routes last
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

