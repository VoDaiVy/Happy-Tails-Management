/**
 * Input Validation Middleware
 * Validates and sanitizes request data
 */

const { AppError, createError } = require('../utils/AppError');
const { 
  validateRegistration, 
  validateLogin, 
  validatePasswordChange,
  validateEmail,
  validatePassword
} = require('../utils/validators');

/**
 * Validate registration input
 */
const validateRegisterInput = (req, res, next) => {
  const result = validateRegistration(req.body);

  if (!result.isValid) {
    const error = createError.validation('Validation failed');
    error.details = Object.entries(result.errors).map(([field, message]) => ({
      field,
      message: Array.isArray(message) ? message : [message]
    }));
    return next(error);
  }

  // Attach sanitized data to request
  req.validatedData = result.sanitizedData;
  next();
};

/**
 * Validate login input
 */
const validateLoginInput = (req, res, next) => {
  const result = validateLogin(req.body);

  if (!result.isValid) {
    const error = createError.validation('Please provide email and password');
    error.details = Object.entries(result.errors).map(([field, message]) => ({
      field,
      message: [message]
    }));
    return next(error);
  }

  next();
};

/**
 * Validate password change input
 */
const validatePasswordChangeInput = (req, res, next) => {
  const result = validatePasswordChange(req.body);

  if (!result.isValid) {
    const error = createError.validation('Password validation failed');
    error.details = Object.entries(result.errors).map(([field, message]) => ({
      field,
      message: Array.isArray(message) ? message : [message]
    }));
    return next(error);
  }

  next();
};

/**
 * Validate reset password input
 */
const validateResetPasswordInput = (req, res, next) => {
  const { password, confirmPassword } = req.body;

  const passwordResult = validatePassword(password);
  const errors = [];

  if (!passwordResult.isValid) {
    errors.push({ field: 'password', message: passwordResult.errors });
  }

  if (password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: ['Passwords do not match'] });
  }

  if (errors.length > 0) {
    const error = createError.validation('Password validation failed');
    error.details = errors;
    return next(error);
  }

  next();
};

/**
 * Validate email input
 */
const validateEmailInput = (req, res, next) => {
  const result = validateEmail(req.body.email);

  if (!result.isValid) {
    return next(createError.badRequest(result.error, 'INVALID_EMAIL'));
  }

  req.body.email = result.normalizedEmail;
  next();
};

/**
 * Validate update profile input
 */
const validateUpdateProfileInput = (req, res, next) => {
  const errors = [];
  const allowedFields = ['name', 'email'];
  const updates = {};

  // Filter only allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Validate name if provided
  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || updates.name.trim().length < 2) {
      errors.push({ field: 'name', message: ['Name must be at least 2 characters'] });
    } else if (updates.name.trim().length > 100) {
      errors.push({ field: 'name', message: ['Name must be less than 100 characters'] });
    } else {
      updates.name = updates.name.trim();
    }
  }

  // Validate email if provided
  if (updates.email !== undefined) {
    const emailResult = validateEmail(updates.email);
    if (!emailResult.isValid) {
      errors.push({ field: 'email', message: [emailResult.error] });
    } else {
      updates.email = emailResult.normalizedEmail;
    }
  }

  if (errors.length > 0) {
    const error = createError.validation('Validation failed');
    error.details = errors;
    return next(error);
  }

  req.validatedData = updates;
  next();
};

/**
 * Sanitize MongoDB operators from input
 * Prevents NoSQL injection
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    Object.keys(obj).forEach(key => {
      // Remove keys starting with $ or containing .
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });

    return obj;
  };

  // Only sanitize body - query and params are read-only getters in newer Express
  // express-mongo-sanitize already handles query sanitization
  if (req.body) sanitize(req.body);

  next();
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validatePasswordChangeInput,
  validateResetPasswordInput,
  validateEmailInput,
  validateUpdateProfileInput,
  sanitizeInput
};
