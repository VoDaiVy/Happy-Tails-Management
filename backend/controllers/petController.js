/**
 * Pet Controller
 * Handles user's pet management operations (CRUD)
 * All routes are protected by auth middleware and scoped to req.user.id
 */

const mongoose = require('mongoose');
const UserPet = require('../models/UserPet');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const { catchAsync } = require('../utils/catchAsync');
const { AppError } = require('../utils/AppError');

/**
 * @desc    Get all pets belonging to the logged-in user
 * @route   GET /api/pets
 * @access  Private
 */
const getMyPets = catchAsync(async (req, res, next) => {
  const userID = req.user.id;
  const { page = 1, limit = 10, breed, gender, active = 'true' } = req.query;

  // Build query
  const query = { userID };
  
  // Filter by active status
  if (active === 'true') {
    query.isActive = true;
  } else if (active === 'false') {
    query.isActive = false;
  }
  
  // Filter by breed (case-insensitive partial match)
  if (breed) {
    query.breed = new RegExp(breed, 'i');
  }
  
  // Filter by gender
  if (gender && ['male', 'female', 'unknown'].includes(gender)) {
    query.gender = gender;
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Get pets with pagination
  const pets = await UserPet.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const totalPets = await UserPet.countDocuments(query);
  const totalPages = Math.ceil(totalPets / parseInt(limit));

  // Get user stats
  const stats = await UserPet.getUserPetStats(userID);

  res.status(200).json({
    status: 'success',
    results: pets.length,
    data: {
      pets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPets,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      stats
    }
  });
});

/**
 * @desc    Get details of a single pet owned by the user
 * @route   GET /api/pets/:id
 * @access  Private
 */
const getMyPetById = catchAsync(async (req, res, next) => {
  const { id: petId } = req.params;
  const userID = req.user.id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(petId)) {
    return next(new AppError('Invalid pet ID format', 400, 'INVALID_ID'));
  }

  const pet = await UserPet.findOne({
    _id: petId,
    userID: userID,
    isActive: true
  });

  if (!pet) {
    return next(new AppError('Pet not found or you do not have permission to view this pet', 404, 'PET_NOT_FOUND'));
  }

  // Get health summary if method exists
  const healthSummary = pet.getHealthSummary ? pet.getHealthSummary() : null;

  res.status(200).json({
    status: 'success',
    data: {
      pet,
      healthSummary
    }
  });
});

/**
 * @desc    Create a new pet for the user
 * @route   POST /api/pets
 * @access  Private
 */
const createPet = catchAsync(async (req, res, next) => {
  const userID = req.user.id;
  const petData = { ...req.body, userID };

  // Validate required fields
  const requiredFields = ['petName', 'breed', 'gender', 'weight'];
  const missingFields = requiredFields.filter(field => !petData[field]);
  
  if (missingFields.length > 0) {
    return next(new AppError(
      `Missing required fields: ${missingFields.join(', ')}`, 
      400, 
      'VALIDATION_ERROR'
    ));
  }

  // Validate weight is a positive number
  if (isNaN(petData.weight) || petData.weight <= 0) {
    return next(new AppError('Weight must be a positive number', 400, 'VALIDATION_ERROR'));
  }

  // Validate date of birth if provided
  if (petData.dateOfBirth) {
    const dobDate = new Date(petData.dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return next(new AppError('Invalid date of birth format', 400, 'VALIDATION_ERROR'));
    }
    petData.dateOfBirth = dobDate;
  }

  // Create the pet
  const pet = await UserPet.create(petData);
  
  // Populate user reference
  await pet.populate('userID', 'name email');

  res.status(201).json({
    status: 'success',
    message: 'Pet created successfully',
    data: {
      pet
    }
  });
});

/**
 * @desc    Update a specific pet owned by the user
 * @route   PUT /api/pets/:id
 * @access  Private
 */
const updateMyPet = catchAsync(async (req, res, next) => {
  const { id: petId } = req.params;
  const userID = req.user.id;
  const updateData = req.body;

  // Find the pet and verify ownership
  const pet = await UserPet.findByIdAndUserID(petId, userID);

  if (!pet) {
    return next(new AppError('Pet not found or you do not have permission to update this pet', 404, 'PET_NOT_FOUND'));
  }

  // Validate weight if provided
  if (updateData.weight !== undefined) {
    if (isNaN(updateData.weight) || updateData.weight <= 0) {
      return next(new AppError('Weight must be a positive number', 400, 'VALIDATION_ERROR'));
    }
  }

  // Validate date of birth if provided
  if (updateData.dateOfBirth) {
    const dobDate = new Date(updateData.dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return next(new AppError('Invalid date of birth format', 400, 'VALIDATION_ERROR'));
    }
    updateData.dateOfBirth = dobDate;
  }

  // Prevent updating userID and petID for security
  delete updateData.userID;
  delete updateData._id;

  // Update the pet
  const updatedPet = await pet.updatePetProfile(updateData);

  res.status(200).json({
    status: 'success',
    message: 'Pet updated successfully',
    data: {
      pet: updatedPet
    }
  });
});

