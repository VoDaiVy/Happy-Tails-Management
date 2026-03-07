/**
 * Wallet Model
 * Manages user wallet balance for deposits and payments
 * 
 * ❌ REMOVED: totalWithdrawn, isLocked, lockedReason, lockedAt, lockedBy
 * ✅ KEPT: userId, balance, currency, totalDeposited, totalSpent
 */

const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'VND',
    enum: {
      values: ['VND'],
      message: 'Only VND currency is supported'
    }
  },
  totalDeposited: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
walletSchema.index({ userId: 1 }, { unique: true });

// ==================== INSTANCE METHODS ====================

/**
 * Check if wallet has sufficient balance
 * @param {number} amount - Amount to check
 * @returns {boolean} True if balance is sufficient
 */
walletSchema.methods.hasSufficientBalance = function(amount) {
  return this.balance >= amount;
};

/**
 * Deposit money into wallet
 * NOTE: Does NOT save - caller must save within transaction
 * @param {number} amount - Amount to deposit
 * @returns {this} Wallet instance for chaining
 */
walletSchema.methods.deposit = function(amount) {
  if (amount <= 0) {
    throw new Error('Deposit amount must be positive');
  }
  this.balance += amount;
  this.totalDeposited += amount;
  return this;
};

/**
 * Spend money from wallet (for order payments)
 * NOTE: Does NOT save - caller must save within transaction
 * @param {number} amount - Amount to spend
 * @returns {this} Wallet instance for chaining
 * @throws {Error} If insufficient balance
 */
walletSchema.methods.spend = function(amount) {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  if (amount <= 0) {
    throw new Error('Spend amount must be positive');
  }
  this.balance -= amount;
  this.totalSpent += amount;
  return this;
};

/**
 * Refund money to wallet
 * NOTE: Does NOT save - caller must save within transaction
 * @param {number} amount - Amount to refund
 * @returns {this} Wallet instance for chaining
 */
walletSchema.methods.refund = function(amount) {
  if (amount <= 0) {
    throw new Error('Refund amount must be positive');
  }
  this.balance += amount;
  // Decrease totalSpent since the money is returned
  this.totalSpent = Math.max(0, this.totalSpent - amount);
  return this;
};

// ==================== STATIC METHODS ====================

/**
 * Find wallet by userId, create if not exists (idempotent)
 * Use this for auto-creating wallet on register/Google login
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Wallet>} Wallet document
 */
walletSchema.statics.findOrCreateByUser = async function(userId) {
  let wallet = await this.findOne({ userId });
  if (!wallet) {
    wallet = await this.create({ userId, balance: 0 });
  }
  return wallet;
};

/**
 * Alias for findOrCreateByUser (backward compatibility)
 */
walletSchema.statics.findByUser = async function(userId) {
  return this.findOrCreateByUser(userId);
};

/**
 * Get wallet with session (for ACID transactions)
 * @param {ObjectId} userId - User ID
 * @param {ClientSession} session - MongoDB session
 * @returns {Promise<Wallet>} Wallet document
 */
walletSchema.statics.findByUserWithSession = async function(userId, session) {
  let wallet = await this.findOne({ userId }).session(session);
  if (!wallet) {
    const [newWallet] = await this.create([{ userId }], { session });
    wallet = newWallet;
  }
  return wallet;
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
