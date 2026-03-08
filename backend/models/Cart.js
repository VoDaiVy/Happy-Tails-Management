/**
 * Cart Model
 * Shopping cart for customers to add services before booking
 */

const mongoose = require('mongoose');

/**
 * Cart Item Subdocument Schema
 * Stores snapshot of service data at time of adding to cart
 */
const cartItemSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
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
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: Number,
    required: true,
    min: [1, 'Duration must be at least 1 minute']
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
  }
}, {
  _id: true
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
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
  let totalPrice = 0;
  let totalItems = 0;

  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
    totalPrice += item.subtotal;
    totalItems += item.quantity;
  });

  this.totalPrice = totalPrice;
  this.totalItems = totalItems;
  
  return this;
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
