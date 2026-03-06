/**
 * Validation Middleware
 * Wraps Joi validation for Express routes
 */

const { AppError } = require('../utils/AppError');

/**
 * Validate request body against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types (e.g., string to number)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      const appError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
      appError.details = errors;
      return next(appError);
    }

    // Replace body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Validate request query parameters against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      const appError = new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR');
      appError.details = errors;
      return next(appError);
    }

    // Store validated query in req for use in controllers
    req.validatedQuery = value;
    next();
  };
};

/**
 * Validate request params against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      const appError = new AppError('Invalid parameters', 400, 'VALIDATION_ERROR');
      appError.details = errors;
      return next(appError);
    }

    req.params = value;
    next();
  };
};

module.exports = {
  validate,
  validateQuery,
  validateParams
};