/**
 * @desc    Delete a specific pet owned by the user (soft delete)
 * @route   DELETE /api/pets/:id
 * @access  Private
 */
const deleteMyPet = catchAsync(async (req, res, next) => {
  const { id: petId } = req.params;
  const userID = req.user.id;

  // Find the pet and verify ownership
  const pet = await UserPet.findByIdAndUserID(petId, userID);

  if (!pet) {
    return next(new AppError('Pet not found or you do not have permission to delete this pet', 404, 'PET_NOT_FOUND'));
  }

  // Soft delete the pet
  await pet.softDelete();

  res.status(200).json({
    status: 'success',
    message: 'Pet deleted successfully'
  });
});

/**
 * @desc    Add medical records to a pet
 * @route   POST /api/pets/:id/medical-records
 * @access  Private
 */
const addMedicalRecord = catchAsync(async (req, res, next) => {
  const { id: petId } = req.params;
  const userID = req.user.id;
  const { diagnosis, treatment, veterinarian, date, type, clinic, medications, notes } = req.body;

  // Validate required fields
  if (!diagnosis) {
    return next(new AppError('Diagnosis is required', 400, 'VALIDATION_ERROR'));
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(petId)) {
    return next(new AppError('Invalid pet ID format', 400, 'INVALID_ID'));
  }

  // Find the pet and verify ownership
  const pet = await UserPet.findOne({
    _id: petId,
    userID: userID,
    isActive: true
  });

  if (!pet) {
    return next(new AppError('Pet not found or you do not have permission to add medical record', 404, 'PET_NOT_FOUND'));
  }

  // Add medical record
  const updatedPet = await pet.addMedicalRecord({
    date: date ? new Date(date) : Date.now(),
    type,
    diagnosis,
    treatment,
    veterinarian,
    clinic,
    medications,
    notes
  });

  // Sync to standalone MedicalRecord collection for staff view
  try {
    await MedicalRecord.create({
      userPet: petId,
      user: userID,
      recordType: type || 'checkup',
      condition: diagnosis,
      diagnosis,
      treatment,
      medications: medications?.map(m => ({ name: m, dosage: '', frequency: '', duration: '' })) || [],
      notes: notes || '',
      createdBy: userID
    });
  } catch (syncError) {
    console.warn('Failed to sync medical record to MedicalRecord collection:', syncError.message);
  }

  res.status(201).json({
    status: 'success',
    message: 'Medical records added successfully',
    data: {
      medicalRecord: updatedPet.medicalRecords[updatedPet.medicalRecords.length - 1]
    }
  });
});

/**
 * @desc    Add vaccination record to a pet
 * @route   POST /api/pets/:id/vaccinations
 * @access  Private
 */
const addVaccination = catchAsync(async (req, res, next) => {
  const { id: petId } = req.params;
  const userID = req.user.id;
  const { name, date, nextDueDate, veterinarian } = req.body;

  // Validate required fields
  if (!name || !date) {
    return next(new AppError('Vaccine name and date are required', 400, 'VALIDATION_ERROR'));
  }

  // Find the pet and verify ownership
  const pet = await UserPet.findByIdAndUserID(petId, userID);

  if (!pet) {
    return next(new AppError('Pet not found or you do not have permission to add vaccination record', 404, 'PET_NOT_FOUND'));
  }

  // Add vaccination
  const updatedPet = await pet.addVaccination({
    name,
    date: new Date(date),
    nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
    veterinarian
  });

  res.status(201).json({
    status: 'success',
    message: 'Vaccination record added successfully',
    data: {
      vaccination: updatedPet.vaccinations[updatedPet.vaccinations.length - 1]
    }
  });
});

/**
 * @desc    Get pets needing vaccination (for user)
 * @route   GET /api/pets/vaccination-reminders
 * @access  Private
 */
