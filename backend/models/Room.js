/**
 * Room Model
 * Rooms for boarding services
 */

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Room number must be less than 50 characters']
  },
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name must be less than 100 characters']
  },
  type: {
    type: String,
    enum: ['standard', 'deluxe', 'suite', 'vip'],
    default: 'standard'
  },
  /**
   * Service type classification:
   * - 'service': used for grooming/spa services (rooms 101/102 for dry, 201/202 for wet)
   * - 'boarding': used for pet boarding/hotel services
   */
  serviceType: {
    type: String,
    enum: ['service', 'boarding'],
    required: [true, 'Service type is required'],
    help: 'Distinguish between service rooms and boarding rooms'
  },
  /**
   * Service group (only relevant for service-type rooms):
   * - 'wet': Tắm, Sấy, Massage, Trị liệu (rooms 201/202, 3 slots each, total 6)
   * - 'dry': Cắt tỉa, Cắt móng, Nhuộm (rooms 101/102, 3 slots each, total 6)
   */
  group: {
    type: String,
    enum: ['wet', 'dry'],
    help: 'Group assignment for service rooms (not applicable to boarding rooms)'
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: [0, 'Price per night cannot be negative'],
    default: 0
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: [{
    type: String,
    trim: true
  }],
  petTypes: [{
    type: String,
    enum: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'],
    default: ['dog', 'cat']
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description must be less than 1000 characters']
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
roomSchema.index({ type: 1 });
roomSchema.index({ isAvailable: 1, isActive: 1 });

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
