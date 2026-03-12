/**
 * Profile Routes
 * All routes are protected by auth middleware
 * Handles user profile management operations
 */

const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  getProfileCompletion,
  deleteMyProfile,
  getProfilesByAgeRange
} = require('../controllers/profileController');

const { protect, restrictTo } = require('../middleware/auth');
const { handleUpload, avatarUpload } = require('../middleware/upload');

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(protect);

// Profile Management Routes
router.route('/me')
  .get(getMyProfile)                    // GET /api/profile/me - Get my profile
  .put(updateMyProfile)                 // PUT /api/profile/me - Update my profile
  .delete(deleteMyProfile);             // DELETE /api/profile/me - Delete my profile

// Avatar Management
router.put('/avatar', handleUpload(avatarUpload), updateAvatar);    // PUT /api/profile/avatar - Update avatar

// Profile Completion
router.get('/completion', getProfileCompletion);  // GET /api/profile/completion - Get completion status

// Admin-only routes (analytics)
router.get('/analytics/age-range', 
  restrictTo('admin'), 
  getProfilesByAgeRange
);  // GET /api/profile/analytics/age-range - Get profiles by age range (Admin only)

module.exports = router;