const getVaccinationReminders = catchAsync(async (req, res, next) => {
  const userID = req.user.id;
  const { days = 30 } = req.query;

  // Calculate date for upcoming vaccinations
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() + parseInt(days));

  // Find user's pets needing vaccinations
  const pets = await UserPet.find({
    userID,
    isActive: true,
    'vaccinations.nextDueDate': { 
      $gte: new Date(),
      $lte: checkDate 
    }
  });

  // Process pets to show upcoming vaccinations
  const reminders = pets.map(pet => {
    const upcomingVaccinations = pet.vaccinations.filter(v => 
      v.nextDueDate && 
      v.nextDueDate >= new Date() && 
      v.nextDueDate <= checkDate
    ).sort((a, b) => a.nextDueDate - b.nextDueDate);

    return {
      pet: {
        id: pet._id,
        name: pet.petName,
        breed: pet.breed,
        category: pet.petID
      },
      upcomingVaccinations
    };
  }).filter(item => item.upcomingVaccinations.length > 0);

  res.status(200).json({
    status: 'success',
    results: reminders.length,
    data: {
      reminders,
      checkPeriod: `${days} days`,
      checkDate
    }
  });
});

/**
 * @desc    Get pet statistics for the user
 * @route   GET /api/pets/statistics
 * @access  Private
 */
const getPetStatistics = catchAsync(async (req, res, next) => {
  const userID = req.user.id;

  const stats = await UserPet.getUserPetStats(userID);
  
  // Get additional statistics
  const pets = await UserPet.find({ userID, isActive: true });
  
  const additionalStats = {
    ...stats,
    temperamentDistribution: {},
    averageAge: 0,
    oldestPet: null,
    youngestPet: null
  };

  let totalAgeInMonths = 0;
  let petsWithAge = 0;
  let oldestAge = 0;
  let youngestAge = Infinity;

  pets.forEach(pet => {
    // Temperament distribution
    pet.temperament.forEach(temp => {
      additionalStats.temperamentDistribution[temp] = 
        (additionalStats.temperamentDistribution[temp] || 0) + 1;
    });

    // Age calculations
    if (pet.dateOfBirth) {
      const ageInMonths = Math.floor((Date.now() - pet.dateOfBirth) / (1000 * 60 * 60 * 24 * 30));
      totalAgeInMonths += ageInMonths;
      petsWithAge++;

      if (ageInMonths > oldestAge) {
        oldestAge = ageInMonths;
        additionalStats.oldestPet = {
          name: pet.petName,
          age: pet.age,
          ageInMonths
        };
      }

      if (ageInMonths < youngestAge) {
        youngestAge = ageInMonths;
        additionalStats.youngestPet = {
          name: pet.petName,
          age: pet.age,
          ageInMonths
        };
      }
    }
  });

  additionalStats.averageAge = petsWithAge > 0 ? 
    Math.round(totalAgeInMonths / petsWithAge) : 0;

  res.status(200).json({
    status: 'success',
    data: {
      statistics: additionalStats
    }
  });
});

/**
 * @desc    Staff quickly creates a pet for a walk-in guest (no auth needed for the guest)
 * @route   POST /api/pets/staff/quick-create
 * @access  Private (Staff, Admin)
 */
const quickCreatePet = catchAsync(async (req, res, next) => {
  const { userID, petName, petType, breed, gender, dateOfBirth, weight, color } = req.body;

  if (!userID || !petName || !petType || !breed || !gender || !weight) {
    return next(new AppError('userID, petName, petType, breed, gender and weight are required', 400, 'MISSING_FIELDS'));
  }

  // Verify owner exists
  const owner = await User.findById(userID);
  if (!owner || owner.isDeleted) {
    return next(new AppError('Owner account not found', 404, 'USER_NOT_FOUND'));
  }

  const validTypes = ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'];
  if (!validTypes.includes(petType)) {
    return next(new AppError(`petType must be one of: ${validTypes.join(', ')}`, 400, 'INVALID_PET_TYPE'));
  }

  const validGenders = ['male', 'female', 'unknown'];
  if (!validGenders.includes(gender)) {
    return next(new AppError(`gender must be one of: ${validGenders.join(', ')}`, 400, 'INVALID_GENDER'));
  }

  const pet = await UserPet.create({
    userID,
    petName,
    petType,
    breed,
    gender,
    weight,
    ...(dateOfBirth && { dateOfBirth }),
    ...(color       && { color })
  });

  res.status(201).json({
    status: 'success',
    message: 'Pet created successfully for walk-in guest',
    data: { pet }
  });
});

module.exports = {
  getMyPets,
  getMyPetById,
  createPet,
  updateMyPet,
  deleteMyPet,
  addMedicalRecord,
  addVaccination,
  getVaccinationReminders,
  getPetStatistics,
  quickCreatePet
};