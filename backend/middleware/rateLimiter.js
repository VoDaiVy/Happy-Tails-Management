/**
 * Rate Limiting Middleware
 * Protects against brute-force attacks
 */

const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/AppError');

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
 * 5 requests per 15 minutes per IP
 */
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again after 15 minutes',
  keyGenerator: (req) => {
    // Combine IP and email for more precise limiting
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  }
});

/**
 * Rate limiter for registration
 * 3 requests per hour per IP
 */
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many accounts created. Please try again after an hour'
});

/**
 * Rate limiter for forgot password
 * 3 requests per hour per IP
 */
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests. Please try again after an hour'
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
