/**
 * Booking Model
 * Service bookings made by customers
 */

const mongoose = require('mongoose');

const bookingItemSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserPet'
  },
  guestPet: {
    petName: {
      type: String,
      trim: true,
      maxlength: [120, 'Guest pet name must be less than 120 characters']
    },
    petType: {
      type: String,
      trim: true,
      maxlength: [50, 'Guest pet type must be less than 50 characters']
    },
    // Stable key used to detect overlap for the same guest pet.
    petKey: {
      type: String,
      trim: true
    }
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes must be less than 500 characters']
  },
  // ── Scheduling fields ─────────────────────────────────────────
  /** Actual computed start datetime for this item (chained, zero-latency) */
  startTime: { type: Date },
  /** Actual computed end datetime  (startTime + service.duration) */
  endTime:   { type: Date },
  /** wet = Tắm/Sấy/Massage/Trị liệu  |  dry = Cắt tỉa/Cắt móng/Nhuộm */
  group: { type: String, enum: ['wet', 'dry'] },
  /** Room number assigned to this specific item (101/102 dry, 201/202 wet) */
  assignedRoom: { type: String }
});

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boardingPet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserPet'
  },
  items: [bookingItemSchema],
  bookingDate: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  bookingTime: {
    type: String,
    required: [true, 'Booking time is required']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  depositAmount: {
    type: Number,
    default: 0,
    min: [0, 'Deposit amount cannot be negative']
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'wallet'],
    default: 'cash'
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  stayInfo: {
    enabled: {
      type: Boolean,
      default: false
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    roomName: {
      type: String,
      trim: true
    },
    checkInDate: {
      type: Date
    },
    checkInTime: {
      type: String,
      trim: true,
      default: '00:00'
    },
    checkOutDate: {
      type: Date
    },
    checkOutTime: {
      type: String,
      trim: true,
      default: '10:00'
    },
    nights: {
      type: Number,
      min: [0, 'Nights cannot be negative'],
      default: 0
    },
    pricePerNight: {
      type: Number,
      min: [0, 'Price per night cannot be negative'],
      default: 0
    },
    subtotal: {
      type: Number,
      min: [0, 'Stay subtotal cannot be negative'],
      default: 0
    }
  },
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes must be less than 1000 characters']
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason must be less than 500 characters']
  },
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  // Camera access for pet monitoring (for boarding services)
  cameraAccess: {
    enabled: {
      type: Boolean,
      default: false
    },
    accessToken: {
      type: String,
      index: true
    },
    expiresAt: {
      type: Date
    },
    cameras: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camera'
    }],
    notificationSettings: {
      photoUpdates: {
        type: Boolean,
        default: true
      },
      liveAlerts: {
        type: Boolean,
        default: true
      },
      emailNotifications: {
        type: Boolean,
        default: true
      }
    },
    lastAccessedAt: {
      type: Date
    },
    accessCount: {
      type: Number,
      default: 0
    }
  },
  // For guest bookings (no account)
  guestInfo: {
    name: String,
    email: String,
    phone: String
  }
}, {
  timestamps: true
});

// Generate booking number before validation (must run before Mongoose validates required fields)
bookingSchema.pre('validate', async function() {
  if (!this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `BK${Date.now()}-${count + 1}`;
  }
});

// Indexes
bookingSchema.index({ customer: 1 });
bookingSchema.index({ boardingPet: 1, status: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingDate: 1 });
bookingSchema.index({ 'items.group': 1, 'items.startTime': 1, 'items.endTime': 1 });
bookingSchema.index({ 'items.guestPet.petKey': 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
