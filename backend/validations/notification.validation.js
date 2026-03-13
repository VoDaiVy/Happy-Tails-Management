/**
 * Notification Validation Schemas
 * Joi schemas for notification API endpoints
 */

const Joi = require('joi')

const objectIdPattern = /^[0-9a-fA-F]{24}$/

// ── USER ENDPOINTS ────────────────────────────────────────────────────────────

/**
 * GET /api/notifications query params
 */
const getNotificationsQuerySchema = Joi.object({
  isRead: Joi.boolean(),
  type: Joi.string().valid('system', 'order', 'payment', 'promotion', 'account'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
})

// ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────────

/**
 * POST /api/admin/notifications/send
 */
const sendNotificationSchema = Joi.object({
  userId: Joi.alternatives()
    .try(
      Joi.string().pattern(objectIdPattern),
      Joi.string().valid('all')
    )
    .required()
    .messages({
      'any.required': 'userId is required',
      'alternatives.match': 'userId must be a valid ObjectId or "all"'
    }),
  title: Joi.string().trim().min(2).max(200).required(),
  body: Joi.string().trim().min(2).max(1000).required(),
  type: Joi.string()
    .valid('system', 'order', 'payment', 'promotion', 'account')
    .required(),
  imageUrl: Joi.string().uri().optional(),
  actionUrl: Joi.string().max(500).optional(),
  metadata: Joi.object().optional()
})

/**
 * POST /api/admin/notifications/broadcast
 */
const broadcastNotificationSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  body: Joi.string().trim().min(2).max(1000).required(),
  type: Joi.string()
    .valid('system', 'order', 'payment', 'promotion', 'account')
    .required(),
  imageUrl: Joi.string().uri().optional(),
  actionUrl: Joi.string().max(500).optional(),
  metadata: Joi.object().optional(),
  userFilter: Joi.object({
    role: Joi.string().valid('user', 'admin').optional(),
    isBlocked: Joi.boolean().optional()
  }).optional()
})

module.exports = {
  getNotificationsQuerySchema,
  sendNotificationSchema,
  broadcastNotificationSchema
}
