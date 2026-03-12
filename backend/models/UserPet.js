/**
 * UserPet Model
 * 1-to-many relationship with User model
 * Contains pet information for each user
 */

const mongoose = require('mongoose');
const validator = require('validator');

const userPetSchema = new mongoose.Schema({
  // Reference to User
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Pet Basic Information
  petName: {
    type: String,
    required: [true, 'Pet name is required'],
    trim: true,
    minlength: [2, 'Pet name must be at least 2 characters'],
    maxlength: [50, 'Pet name must be less than 50 characters'],
    validate: {
      validator: function(value) {
        return /^[a-zA-ZÀ-ỹ0-9\s\-\.]+$/.test(value);
      },
      message: 'Pet name can only contain letters, numbers, spaces, hyphens, and dots'
    }
  },

  // Pet Category/Species (simplified for easier testing)
  petType: {
    type: String,
    required: [true, 'Pet type/species is required'],
    trim: true,
    enum: {
      values: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'],
      message: 'Pet type must be one of: dog, cat, bird, fish, rabbit, hamster, other'
    },
    default: 'dog'
  },

  // Physical Characteristics
  breed: {
    type: String,
    required: [true, 'Pet breed is required'],
    trim: true,
    maxlength: [100, 'Breed name must be less than 100 characters']
  },

  gender: {
    type: String,
    required: [true, 'Pet gender is required'],
    enum: {
      values: ['male', 'female', 'unknown'],
      message: 'Pet gender must be male, female, or unknown'
    }
  },

  weight: {
    type: Number,
    required: [true, 'Pet weight is required'],
    min: [0.1, 'Pet weight must be at least 0.1 kg'],
    max: [200, 'Pet weight must be less than 200 kg'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value > 0;
      },
      message: 'Pet weight must be a positive number'
    }
  },

  // Age Information
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true;
        const today = new Date();
        const maxAge = new Date();
        maxAge.setFullYear(today.getFullYear() - 30); // Maximum 30 years old
        
        return value <= today && value >= maxAge;
      },
      message: 'Pet age must be between 0 and 30 years old'
    }
  },

  // Appearance
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
      message: 'Pet avatar must be a valid URL'
    }
  },

  color: {
    type: String,
    trim: true,
    maxlength: [100, 'Color description must be less than 100 characters']
  },

  // Health & Medical Information
  medicalRecords: [{
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    type: {
      type: String,
      trim: true,
      enum: ['checkup', 'vaccination', 'treatment', 'surgery', 'emergency', 'other'],
      default: 'checkup'
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
      maxlength: [200, 'Diagnosis must be less than 200 characters']
    },
    treatment: {
      type: String,
      trim: true,
      maxlength: [500, 'Treatment description must be less than 500 characters']
    },
    veterinarian: {
      type: String,
      trim: true,
      maxlength: [100, 'Veterinarian name must be less than 100 characters']
    },
    clinic: {
      type: String,
      trim: true,
      maxlength: [150, 'Clinic name must be less than 150 characters']
    },
    medications: [{
      type: String,
      trim: true
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes must be less than 1000 characters']
    }
  }],

  vaccinations: [{
    name: {
      type: String,
      required: [true, 'Vaccine name is required'],
      trim: true,
      maxlength: [100, 'Vaccine name must be less than 100 characters']
    },
    date: {
      type: Date,
      required: [true, 'Vaccination date is required']
    },
    nextDueDate: Date,
    veterinarian: {
      type: String,
      trim: true,
      maxlength: [100, 'Veterinarian name must be less than 100 characters']
    }
  }],

  // Behavioral Information
  temperament: {
    type: [String],
    enum: {
      values: [
        'friendly', 'aggressive', 'shy', 'playful', 'calm', 'energetic',
        'protective', 'gentle', 'curious', 'independent', 'loyal', 'anxious'
      ],
      message: 'Invalid temperament value'
    },
    default: []
  },

  specialNeeds: {
    type: String,
    trim: true,
    maxlength: [1000, 'Special needs description must be less than 1000 characters']
  },

  // Care Instructions
  feedingInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feeding instructions must be less than 1000 characters']
  },

  allergies: {
    type: [String],
    default: []
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes must be less than 2000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
// Create only necessary compound indexes for better performance
userPetSchema.index({ userID: 1, isActive: 1 });
userPetSchema.index({ userID: 1, createdAt: -1 });
userPetSchema.index({ breed: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual for pet age calculation
 */
userPetSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  const diffTime = Math.abs(today - birthDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
  }
});

/**
 * Virtual for weight category
 */
userPetSchema.virtual('weightCategory').get(function() {
  if (!this.weight) return null;
  
  if (this.weight < 5) return 'Small';
  if (this.weight < 20) return 'Medium';
  if (this.weight < 40) return 'Large';
  return 'Extra Large';
});

/**
 * Virtual for next vaccination due
 */
userPetSchema.virtual('nextVaccination').get(function() {
  if (!this.vaccinations || this.vaccinations.length === 0) return null;
  
  const upcomingVaccinations = this.vaccinations
    .filter(v => v.nextDueDate && v.nextDueDate > Date.now())
    .sort((a, b) => a.nextDueDate - b.nextDueDate);
  
  return upcomingVaccinations.length > 0 ? upcomingVaccinations[0] : null;
});

// ==================== PRE-SAVE HOOKS ====================

/**
 * Validate pet data before saving
 */
userPetSchema.pre('save', function() {
  // Ensure temperament array doesn't have duplicates
  if (this.temperament && this.temperament.length > 0) {
    this.temperament = [...new Set(this.temperament)];
  }
  
  // Ensure allergies array doesn't have duplicates
  if (this.allergies && this.allergies.length > 0) {
    this.allergies = [...new Set(this.allergies.map(a => a.trim().toLowerCase()))];
  }
});

// ==================== INSTANCE METHODS ====================

/**
 * Add medical record entry
 * @param {Object} medicalData - Medical record data
 * @returns {Promise<UserPet>} Updated pet
 */
userPetSchema.methods.addMedicalRecord = async function(medicalData) {
  this.medicalRecords.push({
    date: medicalData.date || Date.now(),
    type: medicalData.type || 'checkup',
    diagnosis: medicalData.diagnosis,
    treatment: medicalData.treatment || '',
    veterinarian: medicalData.veterinarian || '',
    clinic: medicalData.clinic || '',
    medications: medicalData.medications || [],
    notes: medicalData.notes || ''
  });
  
  return await this.save();
};

/**
 * Add vaccination record
 * @param {Object} vaccinationData - Vaccination data
 * @returns {Promise<UserPet>} Updated pet
 */
userPetSchema.methods.addVaccination = async function(vaccinationData) {
  this.vaccinations.push({
    name: vaccinationData.name,
    date: vaccinationData.date,
    nextDueDate: vaccinationData.nextDueDate,
    veterinarian: vaccinationData.veterinarian || ''
  });
  
  return await this.save();
};

/**
 * Update pet profile
 * @param {Object} updateData - Data to update
 * @returns {Promise<UserPet>} Updated pet
 */
userPetSchema.methods.updatePetProfile = async function(updateData) {
  const allowedFields = [
    'petName', 'petType', 'breed', 'gender', 'weight', 'dateOfBirth',
    'avatar', 'color', 'temperament', 'specialNeeds',
    'feedingInstructions', 'allergies', 'notes'
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

/**
 * Soft delete pet
 */
userPetSchema.methods.softDelete = async function() {
  this.isActive = false;
  return await this.save();
};

/**
 * Get health summary
 * @returns {Object} Health summary
 */
userPetSchema.methods.getHealthSummary = function() {
  return {
    totalMedicalRecords: this.medicalRecords.length,
    totalVaccinations: this.vaccinations.length,
    nextVaccination: this.nextVaccination,
    hasSpecialNeeds: !!this.specialNeeds,
    hasAllergies: this.allergies.length > 0,
    weightCategory: this.weightCategory
  };
};

// ==================== STATIC METHODS ====================

/**
 * Find all pets for a user
 * @param {string} userID - User ID
 * @param {boolean} activeOnly - Return only active pets
 * @returns {Promise<UserPet[]>}
 */
userPetSchema.statics.findByUserID = async function(userID, activeOnly = true) {
  const query = { userID };
  if (activeOnly) {
    query.isActive = true;
  }
  
  return this.find(query)
    .populate('userID', 'name email')
    .sort({ createdAt: -1 });
};

/**
 * Find pet by ID and user ID (security check)
 * @param {string} petId - Pet ID
 * @param {string} userID - User ID
 * @returns {Promise<UserPet|null>}
 */
userPetSchema.statics.findByIdAndUserID = async function(petId, userID) {
  return this.findOne({
    _id: petId,
    userID,
    isActive: true
  })
  .populate('userID', 'name email');
};

/**
 * Get pets by breed
 * @param {string} breed - Pet breed
 * @returns {Promise<UserPet[]>}
 */
userPetSchema.statics.findByBreed = async function(breed) {
  return this.find({
    breed: new RegExp(breed, 'i'),
    isActive: true
  }).populate('userID', 'name email');
};

/**
 * Get pets needing vaccinations
 * @param {Date} beforeDate - Check vaccinations due before this date
 * @returns {Promise<UserPet[]>}
 */
userPetSchema.statics.findNeedingVaccination = async function(beforeDate = new Date()) {
  return this.find({
    'vaccinations.nextDueDate': { $lte: beforeDate },
    isActive: true
  }).populate('userID', 'name email');
};

/**
 * Get pet statistics for a user
 * @param {string} userID - User ID
 * @returns {Promise<Object>} Pet statistics
 */
userPetSchema.statics.getUserPetStats = async function(userID) {
  const pets = await this.find({ userID, isActive: true });
  
  const stats = {
    totalPets: pets.length,
    species: {},
    byGender: { male: 0, female: 0, unknown: 0 },
    weightCategories: { Small: 0, Medium: 0, Large: 0, 'Extra Large': 0 },
    averageWeight: 0,
    upcomingVaccinations: 0
  };
  
  let totalWeight = 0;
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  
  pets.forEach(pet => {
    // Species distribution
    const type = pet.petType || 'other';
    stats.species[type] = (stats.species[type] || 0) + 1;

    // Gender distribution
    const gender = pet.gender || 'unknown';
    if (stats.byGender[gender] !== undefined) {
      stats.byGender[gender]++;
    }

    // Weight categories
    const weightCat = pet.weightCategory || 'Unknown';
    if (stats.weightCategories[weightCat] !== undefined) {
      stats.weightCategories[weightCat]++;
    }
    
    totalWeight += pet.weight || 0;
    
    // Upcoming vaccinations
    const hasUpcomingVaccination = pet.vaccinations.some(v => 
      v.nextDueDate && v.nextDueDate <= nextMonth && v.nextDueDate > today
    );
    if (hasUpcomingVaccination) stats.upcomingVaccinations++;
  });
  
  stats.averageWeight = pets.length > 0 ? parseFloat((totalWeight / pets.length).toFixed(1)) : 0;
  
  return stats;
};

const UserPet = mongoose.model('UserPet', userPetSchema);

module.exports = UserPet;