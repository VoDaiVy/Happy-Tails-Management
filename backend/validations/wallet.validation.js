/**
 * Wallet Validation Schemas
 * Joi validation for wallet-related API requests
 * 
 * ❌ REMOVED: withdrawSchema (no withdraw feature)
 * ❌ REMOVED: method field from depositSchema (only PayOS allowed)
 * ❌ REMOVED: checkoutWithWalletSchema (checkout moved to cart)
 * ✅ UPDATED: type/method enums in getTransactionsQuerySchema
 * ✅ ADDED: transactionIdParamSchema, from/to date range validation
 */

const Joi = require('joi');

// Valid MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Deposit money to wallet schema
 * Only via PayOS - no method choice needed
 */
const depositSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(10000)
    .max(50000000)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.integer': 'Amount must be an integer',
      'number.min': 'Minimum deposit is 10,000 VND',
      'number.max': 'Maximum deposit is 50,000,000 VND',
      'any.required': 'Amount is required'
    }),
  note: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Note must be less than 200 characters'
    })
});

/**
 * Get transactions query params schema
 * Updated enums to match new Transaction model
 * Added from/to date range validation
 */
const getTransactionsQuerySchema = Joi.object({
  type: Joi.string()
    .valid('deposit', 'payment', 'refund')
    .optional()
    .messages({
      'any.only': 'Type must be: deposit, payment, or refund'
    }),
  status: Joi.string()
    .valid('pending', 'completed', 'failed', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be: pending, completed, failed, or cancelled'
    }),
  method: Joi.string()
    .valid('payos', 'system')
    .optional()
    .messages({
      'any.only': 'Method must be: payos or system'
    }),
  from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'From date must be in ISO format'
    }),
  to: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'To date must be in ISO format'
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
    .max(50)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must be at most 50'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'amount')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be: createdAt or amount'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be: asc or desc'
    })
}).custom((value, helpers) => {
  // Validate: if both from and to provided → from must be <= to
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
    return helpers.error('any.custom', { message: "'from' date must be before or equal to 'to' date" });
  }
  return value;
});

/**
 * Transaction ID param schema
 */
const transactionIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid transaction ID format',
      'any.required': 'Transaction ID is required'
    })
});

module.exports = {
  depositSchema,
  getTransactionsQuerySchema,
  transactionIdParamSchema
};
