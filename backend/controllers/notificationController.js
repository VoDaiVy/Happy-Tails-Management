/**
 * Notification Controller
 * HTTP handlers for user notification endpoints
 * Admin notification handlers are in adminController.js
 */

const { catchAsync } = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');
const { getNotificationsQuerySchema } = require('../validations/notification.validation');
const { createError } = require('../utils/AppError');

// ── USER ENDPOINTS ────────────────────────────────────────────────────────────

/**
 * Get paginated notifications for the current user
 * @route   GET /api/notifications
 * @access  Private (User)
 */
exports.getNotifications = catchAsync(async (req, res) => {
  const { error, value } = getNotificationsQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return res.status(400).json(ApiResponse.error('Validation failed', details));
  }

  const result = await notificationService.getNotifications(req.user._id, value);
  res.status(200).json(
    ApiResponse.success('Notifications fetched successfully', result.data, result.pagination)
  );
});

/**
 * Get unread notification badge count
 * @route   GET /api/notifications/unread-count
 * @access  Private (User)
 */
exports.getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user._id);
  res.status(200).json(ApiResponse.success('Unread count fetched', result));
});

/**
 * Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private (User)
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await notificationService.markAsRead(req.user._id, req.params.id);
  res.status(200).json(ApiResponse.success('Notification marked as read', { notification }));
});

/**
 * Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private (User)
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  res.status(200).json(ApiResponse.success('All notifications marked as read', result));
});

/**
 * Delete one notification
 * @route   DELETE /api/notifications/:id
 * @access  Private (User)
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const result = await notificationService.deleteNotification(req.user._id, req.params.id);
  res.status(200).json(ApiResponse.success('Notification deleted', result));
});

/**
 * Delete all read notifications
 * @route   DELETE /api/notifications/read
 * @access  Private (User)
 */
exports.deleteAllRead = catchAsync(async (req, res) => {
  const result = await notificationService.deleteAllRead(req.user._id);
  res.status(200).json(ApiResponse.success('Read notifications deleted', result));
});

