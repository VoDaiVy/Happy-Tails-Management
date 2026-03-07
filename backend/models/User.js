/**
 * User Model
 * Complete user schema with authentication methods and security features
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { generateAccessToken, generateRefreshToken, generateRandomToken, calculateExpiration } = require('../config/jwt');

const userSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must be less than 100 characters']
  },

  // Role & Permissions
  role: {
    type: String,
    enum: {
      values: ['customer', 'staff', 'admin'],
      message: 'Role must be customer, staff, or admin'
    },
    default: 'customer'
  },
  permissions: {
    type: [String],
    default: []
  },

  // Security - Password
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,

  // Security - Login Attempts
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,

  // Email Verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,

  // Refresh Tokens (for multiple devices)
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    deviceInfo: String
  }],

  // Two-Factor Authentication
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorBackupCodes: {
    type: [String],
    select: false
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,

  // Block Status
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    default: null,
    maxlength: [500, 'Block reason must be less than 500 characters']
  },
  blockAt: {
    type: Date,
    default: null
  },
  unblockedAt: {
    type: Date,
    default: null
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Tracking
  lastLogin: Date,
  lastLoginIP: String,
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    success: Boolean
  }]
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================

// Note: email index is already created by unique: true
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, isDeleted: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ emailVerificationToken: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual for checking if account is currently locked
 */
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ==================== PRE-SAVE HOOKS ====================

/**
 * Hash password before saving if modified
 * Note: Mongoose 9 - no need for next() in async middleware
 */
userSchema.pre('save', async function() {
  // Only hash if password is modified
  if (!this.isModified('password')) return;

  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  
  // Set passwordChangedAt for new passwords (except on creation)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1s to ensure token is created after
  }
});

/**
 * Update timestamp before saving
 */
userSchema.pre('save', function() {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
});

// ==================== INSTANCE METHODS ====================

/**
 * Compare provided password with stored hash
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} Whether passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Block user account
 * @param {ObjectId} adminId - ID of admin performing the block
 * @param {string} reason - Reason for blocking
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.block = async function(adminId, reason) {
  this.isBlocked = true;
  this.blockReason = reason || 'No reason provided';
  this.blockAt = new Date();
  this.blockedBy = adminId;
  this.unblockedAt = null;
  return this.save({ validateBeforeSave: false });
};

/**
 * Unblock user account
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.unblock = async function() {
  this.isBlocked = false;
  this.blockReason = null;
  this.blockAt = null;
  this.unblockedAt = new Date();
  this.blockedBy = null;
  return this.save({ validateBeforeSave: false });
};

/**
 * Generate JWT access token
 * @returns {string} JWT access token
 */
userSchema.methods.generateAuthToken = function() {
  return generateAccessToken({
    id: this._id,
    email: this.email,
    role: this.role
  });
};

/**
 * Generate JWT refresh token and save to database
 * @param {string} deviceInfo - Device information
 * @returns {Promise<string>} Refresh token
 */
userSchema.methods.generateRefreshTokenAndSave = async function(deviceInfo = 'Unknown') {
  const refreshToken = generateRefreshToken({
    id: this._id,
    type: 'refresh'
  });

  const expiresAt = calculateExpiration(process.env.JWT_REFRESH_EXPIRE || '30d');

  // Add to refresh tokens array
  this.refreshTokens.push({
    token: refreshToken,
    expiresAt,
    deviceInfo
  });

  // Clean up expired tokens
  this.refreshTokens = this.refreshTokens.filter(t => t.expiresAt > Date.now());

  // Limit to 5 devices
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }

  await this.save({ validateBeforeSave: false });

  return refreshToken;
};

/**
 * Remove specific refresh token
 * @param {string} token - Refresh token to remove
 */
userSchema.methods.removeRefreshToken = async function(token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
  await this.save({ validateBeforeSave: false });
};

/**
 * Remove all refresh tokens (logout from all devices)
 */
userSchema.methods.removeAllRefreshTokens = async function() {
  this.refreshTokens = [];
  await this.save({ validateBeforeSave: false });
};

/**
 * Generate password reset token
 * @returns {string} Plain reset token (to be sent via email)
 */
userSchema.methods.generatePasswordResetToken = function() {
  const { token, hashedToken } = generateRandomToken();

  this.passwordResetToken = hashedToken;
  this.passwordResetExpire = Date.now() + 60 * 60 * 1000; // 1 hour

  return token;
};

/**
 * Generate email verification OTP (6 digits)
 * @returns {string} 6-digit OTP code
 */
userSchema.methods.generateEmailVerificationOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP before storing
  const crypto = require('crypto');
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  this.emailVerificationToken = hashedOTP;
  this.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return otp;
};

/**
 * Increment login attempts
 * @returns {Promise<void>}
 */
userSchema.methods.incrementLoginAttempts = async function() {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockTime = parseInt(process.env.LOCK_TIME) || 2 * 60 * 60 * 1000; // 2 hours

  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
    return;
  }

  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account if max attempts exceeded
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  await this.updateOne(updates);
};

/**
 * Reset login attempts after successful login
 * @returns {Promise<void>}
 */
userSchema.methods.resetLoginAttempts = async function() {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

/**
 * Check if password was changed after token was issued
 * @param {number} JWTTimestamp - Token issue timestamp
 * @returns {boolean} Whether password was changed after token
 */
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Record login attempt in history
 * @param {Object} info - Login information
 * @param {boolean} success - Whether login was successful
 */
userSchema.methods.recordLoginAttempt = async function(info, success) {
  this.loginHistory.push({
    ip: info.ip || 'Unknown',
    userAgent: info.userAgent || 'Unknown',
    timestamp: Date.now(),
    success
  });

  // Keep only last 10 login attempts
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(-10);
  }

  if (success) {
    this.lastLogin = Date.now();
    this.lastLoginIP = info.ip;
  }

  await this.save({ validateBeforeSave: false });
};

/**
 * Soft delete user
 */
userSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.isActive = false;
  this.deletedAt = Date.now();
  this.refreshTokens = [];
  await this.save({ validateBeforeSave: false });
};

// ==================== STATIC METHODS ====================

/**
 * Find user by email (includes password for authentication)
 * @param {string} email - User email
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByEmail = async function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    isDeleted: false 
  }).select('+password');
};

/**
 * Find active user by ID
 * @param {string} id - User ID
 * @returns {Promise<User|null>}
 */
userSchema.statics.findActiveById = async function(id) {
  return this.findOne({
    _id: id,
    isActive: true,
    isDeleted: false
  });
};

/**
 * Find user by password reset token
 * @param {string} hashedToken - Hashed reset token
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByResetToken = async function(hashedToken) {
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() },
    isDeleted: false
  });
};

/**
 * Find user by email verification token
 * @param {string} hashedToken - Hashed verification token
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByVerificationToken = async function(hashedToken) {
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
    isDeleted: false
  });
};

/**
 * Check if refresh token is valid
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 * @returns {Promise<boolean>}
 */
userSchema.statics.isRefreshTokenValid = async function(userId, token) {
  const user = await this.findOne({
    _id: userId,
    'refreshTokens.token': token,
    'refreshTokens.expiresAt': { $gt: Date.now() },
    isActive: true,
    isDeleted: false
  });
  return !!user;
};

// ==================== QUERY MIDDLEWARE ====================

// Removed pre-find middleware due to Mongoose 9 compatibility issues
// isDeleted filtering is handled in static methods instead

const User = mongoose.model('User', userSchema);

module.exports = User;
