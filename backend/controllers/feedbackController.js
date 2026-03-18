/**
 * Feedback Controller
 * Handles customer feedback and review operations
 */

const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const { catchAsync } = require('../utils/catchAsync');
const { AppError } = require('../utils/AppError');
const { moderateFeedback } = require('../utils/aiService');

const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

const toTimestamp = (value) => {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
};

const getFeedbackWindowMeta = (booking, now = Date.now()) => {
  const completedAtTs =
    toTimestamp(booking?.completedAt) ||
    toTimestamp(booking?.updatedAt) ||
    null;

  if (!completedAtTs) {
    return {
      completedAtTs: null,
      feedbackDeadlineAt: null,
      isExpired: false,
    };
  }

  const feedbackDeadlineAt = new Date(completedAtTs + FEEDBACK_WINDOW_MS);
  return {
    completedAtTs,
    feedbackDeadlineAt,
    isExpired: now > feedbackDeadlineAt.getTime(),
  };
};

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
    .populate('staff', 'name email')
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
    .populate('booking service staff response.respondedBy')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: feedback.length,
    data: { feedback }
  });
});

/**
 * Create feedback
 * Customers can ONLY leave feedback for services in their COMPLETED bookings
 * and only within 24h from completion time.
 * @route POST /api/feedback
 * @access Private (Customer)
 */
exports.createFeedback = catchAsync(async (req, res, next) => {
  const { booking: bookingId, service: serviceId, rating, comment, images } = req.body;

  // booking is required — no booking, no feedback
  if (!bookingId) {
    return next(new AppError('Booking ID là bắt buộc để gửi feedback', 400, 'BOOKING_REQUIRED'));
  }

  // The booking must belong to this customer AND be completed
  const booking = await Booking.findOne({
    _id: bookingId,
    customer: req.user.id,
    status: 'completed'
  })
    .populate('items.service', 'name')
    .populate('assignedStaff', 'name email');

  if (!booking) {
    return next(new AppError('Lịch hẹn không tồn tại hoặc chưa hoàn thành', 404, 'BOOKING_NOT_FOUND'));
  }

  const { feedbackDeadlineAt, isExpired } = getFeedbackWindowMeta(booking);
  if (isExpired) {
    const deadlineText = feedbackDeadlineAt
      ? feedbackDeadlineAt.toLocaleString('vi-VN')
      : '24 giờ sau khi hoàn thành booking';
    return next(
      new AppError(
        `Feedback đã quá hạn. Bạn chỉ có thể gửi feedback trong vòng 24h sau khi booking hoàn thành (đến ${deadlineText}).`,
        400,
        'FEEDBACK_WINDOW_EXPIRED'
      )
    );
  }

  // If a specific service is provided, it must be in the booking's items
  if (serviceId) {
    const serviceInBooking = booking.items.some(
      item => item.service && item.service._id.toString() === serviceId.toString()
    );
    if (!serviceInBooking) {
      return next(new AppError('Dịch vụ này không nằm trong lịch hẹn đã chọn', 400, 'SERVICE_NOT_IN_BOOKING'));
    }

    // Prevent duplicate feedback per booking + service combo
    const existingFeedback = await Feedback.findOne({
      booking: bookingId,
      service: serviceId,
      user: req.user.id
    });
    if (existingFeedback) {
      return next(new AppError('Bạn đã gửi feedback cho dịch vụ này trong lịch hẹn này rồi', 400, 'FEEDBACK_EXISTS'));
    }
  } else {
    // No specific service — prevent duplicate overall booking feedback
    const existingFeedback = await Feedback.findOne({
      booking: bookingId,
      service: { $exists: false },
      user: req.user.id
    });
    if (existingFeedback) {
      return next(new AppError('Bạn đã gửi feedback cho lịch hẹn này rồi', 400, 'FEEDBACK_EXISTS'));
    }
  }

  // === AI MODERATION ===
  if (comment) {
    const moderation = await moderateFeedback(comment);
    if (moderation.isToxic) {
      return next(new AppError(
        `Bình luận chứa từ ngữ vi phạm tiêu chuẩn cộng đồng: ${moderation.reason}`,
        400,
        'TOXIC_CONTENT'
      ));
    }
  }

  const feedback = await Feedback.create({
    user: req.user.id,
    booking: bookingId,
    service: serviceId || undefined,
    staff: booking.assignedStaff?._id || booking.assignedStaff || undefined,
    rating,
    comment,
    images
  });

  await feedback.populate('service booking staff');

  res.status(201).json({
    status: 'success',
    message: 'Feedback đã được gửi thành công',
    data: { feedback }
  });
});

/**
 * Get feedback received by current staff
 * @route GET /api/feedback/staff/received
 * @access Private (Staff, Admin)
 */
