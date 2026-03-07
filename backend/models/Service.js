/**
 * Service Model
 * Services offered by Happy Tails (Grooming, Veterinary, Boarding, etc.)
 */

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [200, 'Service name must be less than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description must be less than 2000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  images: [{
    type: String,
    trim: true
  }],
  features: [{
    type: String,
    trim: true
  }],
  petTypes: [{
    type: String,
    enum: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'],
    default: ['dog', 'cat']
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxCapacity: {
    type: Number,
    default: 1 // For booking limits
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
serviceSchema.index({ name: 'text', description: 'text' }); // Full-text search index
serviceSchema.index({ category: 1, isActive: 1, price: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ rating: -1 });

/**
 * Static method: Find all active services
 * @returns {Query}
 */
serviceSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
