/**
 * Custom Application Error Class
 * Extends Error with additional properties for better error handling
 */

class AppError extends Error {
  /**
   * Create an AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Custom error code
   */
  constructor(message, statusCode, code = null) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Pre-defined error factories for common errors
const createError = {
  badRequest: (message = 'Bad request', code = 'BAD_REQUEST') => 
    new AppError(message, 400, code),
  
  unauthorized: (message = 'Unauthorized', code = 'UNAUTHORIZED') => 
    new AppError(message, 401, code),
  
  forbidden: (message = 'Forbidden', code = 'FORBIDDEN') => 
    new AppError(message, 403, code),
  
  notFound: (message = 'Resource not found', code = 'NOT_FOUND') => 
    new AppError(message, 404, code),
  
  conflict: (message = 'Resource already exists', code = 'CONFLICT') => 
    new AppError(message, 409, code),
  
  tooManyRequests: (message = 'Too many requests', code = 'TOO_MANY_REQUESTS') => 
    new AppError(message, 429, code),
  
  internal: (message = 'Internal server error', code = 'INTERNAL_ERROR') => 
    new AppError(message, 500, code),
  
  validation: (message = 'Validation failed', details = []) => {
    const error = new AppError(message, 400, 'VALIDATION_ERROR');
    error.details = details;
    return error;
  }
};

// Error codes for authentication
const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  PASSWORD_WEAK: 'PASSWORD_WEAK',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  TWO_FA_REQUIRED: 'TWO_FA_REQUIRED',
  TWO_FA_INVALID: 'TWO_FA_INVALID'
};

module.exports = {
  AppError,
  createError,
  AUTH_ERROR_CODES
};
