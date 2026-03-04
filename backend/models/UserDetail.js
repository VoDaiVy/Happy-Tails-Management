/**
 * UserDetail Model
 * 1-to-1 relationship with User model
 * Contains detailed user profile information
 */

const mongoose = require('mongoose');
const validator = require('validator');

const userDetailSchema = new mongoose.Schema({
  // Reference to User
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },

  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name must be less than 50 characters'],
    validate: {
      validator: function(value) {
        return /^[a-zA-ZÀ-ỹ\s]+$/.test(value);
      },
      message: 'First name can only contain letters and spaces'
    }
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name must be less than 50 characters'],
    validate: {
      validator: function(value) {
        return /^[a-zA-ZÀ-ỹ\s]+$/.test(value);
      },
      message: 'Last name can only contain letters and spaces'
    }
  },

  // Contact Information
  tel: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(value) {
        // Vietnamese phone number format: +84, 84, or 0 followed by 9-10 digits
        return /^(\+84|84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-6|8|9]|9[0-4|6-9])[0-9]{7}$/.test(value);
      },
      message: 'Invalid Vietnamese phone number format'
    }
  },

  // Personal Details
  dob: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value) {
        const today = new Date();
        const minAge = new Date();
        minAge.setFullYear(today.getFullYear() - 13); // Minimum 13 years old
        const maxAge = new Date();
        maxAge.setFullYear(today.getFullYear() - 120); // Maximum 120 years old
        
        return value <= minAge && value >= maxAge;
      },
      message: 'Age must be between 13 and 120 years old'
    }
  },

  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Gender must be male, female, or other'
    }
  },

  // Profile Picture
  avatar: {
    type: String,
    default: null,
    validate: {
      validator: function(value) {
        if (!value) return true;
        return validator.isURL(value, {
          protocols: ['http', 'https'],
          require_protocol: true
        });
      },
      message: 'Avatar must be a valid URL'
    }
  },

  // Additional Profile Information
  bio: {
    type: String,
    maxlength: [500, 'Bio must be less than 500 characters'],
    trim: true,
    default: null
  },

  // Address Information (Optional)
  address: {
    street: {
      type: String,
      maxlength: [200, 'Street address must be less than 200 characters'],
      trim: true
    },
    district: {
      type: String,
      maxlength: [100, 'District must be less than 100 characters'],
      trim: true
    },
    city: {
      type: String,
      maxlength: [100, 'City must be less than 100 characters'],
      trim: true
    },
    province: {
      type: String,
      maxlength: [100, 'Province must be less than 100 characters'],
      trim: true
    },
    postalCode: {
      type: String,
      validate: {
        validator: function(value) {
          if (!value) return true;
          // Vietnamese postal code format: 6 digits
          return /^\d{6}$/.test(value);
        },
        message: 'Postal code must be 6 digits'
      }
    }
  },

  // Profile Completion
  isProfileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
// userID index is automatically created by unique: true
// Only keeping explicit indexes for performance

// ==================== VIRTUALS ====================

/**
 * Virtual for full name
 */
userDetailSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Virtual for age calculation
 */
userDetailSchema.virtual('age').get(function() {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

/**
 * Virtual for formatted address
 */
userDetailSchema.virtual('fullAddress').get(function() {
  const address = this.address;
  if (!address || !address.street) return null;
  
  const parts = [
    address.street,
    address.district,
    address.city,
    address.province
  ].filter(Boolean);
  
  return parts.join(', ');
});

// ==================== PRE-SAVE HOOKS ====================

/**
 * Update profile completion status before saving
 */
userDetailSchema.pre('save', function() {
  // Check if all required fields are filled
  const requiredFields = ['firstName', 'lastName', 'tel', 'dob', 'gender'];
  const optionalFields = ['avatar', 'bio'];
  
  const requiredComplete = requiredFields.every(field => this[field]);
  const hasOptional = optionalFields.some(field => this[field]);
  
  this.isProfileComplete = requiredComplete && hasOptional;
});

// ==================== INSTANCE METHODS ====================

/**
 * Get profile completion percentage
 * @returns {number} Completion percentage
 */
userDetailSchema.methods.getCompletionPercentage = function() {
  const fields = [
    'firstName', 'lastName', 'tel', 'dob', 'gender', 
    'avatar', 'bio', 'address.street', 'address.city'
  ];
  
  let filledFields = 0;
  fields.forEach(field => {
    const value = field.includes('.') ? 
      field.split('.').reduce((obj, key) => obj?.[key], this) : 
      this[field];
    
    if (value) filledFields++;
  });
  
  return Math.round((filledFields / fields.length) * 100);
};

/**
 * Update profile data with validation
 * @param {Object} updateData - Data to update
 * @returns {Promise<UserDetail>} Updated profile
 */
userDetailSchema.methods.updateProfile = async function(updateData) {
  // Filter allowed fields
  const allowedFields = [
    'firstName', 'lastName', 'tel', 'dob', 'gender', 
    'avatar', 'bio', 'address'
  ];
  
  const filteredData = {};
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });
  
  Object.assign(this, filteredData);
  return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find profile by user ID
 * @param {string} userID - User ID
 * @returns {Promise<UserDetail|null>}
 */
userDetailSchema.statics.findByUserID = async function(userID) {
  return this.findOne({ userID }).populate('userID', 'email name role');
};

/**
 * Create or update user profile
 * @param {string} userID - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<UserDetail>}
 */
userDetailSchema.statics.createOrUpdate = async function(userID, profileData) {
  const existingProfile = await this.findOne({ userID });
  
  if (existingProfile) {
    return await existingProfile.updateProfile(profileData);
  }
  
  return await this.create({ userID, ...profileData });
};

/**
 * Get profiles by age range
 * @param {number} minAge - Minimum age
 * @param {number} maxAge - Maximum age
 * @returns {Promise<UserDetail[]>}
 */
userDetailSchema.statics.findByAgeRange = async function(minAge, maxAge) {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() - minAge);
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - maxAge);
  
  return this.find({
    dob: {
      $gte: minDate,
      $lte: maxDate
    }
  });
};

const UserDetail = mongoose.model('UserDetail', userDetailSchema);

module.exports = UserDetail;