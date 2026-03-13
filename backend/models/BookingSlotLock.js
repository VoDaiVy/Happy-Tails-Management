/**
 * Booking Slot Lock Model
 * Prevents concurrent overbooking on the same group/time-slot.
 */

const mongoose = require("mongoose");

const bookingSlotLockSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    group: {
      type: String,
      enum: ["wet", "dry"],
      required: true,
      index: true,
    },
    slotStart: {
      type: Date,
      required: true,
      index: true,
    },
    holder: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Auto-remove stale locks.
bookingSlotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BookingSlotLock = mongoose.model("BookingSlotLock", bookingSlotLockSchema);
module.exports = BookingSlotLock;
