/**
 * Transaction Model
 * Financial transactions for deposits and payments with PayOS integration
 * 
 * ❌ REMOVED from type enum: 'withdraw', 'withdrawal', 'transfer'
 * ✅ KEPT in type: 'deposit', 'payment', 'refund'
 * 
 * ❌ REMOVED from method enum: 'internal', 'bank_transfer', 'cash', 'card', 'online', 'wallet', 'vnpay', 'momo'
 * ✅ KEPT in method: 'payos', 'system'
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionCode: {
    type: String,
    required: [true, 'Transaction code is required']
  },
  // Legacy field alias
  transactionNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  // Legacy field alias
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet'
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: ['deposit', 'payment', 'refund'],
      message: 'Type must be deposit, payment, or refund'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  balanceBefore: {
    type: Number,
    default: 0,
    min: 0
  },
  balanceAfter: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['pending', 'completed', 'failed', 'cancelled'],
      message: 'Status must be pending, completed, failed, or cancelled'
    },
    default: 'pending'
  },
  method: {
    type: String,
    enum: {
      values: ['payos', 'system'],
      message: 'Method must be payos or system'
    },
    default: 'system'
  },
  // Legacy field alias
  paymentMethod: {
    type: String,
    enum: ['payos', 'system']
  },
  // PayOS specific fields
  payosOrderCode: {
    type: Number,
    default: null
  },
  payosPaymentLinkId: {
    type: String,
    default: null
  },
  payosCheckoutUrl: {
    type: String,
    default: null
  },
  // Reference to related order/booking
  referenceId: {
    type: String,
    default: null
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  note: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Note must be less than 500 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must be less than 500 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes must be less than 1000 characters']
  },
  failureReason: {
    type: String,
    default: null,
    trim: true
  },
  // For pending transactions
  expiredAt: {
    type: Date,
    default: null
  },
  // Store raw webhook/API data for debugging
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date
}, {
  timestamps: true
});

// ==================== INDEXES ====================

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ user: 1 });
// Note: transactionCode index is already created via field definition (unique: true)
// Note: payosOrderCode index is already created via field definition (sparse: true)
transactionSchema.index({ status: 1, expiredAt: 1 }); // For expiry cleanup job
transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

// ==================== PRE-SAVE HOOKS ====================

// Generate transaction code before saving
transactionSchema.pre('save', function() {
  if (!this.transactionCode) {
    this.transactionCode = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  // Sync legacy fields
  if (!this.transactionNumber) {
    this.transactionNumber = this.transactionCode;
  }
  if (this.userId && !this.user) {
    this.user = this.userId;
  }
  if (this.user && !this.userId) {
    this.userId = this.user;
  }
  if (this.method && !this.paymentMethod) {
    this.paymentMethod = this.method;
  }
});

// ==================== STATIC METHODS ====================

/**
 * Generate unique transaction code
 * Format: TXN-{timestamp}-{random 4 digits}
 * @returns {string} Unique transaction code
 */
transactionSchema.statics.generateCode = function() {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${timestamp}-${random}`;
};

/**
 * Generate unique numeric order code for PayOS
 * PayOS requires orderCode to be a NUMBER
 * @returns {Promise<number>} Unique numeric order code
 */
transactionSchema.statics.generatePayOSOrderCode = async function() {
  let orderCode;
  let attempts = 0;
  const maxAttempts = 5;
  
  do {
    // Generate a unique numeric code
    // Use timestamp mod to keep it within safe integer range
    orderCode = Math.floor(Date.now() / 1000) % 9007199254 + Math.floor(Math.random() * 1000);
    
    // Check for collision
    const existing = await this.findOne({ payosOrderCode: orderCode });
    if (!existing) {
      return orderCode;
    }
    
    attempts++;
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
  } while (attempts < maxAttempts);
  
  throw new Error('Failed to generate unique order code. Please try again.');
};

/**
 * Find pending transactions that have expired
 * In production, run this via cron job every minute
 * @returns {Promise<Array>} Array of expired transaction IDs
 */
transactionSchema.statics.cleanExpiredTransactions = async function() {
  const now = new Date();
  
  const expiredTransactions = await this.find({
    status: 'pending',
    expiredAt: { $lt: now }
  });
  
  const expiredIds = [];
  
  for (const txn of expiredTransactions) {
    txn.status = 'cancelled';
    txn.failureReason = 'EXPIRED';
    await txn.save();
    expiredIds.push(txn._id);
  }
  
  return expiredIds;
};

/**
 * Get transaction statistics for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Transaction statistics
 */
transactionSchema.statics.getStatsByUser = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    deposits: { total: 0, count: 0 },
    withdrawals: { total: 0, count: 0 },
    payments: { total: 0, count: 0 },
    refunds: { total: 0, count: 0 }
  };
  
  stats.forEach(stat => {
    switch (stat._id) {
      case 'deposit':
        result.deposits = { total: stat.total, count: stat.count };
        break;
      case 'withdraw':
      case 'withdrawal':
        result.withdrawals = { total: stat.total, count: stat.count };
        break;
      case 'payment':
        result.payments = { total: stat.total, count: stat.count };
        break;
      case 'refund':
        result.refunds = { total: stat.total, count: stat.count };
        break;
    }
  });
  
  return result;
};

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
