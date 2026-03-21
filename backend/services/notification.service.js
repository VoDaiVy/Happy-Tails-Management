/**
 * Notification Service
 * Core business logic: DB persistence + real-time Socket.IO delivery
 *
 * ⚠️ FIRE-AND-FORGET rule: always call send() with setImmediate() + .catch()
 * from other services. This prevents notification errors from breaking callers.
 */

const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const User = require('../models/User')
const { createError } = require('../utils/AppError')
const { emitToUser, isUserOnline } = require('../config/socket')
const { SOCKET_EVENTS } = require('../constants/notification.constants')

// ── HELPERS ───────────────────────────────────────────────────────────────────

/**
 * Validate that a string is a valid MongoDB ObjectId
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Save notification to DB and emit via Socket.IO if user is online
 * @param {string|ObjectId} userId - recipient
 * @param {Object} payload - { title, body, type, actionUrl, imageUrl, metadata }
 * @returns {Promise<Notification>}
 */
const send = async (userId, payload) => {
  // Step 1: Persist to MongoDB
  const notification = await Notification.createForUser(userId, payload)

  // Step 2: Emit via Socket.IO (non-blocking — socket failure must not propagate)
  try {
    const online = await isUserOnline(userId)

    emitToUser(userId, SOCKET_EVENTS.NEW_NOTIFICATION, {
      _id: notification._id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      isRead: false,
      actionUrl: notification.actionUrl,
      imageUrl: notification.imageUrl,
      metadata: notification.metadata,
      createdAt: notification.createdAt
    })

    if (online) {
      // Mark as delivered and emit fresh unread badge count
      notification.isDelivered = true
      notification.deliveredAt = new Date()
      await notification.save()

      const unreadCount = await Notification.countDocuments({ userId, isRead: false })
      emitToUser(userId, SOCKET_EVENTS.UNREAD_COUNT, { count: unreadCount })
    }
  } catch (socketErr) {
    // Socket failures must never break notification creation
    console.error('[Socket Emit Error]:', socketErr.message)
  }

  return notification
}

/**
 * Send the same notification to multiple users in bulk
 * @param {Array<string|ObjectId>} userIds
 * @param {Object} payload - { title, body, type, actionUrl, imageUrl, metadata }
 * @returns {Promise<{ sent: number, failed: number }>}
 */
const sendToMany = async (userIds, payload) => {
  // Step 1: Bulk insert
  await Notification.createForMany(userIds, payload)

  // Step 2: Emit to each user's private room (best-effort, no await)
  userIds.forEach((uid) => {
    emitToUser(uid, SOCKET_EVENTS.NEW_NOTIFICATION, {
      title: payload.title,
      body: payload.body,
      type: payload.type,
      actionUrl: payload.actionUrl || null,
      imageUrl: payload.imageUrl || null,
      metadata: payload.metadata || {},
      isRead: false,
      createdAt: new Date()
    })
  })

  return { sent: userIds.length, failed: 0 }
}

/**
 * Send a notification to all users (or a filtered subset)
 * @param {Object} payload - notification content
 * @param {Object} [userFilter={}] - additional User.find() filter (e.g. { role, isBlocked })
 * @returns {Promise<{ sent: number, failed: number, total: number }>}
 */
const broadcast = async (payload, userFilter = {}) => {
  const filter = { isDeleted: false, isActive: true, ...userFilter }

  const users = await User.find(filter).select('_id').lean()
  const userIds = users.map((u) => u._id)

  if (userIds.length === 0) {
    return { sent: 0, failed: 0, total: 0 }
  }

  const result = await sendToMany(userIds, payload)
  return { ...result, total: userIds.length }
}

/**
 * Get paginated notifications for a user
 * @param {string|ObjectId} userId
 * @param {Object} query - { isRead, type, page, limit }
 * @returns {Promise<{ data: Notification[], pagination: Object }>}
 */
const getNotifications = async (userId, query = {}) => {
  const { isRead, type, page = 1, limit = 20 } = query

  const filter = { userId }
  if (isRead !== undefined) filter.isRead = isRead
  if (type) filter.type = type

  const skip = (page - 1) * limit
  const sort = { createdAt: -1 }

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter)
  ])

  return {
    data: notifications,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Get unread notification count for a user
 * @param {string|ObjectId} userId
 * @returns {Promise<{ count: number }>}
 */
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ userId, isRead: false })
  return { count }
}

