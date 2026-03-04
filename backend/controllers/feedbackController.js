/**
 * Feedback Controller
 * Handles customer feedback and review operations
 */

const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all feedback (public view)
 * @route GET /api/feedback
 * @access Public
 */
exports.getAllFeedback = catchAsync(async (req, res, next) => {
  const { service, rating, isPublished = 'true' } = req.query;
  
  const filter = {};
  
  // Only show published feedback to non-staff users
  if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'admin')) {
    filter.isPublished = true;
  } else if (isPublished !== 'all') {
    filter.isPublished = isPublished === 'true';
  }
  
  if (service) filter.service = service;
  if (rating) filter.rating = Number(rating);

  const feedback = await Feedback.find(filter)
    .populate('user', 'name')
    .populate('service', 'name')
    .populate('response.respondedBy', 'name')
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    status: 'success',
    results: feedback.length,
    data: { feedback }
  });
});

/**
 * Get my feedback
 * @route GET /api/feedback/my
 * @access Private (Customer)
 */
exports.getMyFeedback = catchAsync(async (req, res, next) => {
  const feedback = await Feedback.find({ user: req.user.id })
    .populate('booking service response.respondedBy')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: feedback.length,
    data: { feedback }
  });
});

/**
 * Create feedback
 * @route POST /api/feedback
 * @access Private (Customer)
 */
exports.createFeedback = catchAsync(async (req, res, next) => {
  const { booking, service, rating, comment, images } = req.body;

  // Validate booking if provided
  if (booking) {
    const bookingExists = await Booking.findOne({
      _id: booking,
      customer: req.user.id,
      status: 'completed'
    });
    
    if (!bookingExists) {
      return next(new AppError('Booking not found or not completed', 404, 'BOOKING_NOT_FOUND'));
    }

    // Check if feedback already exists for this booking
    const existingFeedback = await Feedback.findOne({ booking, user: req.user.id });
    if (existingFeedback) {
      return next(new AppError('You have already submitted feedback for this booking', 400, 'FEEDBACK_EXISTS'));
    }
  }

  const feedback = await Feedback.create({
    user: req.user.id,
    booking,
    service,
    rating,
    comment,
    images
  });

  await feedback.populate('service booking');

  res.status(201).json({
    status: 'success',
    message: 'Feedback submitted successfully',
    data: { feedback }
  });
});

/**
 * Update feedback
 * @route PUT /api/feedback/:id
 * @access Private (Customer - own)
 */
exports.updateFeedback = catchAsync(async (req, res, next) => {
  const { rating, comment, images } = req.body;

  const feedback = await Feedback.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!feedback) {
    return next(new AppError('Feedback not found', 404, 'FEEDBACK_NOT_FOUND'));
  }

  if (rating !== undefined) feedback.rating = rating;
  if (comment !== undefined) feedback.comment = comment;
  if (images !== undefined) feedback.images = images;

  await feedback.save();

  res.status(200).json({
    status: 'success',
    message: 'Feedback updated successfully',
    data: { feedback }
  });
});

/**
 * Delete feedback
 * @route DELETE /api/feedback/:id
 * @access Private (Customer - own, Admin)
 */
exports.deleteFeedback = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  
  // Customer can only delete own feedback
  if (req.user.role === 'customer') {
    filter.user = req.user.id;
  }

  const feedback = await Feedback.findOneAndDelete(filter);

  if (!feedback) {
    return next(new AppError('Feedback not found', 404, 'FEEDBACK_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Feedback deleted successfully',
    data: null
  });
});

/**
 * Respond to feedback
 * @route PUT /api/feedback/:id/respond
 * @access Private (Staff, Admin)
 */
exports.respondToFeedback = catchAsync(async (req, res, next) => {
  const { message } = req.body;

  if (!message) {
    return next(new AppError('Response message is required', 400, 'MESSAGE_REQUIRED'));
  }

  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new AppError('Feedback not found', 404, 'FEEDBACK_NOT_FOUND'));
  }

  feedback.response = {
    message,
    respondedBy: req.user.id,
    respondedAt: Date.now()
  };

  await feedback.save();
  await feedback.populate('response.respondedBy', 'name email');

  res.status(200).json({
    status: 'success',
    message: 'Response added successfully',
    data: { feedback }
  });
});

/**
 * Toggle feedback publish status
 * @route PUT /api/feedback/:id/publish
 * @access Private (Admin)
 */
exports.togglePublishStatus = catchAsync(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new AppError('Feedback not found', 404, 'FEEDBACK_NOT_FOUND'));
  }

  feedback.isPublished = !feedback.isPublished;
  await feedback.save();

  res.status(200).json({
    status: 'success',
    message: `Feedback ${feedback.isPublished ? 'published' : 'unpublished'} successfully`,
    data: { feedback }
  });
});
