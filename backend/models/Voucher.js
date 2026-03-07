const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Voucher code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [4, 'Code must be at least 4 characters'],
    maxlength: [20, 'Code must be less than 20 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description must be less than 500 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minSpend: {
    type: Number,
    default: 0,
    min: [0, 'Min spend cannot be negative']
  },
  maxDiscount: {
    type: Number, // For percentage type
    default: null
  },
  usageLimit: {
    type: Number,
    default: null // null = unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  targetCustomers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  applicableServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
voucherSchema.index({ isActive: 1 });
voucherSchema.index({ validFrom: 1, validUntil: 1 });
voucherSchema.index({ isAIGenerated: 1 });

// Check if voucher is valid
voucherSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
};

const Voucher = mongoose.model('Voucher', voucherSchema);
module.exports = Voucher;