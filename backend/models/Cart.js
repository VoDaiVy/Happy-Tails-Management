/**
 * Cart Model
 * Shopping cart for customers to add services before booking
 */

const mongoose = require('mongoose');
const { calculateCartSummary } = require('../utils/cartBookingRules');

/**
 * Cart Item Subdocument Schema
 * Stores snapshot of service data at time of adding to cart
 */
const cartItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['service', 'stay'],
    default: 'service'
  },
  refId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  unitPrice: {
    type: Number,
    min: [0, 'Unit price cannot be negative']
  },
  duration: {
    type: Number,
    required: true,
    min: [0, 'Duration cannot be negative']
  },
  durationUnit: {
    type: String,
    enum: ['minutes', 'days'],
    default: 'minutes'
  },
  imageUrl: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: [1, 'Quantity must be at least 1'],
    max: [99, 'Maximum quantity is 99']
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  note: {
    type: String,
    default: '',
    trim: true,
    maxlength: [200, 'Note must be less than 200 characters']
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  _id: true
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  totalPrice: {
    type: Number,
    default: 0,
    min: [0, 'Total price cannot be negative']
  },
  totalItems: {
    type: Number,
    default: 0,
    min: [0, 'Total items cannot be negative']
  },
  serviceSubtotal: {
    type: Number,
    default: 0,
    min: [0, 'Service subtotal cannot be negative']
  },
  staySubtotal: {
    type: Number,
    default: 0,
    min: [0, 'Stay subtotal cannot be negative']
  },
  serviceDurationTotal: {
    type: Number,
    default: 0,
    min: [0, 'Service duration total cannot be negative']
  },
  stayDurationTotal: {
    type: Number,
    default: 0,
    min: [0, 'Stay duration total cannot be negative']
  },
  grandTotal: {
    type: Number,
    default: 0,
    min: [0, 'Grand total cannot be negative']
  }
}, {
  timestamps: true
});

/**
 * Recalculate cart totals
 * Computes subtotal for each item and updates totalPrice/totalItems
 * @returns {this} Cart instance for chaining
 */
cartSchema.methods.recalculate = function() {
  const { normalizedItems, summary } = calculateCartSummary(this.items || []);

  this.items = normalizedItems.map((item) => {
    const next = {
      ...item,
      refId: item.refId || (item.type === 'stay' ? item.roomId : item.serviceId),
    };
    return next;
  });

  this.serviceSubtotal = summary.serviceSubtotal;
  this.staySubtotal = summary.staySubtotal;
  this.serviceDurationTotal = summary.serviceDurationTotal;
  this.stayDurationTotal = summary.stayDurationTotal;
  this.grandTotal = summary.grandTotal;
  this.totalPrice = this.grandTotal;
  this.totalItems = summary.totalItems;
  
  return this;
};

cartSchema.methods.toSummary = function() {
  return {
    serviceSubtotal: this.serviceSubtotal || 0,
    staySubtotal: this.staySubtotal || 0,
    serviceDurationTotal: this.serviceDurationTotal || 0,
    stayDurationTotal: this.stayDurationTotal || 0,
    grandTotal: this.grandTotal || 0,
    totalItems: this.totalItems || 0
  };
};

/**
 * Find cart by user ID with populated service data
 * @param {ObjectId} userId - User's ID
 * @returns {Promise<Cart>} Cart document
 */
cartSchema.statics.findByUser = function(userId) {
  return this.findOne({ userId }).populate('items.serviceId', 'name isActive price imageUrl');
};

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
