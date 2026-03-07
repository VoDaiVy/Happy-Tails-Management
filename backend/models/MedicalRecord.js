/**
 * MedicalRecord Model
 * Standalone medical records managed by staff/admin
 * Separate from the embedded records inside UserPet
 */

const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    userPet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserPet',
      required: [true, 'Pet reference (userPetID) is required']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference (userID) is required']
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    recordType: {
      type: String,
      enum: ['checkup', 'vaccination', 'treatment', 'surgery', 'emergency', 'grooming', 'other'],
      default: 'checkup'
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      trim: true,
      maxlength: [500, 'Condition must be less than 500 characters']
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
      maxlength: [1000, 'Diagnosis must be less than 1000 characters']
    },
    treatment: {
      type: String,
      required: [true, 'Treatment is required'],
      trim: true,
      maxlength: [2000, 'Treatment must be less than 2000 characters']
    },
    medications: [
      {
        name:      { type: String, required: true, trim: true },
        dosage:    { type: String, trim: true },
        frequency: { type: String, trim: true },
        duration:  { type: String, trim: true }
      }
    ],
    vitals: {
      weight:          { type: Number, min: 0 },
      temperature:     { type: Number },
      heartRate:       { type: Number, min: 0 },
      respiratoryRate: { type: Number, min: 0 }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes must be less than 2000 characters']
    },
    followUpDate: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

// Indexes
medicalRecordSchema.index({ userPet: 1, createdAt: -1 });
medicalRecordSchema.index({ user: 1,    createdAt: -1 });
medicalRecordSchema.index({ booking:    1 });
medicalRecordSchema.index({ recordType: 1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
module.exports = MedicalRecord;
