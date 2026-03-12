/**
 * Profile Controller
 * Handles user profile management operations
 * All routes are protected by auth middleware
 */

const UserDetail = require('../models/UserDetail');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const { AppError } = require('../utils/AppError');
const uploadService = require('../services/upload.service');

/**
 * @desc    Get logged-in user's profile
 * @route   GET /api/profile/me
 * @access  Private
 */
const getMyProfile = catchAsync(async (req, res, next) => {
  const userID = req.user.id;

  // Find user profile
  let userDetail = await UserDetail.findByUserID(userID);

  // If no profile exists, create a skeleton profile
  if (!userDetail) {
    userDetail = new UserDetail({ userID });
  }

  // Get completion percentage
  const completionPercentage = userDetail.getCompletionPercentage();

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        isEmailVerified: req.user.isEmailVerified,
        lastLogin: req.user.lastLogin
      },
      profile: userDetail,
      completionPercentage,
      isProfileComplete: userDetail.isProfileComplete
    }
  });
});

/**
 * @desc    Update logged-in user's profile
 * @route   PUT /api/profile/me
 * @access  Private
 */
const updateMyProfile = catchAsync(async (req, res, next) => {
  const userID = req.user.id;
  const updateData = req.body;

  // Validate required fields are not empty strings
  const requiredFields = ['firstName', 'lastName', 'tel', 'dob', 'gender'];
  for (const field of requiredFields) {
    if (updateData[field] === '') {
      return next(new AppError(`${field} cannot be empty`, 400, 'VALIDATION_ERROR'));
    }
  }

  // Validate date of birth format
  if (updateData.dob) {
    const dobDate = new Date(updateData.dob);
    if (isNaN(dobDate.getTime())) {
      return next(new AppError('Invalid date of birth format', 400, 'VALIDATION_ERROR'));
    }
    updateData.dob = dobDate;
  }

  // Check if profile exists
  let userDetail = await UserDetail.findByUserID(userID);

  if (userDetail) {
    // Update existing profile
    userDetail = await userDetail.updateProfile(updateData);
  } else {
    // Create new profile
    userDetail = await UserDetail.createOrUpdate(userID, updateData);
  }

  // Populate user data
  await userDetail.populate('userID', 'email name role');

  // Get updated completion percentage
  const completionPercentage = userDetail.getCompletionPercentage();

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      profile: userDetail,
      completionPercentage,
      isProfileComplete: userDetail.isProfileComplete
    }
  });
});

/**
 * @desc    Upload profile avatar (placeholder for file upload)
 * @route   PUT /api/profile/avatar
 * @access  Private
 */
const updateAvatar = catchAsync(async (req, res, next) => {
  const userID = req.user.id;

  // Accept a file upload (via multer) or a URL in the request body as fallback
  let avatarUrl;
  if (req.file) {
    avatarUrl = req.file.path; // Cloudinary secure_url
  } else if (req.body && req.body.avatar) {
    try {
      new URL(req.body.avatar);
      avatarUrl = req.body.avatar;
    } catch {
      return next(new AppError('Invalid avatar URL format', 400, 'VALIDATION_ERROR'));
    }
  } else {
    return next(new AppError('No avatar file or URL provided', 400, 'VALIDATION_ERROR'));
  }

  let userDetail = await UserDetail.findByUserID(userID);

  if (!userDetail) {
    return next(new AppError('Please complete your basic profile first', 400, 'PROFILE_INCOMPLETE'));
  }

  // Delete old Cloudinary avatar when replacing with a new upload
  if (req.file && userDetail.avatar) {
    await uploadService.deleteImage(userDetail.avatar);
  }

  userDetail.avatar = avatarUrl;
  await userDetail.save();

  res.status(200).json({
    status: 'success',
    message: 'Avatar updated successfully',
    data: {
      avatar: userDetail.avatar
    }
  });
});

/**
 * @desc    Get profile completion status
 * @route   GET /api/profile/completion
 * @access  Private
 */
const getProfileCompletion = catchAsync(async (req, res, next) => {
  const userID = req.user.id;

  const userDetail = await UserDetail.findByUserID(userID);
  
  if (!userDetail) {
    return res.status(200).json({
      status: 'success',
      data: {
        completionPercentage: 0,
        isProfileComplete: false,
        missingFields: ['firstName', 'lastName', 'tel', 'dob', 'gender', 'avatar', 'bio']
      }
    });
  }

  const completionPercentage = userDetail.getCompletionPercentage();
  
  // Identify missing fields
  const allFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'tel', label: 'Phone Number' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'avatar', label: 'Profile Picture' },
    { key: 'bio', label: 'Biography' },
    { key: 'address.street', label: 'Street Address' },
    { key: 'address.city', label: 'City' }
  ];

  const missingFields = allFields.filter(field => {
    const value = field.key.includes('.') ? 
      field.key.split('.').reduce((obj, key) => obj?.[key], userDetail) : 
      userDetail[field.key];
    return !value;
  }).map(field => field.label);

  res.status(200).json({
    status: 'success',
    data: {
      completionPercentage,
      isProfileComplete: userDetail.isProfileComplete,
      missingFields
    }
  });
});

/**
 * @desc    Delete user profile (soft delete)
 * @route   DELETE /api/profile/me
 * @access  Private
 */
const deleteMyProfile = catchAsync(async (req, res, next) => {
  const userID = req.user.id;

  const userDetail = await UserDetail.findByUserID(userID);
  
  if (!userDetail) {
    return next(new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND'));
  }

  // Remove the profile (hard delete for profile, but user remains)
  await UserDetail.findByIdAndDelete(userDetail._id);

  res.status(200).json({
    status: 'success',
    message: 'Profile deleted successfully'
  });
});

/**
 * @desc    Get profile by age range (Admin only - for analytics)
 * @route   GET /api/profile/analytics/age-range?minAge=18&maxAge=65
 * @access  Private (Admin)
 */
const getProfilesByAgeRange = catchAsync(async (req, res, next) => {
  // This would typically be protected by admin middleware
  const { minAge = 0, maxAge = 120 } = req.query;

  const profiles = await UserDetail.findByAgeRange(
    parseInt(minAge), 
    parseInt(maxAge)
  );

  // Don't return sensitive information
  const sanitizedProfiles = profiles.map(profile => ({
    id: profile._id,
    age: profile.age,
    gender: profile.gender,
    city: profile.address?.city,
    completionPercentage: profile.getCompletionPercentage(),
    createdAt: profile.createdAt
  }));

  res.status(200).json({
    status: 'success',
    results: sanitizedProfiles.length,
    data: {
      profiles: sanitizedProfiles,
      analytics: {
        totalProfiles: sanitizedProfiles.length,
        ageRange: { min: minAge, max: maxAge },
        genderDistribution: sanitizedProfiles.reduce((acc, profile) => {
          acc[profile.gender] = (acc[profile.gender] || 0) + 1;
          return acc;
        }, {}),
        avgCompletionPercentage: sanitizedProfiles.reduce((sum, profile) => 
          sum + profile.completionPercentage, 0) / (sanitizedProfiles.length || 1)
      }
    }
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  getProfileCompletion,
  deleteMyProfile,
  getProfilesByAgeRange
};