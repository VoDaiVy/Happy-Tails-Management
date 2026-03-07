/**
 * Feedback Routes
 * Customer feedback and review management
 */

const express = require('express');
const {
  getAllFeedback,
  getMyFeedback,
  getFeedbacksByService,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  respondToFeedback,
  togglePublishStatus
} = require('../controllers/feedbackController');

const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllFeedback);  // GET /api/feedback - Get all published feedback
router.get('/service/:serviceId', getFeedbacksByService);  // GET /api/feedback/service/:serviceId - Get feedback for a service

// Customer routes
router.use(protect);

router.get('/my', restrictTo('customer'), getMyFeedback);  // GET /api/feedback/my - Get my feedback
router.post('/', restrictTo('customer'), createFeedback);  // POST /api/feedback - Create feedback

router.route('/:id')
  .put(restrictTo('customer'), updateFeedback)  // PUT /api/feedback/:id - Update feedback
  .delete(deleteFeedback);  // DELETE /api/feedback/:id - Delete feedback (Customer - own, Admin - all)

// Staff and Admin routes
router.put('/:id/respond', restrictTo('staff', 'admin'), respondToFeedback);  // PUT /api/feedback/:id/respond - Respond to feedback
router.put('/:id/publish', restrictTo('admin'), togglePublishStatus);  // PUT /api/feedback/:id/publish - Toggle publish status

module.exports = router;
