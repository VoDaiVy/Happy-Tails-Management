/**
 * Cart Validation Schemas
 * Joi validation for cart operations
 */

const Joi = require('joi');

// Valid MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Schema for adding item to cart
 */
const addToCartSchema = Joi.object({
  type: Joi.string()
    .valid('service', 'stay')
    .default('service'),
  serviceId: Joi.string()
    .pattern(objectIdPattern)
    .when('type', {
      is: 'service',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, '')
    })
    .messages({
      'string.pattern.base': 'Invalid service ID format',
      'any.required': 'Service ID is required'
    }),
  roomId: Joi.string()
    .pattern(objectIdPattern)
    .when('type', {
      is: 'stay',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, '')
    })
    .messages({
      'string.pattern.base': 'Invalid room ID format',
      'any.required': 'Room ID is required for stay booking'
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(99)
    .default(1)
    .messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Maximum quantity is 99'
    })
    .when('type', {
      is: 'stay',
      then: Joi.default(1),
      otherwise: Joi.default(1)
    }),
  checkInDate: Joi.date()
    .iso()
    .when('type', {
      is: 'stay',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),
  checkOutDate: Joi.date()
    .iso()
    .when('type', {
      is: 'stay',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),
  nights: Joi.number()
    .integer()
    .min(1)
    .max(60)
    .optional(),
  note: Joi.string()
    .max(200)
    .allow('')
    .default('')
    .messages({
      'string.max': 'Note must be less than 200 characters'
    }),
  metadata: Joi.object().optional().default({})
});

/**
 * Schema for updating cart item
 */
const updateCartItemSchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(99)
    .required()
    .messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Maximum quantity is 99',
      'any.required': 'Quantity is required'
    })
});

/**
 * Schema for checkout
 * NOTE: Payment method is always 'wallet' - no need to specify
 */
const checkoutSchema = Joi.object({
  note: Joi.string()
    .max(500)
    .allow('')
    .default('')
    .messages({
      'string.max': 'Note must be less than 500 characters'
    }),
  scheduledAt: Joi.date()
    .iso()
    .greater('now')
    .allow(null)
    .messages({
      'date.greater': 'Scheduled date must be in the future',
      'date.format': 'Invalid date format. Use ISO 8601 format'
    })
});

/**
 * Schema for validating itemId param
 */
const itemIdParamSchema = Joi.object({
  itemId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid item ID format',
      'any.required': 'Item ID is required'
    })
});

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
  checkoutSchema,
  itemIdParamSchema
};
