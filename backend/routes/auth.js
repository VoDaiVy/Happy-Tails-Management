/**
 * Authentication Routes
 * All routes related to user authentication
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middleware
const { protect, attachClientInfo } = require('../middleware/auth');
const { 
  validateRegisterInput, 
  validateLoginInput, 
  validatePasswordChangeInput,
  validateResetPasswordInput,
  validateEmailInput,
  validateUpdateProfileInput 
} = require('../middleware/validation');
const { 
  loginLimiter, 
  registerLimiter, 
  forgotPasswordLimiter,
  resendVerificationLimiter,
  refreshTokenLimiter,
  changePasswordLimiter
} = require('../middleware/rateLimiter');

// Apply client info to all routes
router.use(attachClientInfo);

// ==================== PUBLIC ROUTES ====================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  registerLimiter,
  validateRegisterInput,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  loginLimiter,
  validateLoginInput,
  authController.login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (with valid refresh token)
 */
router.post(
  '/refresh-token',
  refreshTokenLimiter,
  authController.refreshToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateEmailInput,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password/:resetToken
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password/:resetToken',
  validateResetPasswordInput,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post(
  '/verify-email',
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  resendVerificationLimiter,
  validateEmailInput,
  authController.resendVerification
);

// ==================== PROTECTED ROUTES ====================

// All routes below require authentication
router.use(protect);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current device
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authController.logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authController.getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  validateUpdateProfileInput,
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/change-password',
  changePasswordLimiter,
  validatePasswordChangeInput,
  authController.changePassword
);

module.exports = router;
