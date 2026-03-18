/**
 * Group Capacity Config Model
 * Admin configuration for max concurrent capacity per service group (wet/dry)
 * Used to limit slots available for booking based on group occupancy
 */

const mongoose = require('mongoose');

const groupCapacityConfigSchema = new mongoose.Schema(
  {
    /**
     * Service group identifier: 'wet' or 'dry'
     * - wet: Tắm, Sấy, Massage, Trị liệu (Rooms 201/202)
     * - dry: Cắt tỉa, Cắt móng, Nhuộm (Rooms 101/102)
     */
    group: {
      type: String,
      enum: ['wet', 'dry'],
      unique: true,
      required: [true, 'Service group is required']
    },
    
    /**
     * Maximum concurrent capacity for this group per 15-minute slot
     * Default: 6 (3 per room x 2 rooms)
     * Can be adjusted based on operational needs
     */
    maxCapacity: {
      type: Number,
      required: [true, 'Max capacity is required'],
      min: [1, 'Max capacity must be at least 1'],
      max: [20, 'Max capacity cannot exceed 20'],
      default: 6
    },
    
    /**
     * Number of rooms in this group
     * Default: 2 (e.g., 101 & 102 for dry, 201 & 202 for wet)
     */
    roomCount: {
      type: Number,
      required: [true, 'Room count is required'],
      min: [1, 'Room count must be at least 1'],
      default: 2
    },
    
    /**
     * Slots per room (used for room assignment strategy)
     * Default: 3 (3 concurrent bookings per room)
     */
    slotsPerRoom: {
      type: Number,
      required: [true, 'Slots per room is required'],
      min: [1, 'Slots per room must be at least 1'],
      default: 3
    },
    
    /**
     * Description or notes about this group configuration
     */
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be less than 500 characters']
    },
    
    /**
     * Whether this configuration is active
     */
    isActive: {
      type: Boolean,
      default: true
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
  },
  {
    timestamps: true
  }
);

// Index for faster lookups
groupCapacityConfigSchema.index({ group: 1, isActive: 1 });

/**
 * Static method: Get capacity config by group
 */
groupCapacityConfigSchema.statics.getByGroup = function(group) {
  return this.findOne({ group, isActive: true });
};

/**
 * Static method: Get all active capacity configs
 */
groupCapacityConfigSchema.statics.getActive = function() {
  return this.find({ isActive: true });
};

/**
 * Instance method: Get effective capacity
 */
groupCapacityConfigSchema.methods.getEffectiveCapacity = function() {
  return this.maxCapacity;
};

const GroupCapacityConfig = mongoose.model('GroupCapacityConfig', groupCapacityConfigSchema);

module.exports = GroupCapacityConfig;
