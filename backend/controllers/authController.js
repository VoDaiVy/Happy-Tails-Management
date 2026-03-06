/**
 * Authentication Controller
 * Handles all authentication operations
 */

const User = require('../models/User');
const { AppError, createError, AUTH_ERROR_CODES } = require('../utils/AppError');
const { catchAsync } = require('../utils/catchAsync');
const { getCookieOptions, hashToken, verifyRefreshToken } = require('../config/jwt');
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendPasswordChangedEmail,
  sendNewLoginAlert,
  sendWelcomeEmail
} = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Create and send token response
 * @param {User} user - User document
 * @param {number} statusCode - HTTP status code
 * @param {Response} res - Express response
 * @param {Object} options - Additional options
 */
const createSendToken = async (user, statusCode, res, options = {}) => {
  const { message = 'Success', rememberMe = false, deviceInfo = 'Unknown' } = options;

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = await user.generateRefreshTokenAndSave(deviceInfo);

  // Set cookie options
  const cookieOptions = getCookieOptions(rememberMe);

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, cookieOptions);

  // Remove sensitive data from user object
  const userData = {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  };

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: userData,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    }
  });
};

// ==================== REGISTER ====================

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = catchAsync(async (req, res, next) => {
  const { email, password, name, role } = req.validatedData || req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  if (existingUser) {
    return next(new AppError('Email already registered', 409, AUTH_ERROR_CODES.EMAIL_EXISTS));
  }

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    name,
    role: role === 'admin' ? 'user' : role // Prevent admin registration
  });

  // Generate email verification OTP
  const otp = user.generateEmailVerificationOTP();
  await user.save({ validateBeforeSave: false });

  // Log OTP in development (for testing)
  if (process.env.NODE_ENV === 'development') {
    logger.info(`📧 OTP for ${user.email}: ${otp}`);
  }

  // Send verification email (non-blocking)
  sendVerificationEmail(user.email, user.name, otp).catch(err => {
    logger.error('Failed to send verification email', { error: err.message });
  });

  // Log registration
  logger.auth('register', { userId: user._id, email: user.email });

  // Send response with tokens
  await createSendToken(user, 201, res, {
    message: 'Registration successful. Please verify your email.',
    deviceInfo: req.clientInfo?.userAgent
  });
});

// ==================== LOGIN ====================

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password, rememberMe = false } = req.body;

  // Find user with password
  const user = await User.findByEmail(email);

  // Check if user exists
  if (!user) {
    return next(new AppError('Invalid email or password', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS));
  }

  // Check if account is locked
  if (user.isLocked) {
    const lockRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return next(new AppError(
      `Account locked. Try again in ${lockRemaining} minutes`,
      423,
      AUTH_ERROR_CODES.ACCOUNT_LOCKED
    ));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new AppError('Account has been deactivated', 401, AUTH_ERROR_CODES.ACCOUNT_DISABLED));
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);
  
  if (!isPasswordCorrect) {
    // Record failed login
    await user.recordLoginAttempt(req.clientInfo, false);
    await user.incrementLoginAttempts();
    
    logger.auth('login_failed', { email, ip: req.clientInfo?.ip });
    
    return next(new AppError('Invalid email or password', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS));
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled) {
    // For now, we'll skip 2FA verification but include the structure
    // In production, you'd verify the TOTP code here
    // const { twoFactorCode } = req.body;
    // if (!twoFactorCode) {
    //   return next(new AppError('2FA code required', 401, AUTH_ERROR_CODES.TWO_FA_REQUIRED));
    // }
  }

  // Reset login attempts
  await user.resetLoginAttempts();
  
  // Record successful login
  await user.recordLoginAttempt(req.clientInfo, true);

  // Log successful login
  logger.auth('login', { userId: user._id, email: user.email, ip: req.clientInfo?.ip });

  // Send response with tokens
  await createSendToken(user, 200, res, {
    message: 'Login successful',
    rememberMe,
    deviceInfo: req.clientInfo?.userAgent
  });
});

// ==================== LOGOUT ====================

/**
 * @desc    Logout user (current device)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken && req.user) {
    // Remove refresh token from database
    await req.user.removeRefreshToken(refreshToken);
  }

  // Clear cookie
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true
  });

  logger.auth('logout', { userId: req.user?._id });

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
exports.logoutAll = catchAsync(async (req, res, next) => {
  // Remove all refresh tokens
  await req.user.removeAllRefreshTokens();

  // Clear cookie
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  logger.auth('logout_all', { userId: req.user._id });

  res.status(200).json({
    success: true,
    message: 'Logged out from all devices successfully'
  });
});

// ==================== REFRESH TOKEN ====================

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (with valid refresh token)
 */
