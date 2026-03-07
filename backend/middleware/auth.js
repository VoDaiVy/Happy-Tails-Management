/**
 * Authentication & Authorization Middleware
 * Protects routes and handles role-based access control
 */

const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/User');
const { AppError, AUTH_ERROR_CODES } = require('../utils/AppError');
const { catchAsync } = require('../utils/catchAsync');

/**
 * Protect routes - Require authentication
 * Verifies JWT token and attaches user to request
 */
const protect = catchAsync(async (req, res, next) => {
  let token;

  // 1. Get token from header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Also check cookies for web clients
  else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  // 2. Check if token exists
  if (!token) {
    return next(new AppError('Please log in to access this resource', 401, AUTH_ERROR_CODES.TOKEN_MISSING));
  }

  // 3. Verify token
  let decoded;
  try {
    decoded = verifyAccessToken(token);
    console.log('- Token decoded successfully:', {
      id: decoded.id,
      email: decoded.email,
      iat: new Date(decoded.iat * 1000),
      exp: new Date(decoded.exp * 1000)
    });
  } catch (error) {
    console.log('- Token verification failed:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again', 401, AUTH_ERROR_CODES.TOKEN_EXPIRED));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again', 401, AUTH_ERROR_CODES.TOKEN_INVALID));
    }
    return next(new AppError('Authentication failed', 401, AUTH_ERROR_CODES.TOKEN_INVALID));
  }

  // 4. Check if user still exists
  const user = await User.findById(decoded.id).select('+password');
  
  if (!user || user.isDeleted || !user.isActive) {
    return next(new AppError('User no longer exists or is inactive', 401, AUTH_ERROR_CODES.USER_NOT_FOUND));
  }

  // 5. Check if user is blocked
  if (user.isBlocked) {
    const error = new AppError('Your account has been blocked', 403, 'ACCOUNT_BLOCKED');
    error.errors = {
      reason: user.blockReason,
      blockAt: user.blockAt
    };
    return next(error);
  }

  // 6. Check if user changed password after token was issued
  if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password recently changed. Please log in again', 401, AUTH_ERROR_CODES.TOKEN_INVALID));
  }

  // 7. Grant access - attach user to request
  req.user = user;
  next();
});

/**
 * Optional authentication
 * Attaches user if token exists, but doesn't require it
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findActiveById(decoded.id);
      if (user && user.isActive && !user.changedPasswordAfter(decoded.iat)) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, but that's okay for optional auth
    }
  }

  next();
});

/**
 * Restrict to specific roles
 * @param  {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Please log in to access this resource', 401, AUTH_ERROR_CODES.TOKEN_MISSING));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    }

    next();
  };
};

/**
 * Check specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Please log in to access this resource', 401, AUTH_ERROR_CODES.TOKEN_MISSING));
    }

    // Admins have all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    if (!req.user.permissions?.includes(permission)) {
      return next(new AppError(`You need '${permission}' permission to perform this action`, 403, 'PERMISSION_DENIED'));
    }

    next();
  };
};

/**
 * Require email verification
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Please log in to access this resource', 401, AUTH_ERROR_CODES.TOKEN_MISSING));
  }

  if (!req.user.isEmailVerified) {
    return next(new AppError('Please verify your email to access this resource', 403, AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED));
  }

  next();
};

/**
 * Attach client info to request (IP, User Agent)
 */
const attachClientInfo = (req, res, next) => {
  req.clientInfo = {
    ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown',
    userAgent: req.get('user-agent') || 'Unknown'
  };
  next();
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
  checkPermission,
  requireEmailVerified,
  attachClientInfo
};
