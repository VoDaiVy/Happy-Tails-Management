/**
 * Notification Controller
 * Handles notification management operations
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get my notifications
 * @route GET /api/notifications/my
 * @access Private (All)
 */
exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const { isRead, type } = req.query;
  
  const filter = { recipient: req.user.id };
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (type) filter.type = type;

  const notifications = await Notification.find(filter)
    .populate('createdBy', 'name email')
    .sort('-createdAt')
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false
  });

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    unreadCount,
    data: { notifications }
  });
});

/**
 * Create notification
 * @route POST /api/notifications
 * @access Private (Staff, Admin)
 */
exports.createNotification = catchAsync(async (req, res, next) => {
  const { recipient, title, message, type, priority, link, metadata } = req.body;

  // Validate recipient exists
  const user = await User.findById(recipient);
  if (!user) {
    return next(new AppError('Recipient not found', 404, 'USER_NOT_FOUND'));
  }

  const notification = await Notification.create({
    recipient,
    title,
    message,
    type,
    priority,
    link,
    metadata,
    createdBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    message: 'Notification created successfully',
    data: { notification }
  });
});

/**
 * Mark notification as read
 * @route PUT /api/notifications/:id/read
 * @access Private (All)
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user.id
  });

  if (!notification) {
    return next(new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND'));
  }

  notification.isRead = true;
  notification.readAt = Date.now();
  await notification.save();

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read',
    data: { notification }
  });
});

/**
 * Mark all notifications as read
 * @route PUT /api/notifications/read-all
 * @access Private (All)
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true, readAt: Date.now() }
  );

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private (All - own, Admin - all)
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  
  // If not admin, can only delete own notifications
  if (req.user.role !== 'admin') {
    filter.recipient = req.user.id;
  }

  const notification = await Notification.findOneAndDelete(filter);

  if (!notification) {
    return next(new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification deleted successfully',
    data: null
  });
});

/**
 * Get all notifications (Admin/Staff)
 * @route GET /api/notifications
 * @access Private (Staff, Admin)
 */
exports.getAllNotifications = catchAsync(async (req, res, next) => {
  const { recipient, type, isRead } = req.query;
  
  const filter = {};
  if (recipient) filter.recipient = recipient;
  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const notifications = await Notification.find(filter)
    .populate('recipient createdBy', 'name email')
    .sort('-createdAt')
    .limit(100);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: { notifications }
  });
});

/**
 * Update notification
 * @route PUT /api/notifications/:id
 * @access Private (Staff, Admin)
 */
exports.updateNotification = catchAsync(async (req, res, next) => {
  const { title, message, type, priority, link } = req.body;

  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { title, message, type, priority, link },
    { new: true, runValidators: true }
  );

  if (!notification) {
    return next(new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification updated successfully',
    data: { notification }
  });
});