exports.refreshToken = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return next(new AppError('Refresh token not provided', 401, AUTH_ERROR_CODES.TOKEN_MISSING));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    return next(new AppError('Invalid or expired refresh token', 401, AUTH_ERROR_CODES.TOKEN_INVALID));
  }

  // Check if token exists in database
  const isValid = await User.isRefreshTokenValid(decoded.id, refreshToken);
  if (!isValid) {
    return next(new AppError('Refresh token has been revoked', 401, AUTH_ERROR_CODES.TOKEN_INVALID));
  }

  // Get user
  const user = await User.findActiveById(decoded.id);
  if (!user) {
    return next(new AppError('User not found', 401, AUTH_ERROR_CODES.USER_NOT_FOUND));
  }

  // Generate new tokens (token rotation)
  await user.removeRefreshToken(refreshToken);
  const newAccessToken = user.generateAuthToken();
  const newRefreshToken = await user.generateRefreshTokenAndSave(req.clientInfo?.userAgent);

  // Set new cookie
  const cookieOptions = getCookieOptions();
  res.cookie('refreshToken', newRefreshToken, cookieOptions);

  res.status(200).json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  });
});

// ==================== FORGOT PASSWORD ====================

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // Always return success to prevent email enumeration
  const successResponse = {
    success: true,
    message: 'If your email is registered, you will receive a password reset link'
  };

  // Find user
  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  
  if (!user) {
    // Don't reveal if email exists
    return res.status(200).json(successResponse);
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Send email
  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
    logger.auth('password_reset', { email: user.email });
  } catch (error) {
    // Clear reset token on email failure
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error('Failed to send reset email', { error: error.message });
  }

  res.status(200).json(successResponse);
});

// ==================== RESET PASSWORD ====================

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password/:resetToken
 * @access  Public
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password } = req.body;
  const { resetToken } = req.params;

  // Hash token to compare with database
  const hashedToken = hashToken(resetToken);

  // Find user with valid token
  const user = await User.findByResetToken(hashedToken);

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400, AUTH_ERROR_CODES.INVALID_RESET_TOKEN));
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  user.passwordChangedAt = Date.now();

  // Invalidate all refresh tokens (force re-login)
  user.refreshTokens = [];

  await user.save();

  // Send confirmation email
  sendPasswordChangedEmail(user.email, user.name).catch(err => {
    logger.error('Failed to send password changed email', { error: err.message });
  });

  logger.auth('password_reset_complete', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.'
  });
});

// ==================== CHANGE PASSWORD ====================

/**
 * @desc    Change password (logged in user)
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Send notification email
  sendPasswordChangedEmail(user.email, user.name).catch(err => {
    logger.error('Failed to send password changed email', { error: err.message });
  });

  logger.auth('password_changed', { userId: user._id });

  // Send new tokens
  await createSendToken(user, 200, res, {
    message: 'Password changed successfully',
    deviceInfo: req.clientInfo?.userAgent
  });
});

// ==================== EMAIL VERIFICATION ====================

/**
 * @desc    Verify email with OTP
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError('Email and OTP are required', 400, 'MISSING_FIELDS'));
  }

  // Hash OTP to compare
  const crypto = require('crypto');
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  // Debug log in development
  if (process.env.NODE_ENV === 'development') {
    logger.info(`🔍 Verifying OTP for: ${email}`);
  }

  // Find user with valid OTP
  const user = await User.findOne({
    email: email.toLowerCase(),
    emailVerificationToken: hashedOTP,
    emailVerificationExpire: { $gt: Date.now() },
    isDeleted: false
  });

  if (!user) {
    return next(new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400, 'INVALID_OTP'));
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  // Send welcome email
  sendWelcomeEmail(user.email, user.name).catch(err => {
    logger.error('Failed to send welcome email', { error: err.message });
  });

  logger.auth('email_verified', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Xác thực email thành công'
  });
});

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
exports.resendVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // Always return success to prevent email enumeration
  const successResponse = {
    success: true,
    message: 'Nếu email đã đăng ký và chưa xác thực, bạn sẽ nhận được mã OTP mới'
  };

  const user = await User.findOne({ 
    email: email.toLowerCase(), 
    isDeleted: false,
    isEmailVerified: false 
  });

  if (!user) {
    return res.status(200).json(successResponse);
  }

  // Generate new OTP
  const otp = user.generateEmailVerificationOTP();
  await user.save({ validateBeforeSave: false });

  // Log OTP in development
  if (process.env.NODE_ENV === 'development') {
    logger.info(`📧 OTP for ${user.email}: ${otp}`);
  }

  // Send email
  sendVerificationEmail(user.email, user.name, otp).catch(err => {
    logger.error('Failed to send verification email', { error: err.message });
  });

  res.status(200).json(successResponse);
});

// ==================== GET CURRENT USER ====================

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    }
  });
});

// ==================== UPDATE PROFILE ====================

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
  const updates = req.validatedData || {};
  const user = req.user;

  // Check if email is being changed
  if (updates.email && updates.email !== user.email) {
    // Check if new email already exists
    const existingUser = await User.findOne({ email: updates.email });
    if (existingUser) {
      return next(new AppError('Email already in use', 409, AUTH_ERROR_CODES.EMAIL_EXISTS));
    }

    // Require re-verification
    user.isEmailVerified = false;
    const verificationToken = user.generateEmailVerificationToken();
    
    // Send verification to new email
    sendVerificationEmail(updates.email, user.name, verificationToken).catch(err => {
      logger.error('Failed to send verification email', { error: err.message });
    });
  }

  // Update fields
  if (updates.name) user.name = updates.name;
  if (updates.email) user.email = updates.email;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: updates.email ? 'Profile updated. Please verify your new email.' : 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    }
  });
});
