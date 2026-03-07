/**
 * Admin Validation Schemas
 * Joi validation for admin operations
 */

const Joi = require('joi');

// Valid MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Schema for blocking a user
 */
const blockUserSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .optional()
    .messages({
      'string.min': 'Block reason must be at least 5 characters',
      'string.max': 'Block reason must be less than 500 characters'
    })
});

/**
 * Schema for querying users list
 */
const getUsersQuerySchema = Joi.object({
  isBlocked: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    )
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return value === 'true';
      }
      return value;
    }),
  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search query must be less than 100 characters'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must be at most 100'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'email', 'name')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be: createdAt, email, or name'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be: asc or desc'
    }),
  role: Joi.string()
    .valid('customer', 'staff', 'admin')
    .optional()
    .messages({
      'any.only': 'Role must be: customer, staff, or admin'
    })
});

/**
 * Schema for revenue statistics query
 */
const getRevenueQuerySchema = Joi.object({
  from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'From date must be a valid ISO date string'
    }),
  to: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'To date must be a valid ISO date string'
    }),
  groupBy: Joi.string()
    .valid('day', 'week', 'month')
    .default('day')
    .messages({
      'any.only': 'Group by must be: day, week, or month'
    })
}).custom((value, helpers) => {
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
    return helpers.error('any.custom', { message: "'from' date must be before or equal to 'to' date" });
  }
  return value;
});

/**
 * Schema for top services query
 */
const getTopServicesQuerySchema = Joi.object({
  from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'From date must be a valid ISO date string'
    }),
  to: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'To date must be a valid ISO date string'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must be at most 50'
    })
});

/**
 * Schema for validating user ID param
 */
const userIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
});

module.exports = {
  blockUserSchema,
  getUsersQuerySchema,
  getRevenueQuerySchema,
  getTopServicesQuerySchema,
  userIdParamSchema
};
