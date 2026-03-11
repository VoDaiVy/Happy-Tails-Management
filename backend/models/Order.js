/**
 * Order Model
 * Stores completed orders from cart checkout
 */

const mongoose = require('mongoose');

/**
 * Order Item Subdocument Schema
 * Snapshot of service data at time of checkout (no refs, full data)
 */
const orderItemSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  imageUrl: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  subtotal: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, {
  _id: false
});

const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalItems: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'cash', 'payos'],
    default: 'cash'
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
  note: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Note must be less than 500 characters']
  },
  cancelReason: {
    type: String,
    default: null
  },
  scheduledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ status: 1, createdAt: -1 }); // For revenue stats aggregation
// Note: payosOrderCode index is already created via field definition (sparse: true)

/**
 * Generate unique order code
 * Format: ORD-{timestamp}-{random 4 digits}
 * @returns {string} Unique order code
 */
orderSchema.statics.generateOrderCode = function() {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timestamp}-${random}`;
};

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
