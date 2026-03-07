/**
 * Wallet Validation Schemas
 * Joi validation for wallet-related API requests
 * 
 * ❌ REMOVED: withdrawSchema (no withdraw feature)
 * ❌ REMOVED: method field from depositSchema (only PayOS allowed)
 * ❌ REMOVED: checkoutWithWalletSchema (checkout moved to cart)
 * ✅ UPDATED: type/method enums in getTransactionsQuerySchema
 */

const Joi = require('joi');

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
 */
const getTransactionsQuerySchema = Joi.object({
  type: Joi.string()
    .valid('deposit', 'payment', 'refund')
    .optional(),
  status: Joi.string()
    .valid('pending', 'completed', 'failed', 'cancelled')
    .optional(),
  method: Joi.string()
    .valid('payos', 'system')
    .optional(),
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
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
  sortBy: Joi.string()
    .valid('createdAt', 'amount', 'status')
    .default('createdAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

module.exports = {
  depositSchema,
  getTransactionsQuerySchema
};
