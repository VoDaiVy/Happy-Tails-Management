const express = require('express');
const {
  getAllFeedback,
  getMyFeedback,
  getMyReceivedFeedback,
  getEligibleBookingsForFeedback,
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
router.get('/', optionalAuth, getAllFeedback);
router.get('/service/:serviceId', getFeedbacksByService);

// Customer routes
router.use(protect);

router.get('/my', restrictTo('customer'), getMyFeedback);
router.get('/eligible-bookings', restrictTo('customer'), getEligibleBookingsForFeedback);
router.post('/', restrictTo('customer'), createFeedback);

// Staff inbox
router.get('/staff/received', restrictTo('staff', 'admin'), getMyReceivedFeedback);

router.route('/:id')
  .put(restrictTo('customer'), updateFeedback)
  .delete(deleteFeedback);

// Staff and Admin routes
router.put('/:id/respond', restrictTo('staff', 'admin'), respondToFeedback);
router.put('/:id/publish', restrictTo('admin'), togglePublishStatus);

module.exports = router;
