/**
 * JWT Configuration & Utilities
 * Handles token generation, verification, and management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT Configuration
const config = {
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '7d'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  },
  cookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE) || 7
};

/**
 * Generate Access Token
 * @param {Object} payload - Data to encode in token
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.accessToken.secret, {
    expiresIn: config.accessToken.expiresIn
  });
};

/**
 * Generate Refresh Token
 * @param {Object} payload - Data to encode in token
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.refreshToken.secret, {
    expiresIn: config.refreshToken.expiresIn
  });
};

/**
 * Verify Access Token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, config.accessToken.secret);
};

/**
 * Verify Refresh Token
 * @param {string} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.refreshToken.secret);
};

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate random token (for password reset, email verification)
 * @returns {Object} { token, hashedToken }
 */
const generateRandomToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return { token, hashedToken };
};

/**
 * Hash a token
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

/**
 * Get cookie options for JWT
 * @param {boolean} rememberMe - Extended expiration
 * @returns {Object} Cookie options
 */
const getCookieOptions = (rememberMe = false) => {
  const expiresIn = rememberMe 
    ? config.cookieExpire * 4 // 4x longer if remember me
    : config.cookieExpire;

  return {
    expires: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };
};

/**
 * Calculate token expiration date
 * @param {string} expiresIn - Duration string (e.g., '7d', '30d')
 * @returns {Date} Expiration date
 */
const calculateExpiration = (expiresIn = '7d') => {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

  const [, amount, unit] = match;
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return new Date(Date.now() + parseInt(amount) * multipliers[unit]);
};

module.exports = {
  config,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  generateRandomToken,
  hashToken,
  getCookieOptions,
  calculateExpiration
};