/**
 * Mark a single notification as read (idempotent)
 * @param {string|ObjectId} userId
 * @param {string} notificationId
 * @returns {Promise<Notification>}
 */
const markAsRead = async (userId, notificationId) => {
  if (!isValidObjectId(notificationId)) {
    throw createError.badRequest('Invalid notification ID format', 'INVALID_NOTIFICATION_ID')
  }

  const notification = await Notification.findOne({ _id: notificationId, userId })
  if (!notification) {
    throw createError.notFound('Notification not found')
  }

  // Idempotent — already read means nothing to do
  if (notification.isRead) {
    return notification
  }

  notification.isRead = true
  notification.readAt = new Date()
  await notification.save()

  // Push updated unread count to user
  const newCount = await Notification.countDocuments({ userId, isRead: false })
  emitToUser(userId, SOCKET_EVENTS.UNREAD_COUNT, { count: newCount })

  return notification
}

/**
 * Mark all unread notifications as read for a user
 * @param {string|ObjectId} userId
 * @returns {Promise<{ updatedCount: number }>}
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  )

  // Push count = 0 immediately
  emitToUser(userId, SOCKET_EVENTS.UNREAD_COUNT, { count: 0 })

  return { updatedCount: result.modifiedCount }
}

/**
 * Delete a single notification belonging to a user
 * @param {string|ObjectId} userId
 * @param {string} notificationId
 * @returns {Promise<{ deleted: boolean }>}
 */
const deleteNotification = async (userId, notificationId) => {
  if (!isValidObjectId(notificationId)) {
    throw createError.badRequest('Invalid notification ID format', 'INVALID_NOTIFICATION_ID')
  }

  const notification = await Notification.findOne({ _id: notificationId, userId })
  if (!notification) {
    throw createError.notFound('Notification not found')
  }

  await notification.deleteOne()

  // Push refreshed unread count
  const newCount = await Notification.countDocuments({ userId, isRead: false })
  emitToUser(userId, SOCKET_EVENTS.UNREAD_COUNT, { count: newCount })

  return { deleted: true }
}

/**
 * Delete all already-read notifications for a user
 * @param {string|ObjectId} userId
 * @returns {Promise<{ deletedCount: number }>}
 */
const deleteAllRead = async (userId) => {
  const result = await Notification.deleteMany({ userId, isRead: true })
  return { deletedCount: result.deletedCount }
}

/**
 * Get aggregated outbox for staff/admin notification management
 * Groups broadcasts (same title+body+type sent within 2 min) into single rows
 * @param {Object} query - { search, type, page, limit }
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
const getStaffOutbox = async (query = {}) => {
  const { search, type, page = 1, limit = 20 } = query
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))

  // Pre-match filter
  const matchStage = {}
  if (type) matchStage.type = type
  if (search) {
    matchStage.$or = [
      { title: { $regex: search, $options: 'i' } },
      { body: { $regex: search, $options: 'i' } }
    ]
  }

  // Use $dateToString to truncate to minute precision (compatible with MongoDB 4.x+)
  const pipeline = [
    ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          title: '$title',
          body: '$body',
          type: '$type',
          // Group by minute precision to cluster broadcasts together
          minute: {
            $dateToString: { format: '%Y-%m-%dT%H:%M', date: '$createdAt' }
          }
        },
        totalRecipients: { $sum: 1 },
        deliveredCount: { $sum: { $cond: ['$isDelivered', 1, 0] } },
        readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
        imageUrl: { $first: '$imageUrl' },
        metadata: { $first: '$metadata' },
        createdAt: { $first: '$createdAt' },
        latestId: { $first: '$_id' }
      }
    },
    { $sort: { createdAt: -1 } }
  ]

  // Count total groups
  const countPipeline = [...pipeline, { $count: 'total' }]
  const countResult = await Notification.aggregate(countPipeline)
  const total = countResult[0]?.total || 0

  // Paginate
  pipeline.push({ $skip: (pageNum - 1) * limitNum })
  pipeline.push({ $limit: limitNum })

  // Project clean output
  pipeline.push({
    $project: {
      _id: '$latestId',
      title: '$_id.title',
      body: '$_id.body',
      type: '$_id.type',
      totalRecipients: 1,
      deliveredCount: 1,
      readCount: 1,
      imageUrl: 1,
      metadata: 1,
      createdAt: 1
    }
  })

  const data = await Notification.aggregate(pipeline)

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  }
}

module.exports = {
  send,
  sendToMany,
  broadcast,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getStaffOutbox
}
