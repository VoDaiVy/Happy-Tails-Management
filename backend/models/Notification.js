/**
 * Notification Model
 * Real-time notifications delivered via Socket.IO with MongoDB persistence
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title must be less than 200 characters']
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      maxlength: [1000, 'Body must be less than 1000 characters']
    },
    type: {
      type: String,
      enum: ['system', 'order', 'payment', 'promotion', 'account'],
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    imageUrl: {
      type: String,
      default: null
    },
    // Deep link e.g. '/orders/ORD-xxx' or '/wallet'
    actionUrl: {
      type: String,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // true when socket emit succeeded (user was online at send time)
    isDelivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// ── INDEXES ───────────────────────────────────────────────────────────────────

// Main list query (most recent notifications for a user)
notificationSchema.index({ userId: 1, createdAt: -1 });

// Unread count query
notificationSchema.index({ userId: 1, isRead: 1 });

// Filter by type
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// TTL: auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// ── STATIC METHODS ────────────────────────────────────────────────────────────

/**
 * Create a single notification for one user
 * @param {string|ObjectId} userId
 * @param {Object} payload - { title, body, type, actionUrl, imageUrl, metadata }
 * @returns {Promise<Notification>}
 */
notificationSchema.statics.createForUser = function (userId, payload) {
  return this.create({ userId, ...payload });
};

/**
 * Bulk-create the same notification for multiple users
 * @param {Array<string|ObjectId>} userIds
 * @param {Object} payload
 * @returns {Promise<Array>}
 */
notificationSchema.statics.createForMany = function (userIds, payload) {
  const docs = userIds.map((uid) => ({ userId: uid, ...payload }));
  return this.insertMany(docs, { ordered: false });
};

// ── MODEL ─────────────────────────────────────────────────────────────────────

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
