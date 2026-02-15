/**
 * Global Error Handler Middleware
 * Handles all errors in a consistent format
 */

const { AppError } = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Handle Mongoose CastError (invalid ObjectId)
 * @param {Error} err - Original error
 * @returns {AppError}
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * Handle Mongoose Duplicate Key Error
 * @param {Error} err - Original error
 * @returns {AppError}
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field] || 'value';
  const message = `${field} '${value}' already exists. Please use another value.`;
  return new AppError(message, 409, 'DUPLICATE_FIELD');
};

/**
 * Handle Mongoose Validation Error
 * @param {Error} err - Original error
 * @returns {AppError}
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map(el => ({
    field: el.path,
    message: el.message
  }));
  const message = 'Validation failed';
  const appError = new AppError(message, 400, 'VALIDATION_ERROR');
  appError.details = errors;
  return appError;
};

/**
 * Handle JWT Error
 * @param {Error} err - Original error
 * @returns {AppError}
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again', 401, 'TOKEN_INVALID');
};

/**
 * Handle JWT Expired Error
 * @returns {AppError}
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please log in again', 401, 'TOKEN_EXPIRED');
};

/**
 * Send error response in development
 * @param {Error} err - Error object
 * @param {Response} res - Express response
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details,
      stack: err.stack
    }
  });
};

/**
 * Send error response in production
 * @param {Error} err - Error object
 * @param {Response} res - Express response
 */
const sendErrorProd = (err, res) => {
  // Operational errors: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        code: err.code,
        details: err.details
      }
    });
  } 
  // Programming errors: don't leak details
  else {
    // Log error for debugging
    logger.error('UNEXPECTED ERROR', { 
      message: err.message, 
      stack: err.stack 
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong. Please try again later.',
        statusCode: 500,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

/**
 * Global Error Handler
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  if (err.statusCode >= 500) {
    logger.error(err.message, { 
      path: req.path, 
      method: req.method,
      statusCode: err.statusCode 
    });
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Transform specific errors
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 Not Found
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', { error: err.message });
    server.close(() => {
      process.exit(1);
    });
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', { error: err.message });
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException
};