exports.getMyReceivedFeedback = catchAsync(async (req, res, next) => {
  const populateFeedbackQuery = (query) =>
    query
      .populate('user', 'name email')
      .populate('staff', 'name email')
      .populate({
        path: 'booking',
        select: 'bookingNumber bookingDate bookingTime status assignedStaff',
        populate: { path: 'assignedStaff', select: 'name email' }
      })
      .populate('service', 'name')
      .populate('response.respondedBy', 'name email');

  let feedback = [];

  if (req.user.role === 'admin') {
    feedback = await populateFeedbackQuery(Feedback.find({}).sort('-createdAt'));
  } else {
    const staffId = String(req.user.id);

    const [directFeedback, legacyCandidates] = await Promise.all([
      populateFeedbackQuery(Feedback.find({ staff: req.user.id }).sort('-createdAt')),
      populateFeedbackQuery(
        Feedback.find({
          $or: [{ staff: { $exists: false } }, { staff: null }],
        }).sort('-createdAt')
      ),
    ]);

    const legacyFeedback = legacyCandidates.filter((item) => {
      const assigned = item?.booking?.assignedStaff;
      const assignedId = assigned?._id ? String(assigned._id) : assigned ? String(assigned) : null;
      return assignedId === staffId;
    });

    const mergedById = new Map();
    [...directFeedback, ...legacyFeedback].forEach((item) => {
      mergedById.set(String(item._id), item);
    });

    feedback = [...mergedById.values()].sort(
      (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
    );
  }

  res.status(200).json({
    status: 'success',
    results: feedback.length,
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

  // Re-moderate if comment changed
  if (comment !== undefined && comment !== feedback.comment) {
    const moderation = await moderateFeedback(comment);
    if (moderation.isToxic) {
      return next(new AppError(
        `Bình luận chứa từ ngữ vi phạm tiêu chuẩn cộng đồng: ${moderation.reason}`,
        400,
        'TOXIC_CONTENT'
      ));
    }
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
/**
 * @desc    Get all published feedback for a specific service (public)
 * @route   GET /api/feedback/service/:serviceId
 * @access  Public
 */
exports.getFeedbacksByService = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const query = { service: serviceId, isPublished: true };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [feedbacks, total] = await Promise.all([
    Feedback.find(query)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Feedback.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: feedbacks.length,
    data: {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
});

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

/**
 * Get completed bookings eligible for feedback
 * Returns completed bookings still in 24h feedback window,
 * with per-service feedback status (reviewed/not reviewed).
 * @route GET /api/feedback/eligible-bookings
 * @access Private (Customer)
 */
exports.getEligibleBookingsForFeedback = catchAsync(async (req, res, next) => {
  const now = Date.now();

  // Get all completed bookings for this customer
  const allCompletedBookings = await Booking.find({
    customer: req.user.id,
    status: 'completed'
  })
    .populate('items.service', 'name price images')
    .populate('items.pet', 'name')
    .populate('assignedStaff', 'name email')
    .sort('-bookingDate')
    .lean();

  const completedBookings = allCompletedBookings.filter(
    (booking) => !getFeedbackWindowMeta(booking, now).isExpired
  );

  if (completedBookings.length === 0) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { bookings: [] }
    });
  }

  // Get all feedback this customer already submitted for these bookings
  const bookingIds = completedBookings.map(b => b._id);
  const existingFeedbacks = await Feedback.find({
    user: req.user.id,
    booking: { $in: bookingIds }
  }).select('booking service rating').lean();

  // Build a lookup: bookingId -> Set of reviewed serviceIds
  const reviewedMap = {};
  for (const fb of existingFeedbacks) {
    const bId = fb.booking.toString();
    if (!reviewedMap[bId]) reviewedMap[bId] = new Set();
    if (fb.service) reviewedMap[bId].add(fb.service.toString());
    else reviewedMap[bId].add('__overall__');
  }

  // Annotate each booking's items with hasReviewed flag
  const bookings = completedBookings.map(booking => {
    const { feedbackDeadlineAt } = getFeedbackWindowMeta(booking, now);
    const reviewed = reviewedMap[booking._id.toString()] || new Set();
    const items = (booking.items || []).map(item => ({
      ...item,
      hasReviewed: item.service
        ? reviewed.has(item.service._id.toString())
        : false
    }));
    const hasOverallReviewed = reviewed.has('__overall__');
    const allReviewed = hasOverallReviewed || (items.length > 0 && items.every(i => i.hasReviewed));
    return {
      ...booking,
      items,
      allReviewed,
      hasOverallReviewed,
      feedbackDeadlineAt,
      feedbackWindowOpen: true,
    };
  });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});
