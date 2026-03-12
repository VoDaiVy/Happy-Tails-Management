/**
 * Notification Helper
 * Centralized utility for creating automatic notifications
 * triggered by system events (booking status changes, medical record updates, etc.)
 */

const Notification = require('../models/Notification');

/**
 * Send an automatic notification without blocking the calling request.
 * Errors are logged but never propagated.
 *
 * @param {string|ObjectId} recipientId  - The User._id who receives the notification
 * @param {string}          type         - One of: 'booking' | 'payment' | 'reminder' | 'system' | 'promotion' | 'general'
 * @param {string}          title        - Short notification title
 * @param {string}          message      - Full notification body
 * @param {object}          [options]    - Optional: { priority, link, metadata }
 */
const sendAutoNotification = async (recipientId, type, title, message, options = {}) => {
  if (!recipientId) return;
  try {
    await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      priority: options.priority || 'medium',
      link:     options.link     || null,
      metadata: options.metadata || {}
    });
  } catch (err) {
    // Never let a notification failure break the main flow
    console.error('[notificationHelper] Failed to create notification:', err.message);
  }
};

module.exports = { sendAutoNotification };
