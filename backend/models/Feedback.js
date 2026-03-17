/**
 * Feedback Model
 * Customer feedback and reviews
 */

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment must be less than 1000 characters']
  },
  images: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  response: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ booking: 1 });
feedbackSchema.index({ service: 1 });
feedbackSchema.index({ staff: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ isPublished: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
