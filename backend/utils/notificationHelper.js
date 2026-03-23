/**
 * Notification Helper
 * Centralized utility for creating automatic notifications
 * triggered by system events (booking status changes, medical record updates, etc.)
 */

const notificationService = require("../services/notification.service");

const TYPE_MAP = {
  booking: "order",
  order: "order",
  payment: "payment",
  reminder: "system",
  system: "system",
  promotion: "promotion",
  general: "system",
  account: "account",
};

const normalizeType = (type) => TYPE_MAP[String(type || "").toLowerCase()] || "system";

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
    await notificationService.send(recipientId, {
      title: String(title || "Thông báo"),
      body: String(message || "Bạn có thông báo mới."),
      type: normalizeType(type),
      actionUrl: options.actionUrl || options.link || null,
      imageUrl: options.imageUrl || null,
      metadata: {
        ...(options.metadata || {}),
        sourceType: String(type || "system"),
        priority: options.priority || "medium",
      },
    });
  } catch (err) {
    // Never let a notification failure break the main flow
    console.error("[notificationHelper] Failed to create notification:", err.message);
  }
};

module.exports = { sendAutoNotification };
