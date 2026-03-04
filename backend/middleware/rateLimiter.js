/**
 * Rate Limiting Middleware
 * Protects against brute-force attacks
 */

const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/AppError');

// Disable rate limiting completely in development for easier testing
if (process.env.NODE_ENV === 'development') {
  console.log('🔓 Rate limiter disabled for development testing');
  
  const noLimit = (req, res, next) => {
    console.log(`🔓 Rate limiter bypassed for ${req.method} ${req.path}`);
    next();
  };
  
  module.exports = {
    globalLimiter: noLimit,
    loginLimiter: noLimit,
    registerLimiter: noLimit,
    forgotPasswordLimiter: noLimit,
    resendVerificationLimiter: noLimit,
    refreshTokenLimiter: noLimit,
    changePasswordLimiter: noLimit,
  };
  
  return; // Exit early, don't execute the rest of the code
}

/**
 * Create rate limiter with custom options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      next(new AppError(
        `Too many requests. Please try again after ${Math.ceil(options.windowMs / 60000)} minutes`,
        429,
        'TOO_MANY_REQUESTS'
      ));
    },
    skip: (req) => {
      // Skip rate limiting in test environment
      return process.env.NODE_ENV === 'test';
    }
  };

  return rateLimit({ ...defaults, ...options });
};

/**
 * Global API rate limiter
 * 100 requests per 15 minutes per IP
 */
const globalLimiter = createRateLimiter();

/**
 * Strict rate limiter for login
 * 10 requests per 15 minutes per IP (increased for development)
 */
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10
  message: 'Too many login attempts. Please try again after 15 minutes',
  keyGenerator: (req) => {
    // Combine IP and email for more precise limiting
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  },
  skip: (req) => {
    // Skip in development for easier testing
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * Rate limiter for registration
 * 10 requests per hour per IP (increased for development)
 */
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased from 3 to 10
  message: 'Too many accounts created. Please try again after an hour',
  skip: (req) => {
    // Skip in development for easier testing
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * Rate limiter for forgot password
 * 10 requests per hour per IP (increased for development)
 */
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased from 3 to 10
  message: 'Too many password reset requests. Please try again after an hour',
  skip: (req) => {
    // Skip in development for easier testing
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * Rate limiter for resend verification email
 * 3 requests per hour per email
 */
const resendVerificationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many verification email requests. Please try again after an hour',
  keyGenerator: (req) => {
    return `verify-${req.body?.email || req.ip}`;
  }
});

/**
 * Rate limiter for refresh token
 * 30 requests per 15 minutes per IP
 */
const refreshTokenLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: 'Too many token refresh requests'
});

/**
 * Rate limiter for password change
 * 5 requests per hour per user
 */
const changePasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password change attempts. Please try again after an hour',
  keyGenerator: (req) => {
    return `pwd-${req.user?.id || req.ip}`;
  }
});

module.exports = {
  createRateLimiter,
  globalLimiter,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  refreshTokenLimiter,
  changePasswordLimiter
};
