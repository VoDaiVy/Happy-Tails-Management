/**
 * Camera Model
 * Manages surveillance cameras for pet monitoring in boarding rooms
 */

const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required'],
    index: true
  },
  cameraName: {
    type: String,
    required: [true, 'Camera name is required'],
    trim: true,
    maxlength: [100, 'Camera name must be less than 100 characters']
  },
  cameraNumber: {
    type: String,
    required: [true, 'Camera number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Camera number must be less than 50 characters']
  },
  streamUrl: {
    type: String,
    required: [true, 'Stream URL is required'],
    trim: true
  },
  rtspUrl: {
    type: String,
    trim: true
  },
  cameraType: {
    type: String,
    enum: ['live', 'recorded', 'both'],
    default: 'both'
  },
  position: {
    type: String,
    enum: ['main', 'side', 'outdoor', 'corner'],
    default: 'main'
  },
  resolution: {
    type: String,
    enum: ['720p', '1080p', '4k'],
    default: '1080p'
  },
  recordingEnabled: {
    type: Boolean,
    default: true
  },
  recordingRetentionDays: {
    type: Number,
    default: 7,
    min: [1, 'Retention must be at least 1 day'],
    max: [30, 'Retention cannot exceed 30 days']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastOnlineAt: {
    type: Date
  },
  lastMaintenanceAt: {
    type: Date
  },
  features: {
    nightVision: {
      type: Boolean,
      default: true
    },
    audio: {
      type: Boolean,
      default: true
    },
    panTilt: {
      type: Boolean,
      default: false
    },
    zoom: {
      type: Boolean,
      default: false
    },
    motionDetection: {
      type: Boolean,
      default: true
    }
  },
  technicalDetails: {
    manufacturer: String,
    model: String,
    ipAddress: String,
    macAddress: String,
    firmwareVersion: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
cameraSchema.index({ room: 1, isActive: 1 });
cameraSchema.index({ isOnline: 1 });

// Virtual for checking if maintenance is due (every 90 days)
cameraSchema.virtual('maintenanceDue').get(function() {
  if (!this.lastMaintenanceAt) return true;
  const daysSinceMaintenance = Math.floor((Date.now() - this.lastMaintenanceAt) / (1000 * 60 * 60 * 24));
  return daysSinceMaintenance >= 90;
});

// Method to update online status
cameraSchema.methods.updateOnlineStatus = function(isOnline) {
  this.isOnline = isOnline;
  if (isOnline) {
    this.lastOnlineAt = new Date();
  }
  return this.save();
};

// Static method to get active cameras for a room
cameraSchema.statics.getActiveCamerasForRoom = function(roomId) {
  return this.find({ 
    room: roomId, 
    isActive: true,
    isOnline: true 
  }).sort({ position: 1 });
};

// Make sure virtuals are included when converting to JSON
cameraSchema.set('toJSON', { virtuals: true });
cameraSchema.set('toObject', { virtuals: true });

const Camera = mongoose.model('Camera', cameraSchema);

module.exports = Camera;
