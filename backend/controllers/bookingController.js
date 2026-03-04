/**
 * Booking Controller
 * Handles booking management operations
 */

const Booking = require('../models/Booking');
const Cart = require('../models/Cart');
const Service = require('../models/Service');
const UserPet = require('../models/UserPet');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Create booking from cart
 * @route POST /api/bookings
 * @access Private (Customer)
 */
exports.createBooking = catchAsync(async (req, res, next) => {
  const { bookingDate, bookingTime, notes, paymentMethod = 'cash' } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ userID: req.user.id }).populate('items.service items.pet');
  
  if (!cart || cart.items.length === 0) {
    return next(new AppError('Cart is empty', 400, 'CART_EMPTY'));
  }

  // Create booking
  const booking = await Booking.create({
    customer: req.user.id,
    items: cart.items,
    bookingDate,
    bookingTime,
    totalAmount: cart.totalAmount,
    paymentMethod,
    notes
  });

  // Clear cart after booking
  cart.items = [];
  await cart.save();

  await booking.populate('customer items.service items.pet');

  res.status(201).json({
    status: 'success',
    message: 'Booking created successfully',
    data: { booking }
  });
});

/**
 * Create guest booking (no account required)
 * @route POST /api/bookings/guest
 * @access Private (Staff)
 */
exports.createGuestBooking = catchAsync(async (req, res, next) => {
  const { guestInfo, items, bookingDate, bookingTime, notes, paymentMethod = 'cash' } = req.body;

  if (!guestInfo || !guestInfo.name || !guestInfo.email || !guestInfo.phone) {
    return next(new AppError('Guest info is required', 400, 'GUEST_INFO_REQUIRED'));
  }

  // Calculate total
  const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  const booking = await Booking.create({
    guestInfo,
    items,
    bookingDate,
    bookingTime,
    totalAmount,
    paymentMethod,
    notes,
    assignedStaff: req.user.id
  });

  res.status(201).json({
    status: 'success',
    message: 'Guest booking created successfully',
    data: { booking }
  });
});

/**
 * Get my bookings
 * @route GET /api/bookings/my
 * @access Private (Customer)
 */
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  
  const filter = { customer: req.user.id };
  if (status) {
    filter.status = status;
  }

  const bookings = await Booking.find(filter)
    .populate('items.service items.pet assignedStaff', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

/**
 * Get all bookings
 * @route GET /api/bookings
 * @access Private (Staff, Admin)
 */
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const { status, date, customer } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (date) filter.bookingDate = { $gte: new Date(date), $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) };
  if (customer) filter.customer = customer;

  const bookings = await Booking.find(filter)
    .populate('customer items.service items.pet assignedStaff room', 'name email roomNumber')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Private (Customer - own, Staff, Admin)
 */
exports.getBookingById = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('customer items.service items.pet assignedStaff room cancelledBy');

  if (!booking) {
    return next(new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND'));
  }

  // Check permission: customer can only see their own bookings
  if (req.user.role === 'customer' && booking.customer.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this booking', 403, 'FORBIDDEN'));
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

/**
 * Update booking status
 * @route PUT /api/bookings/:id/status
 * @access Private (Staff, Admin)
 */
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return next(new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND'));
  }

  booking.status = status;
  
  if (status === 'completed') {
    booking.completedAt = Date.now();
  }

  await booking.save();
  await booking.populate('customer items.service items.pet assignedStaff');

  res.status(200).json({
    status: 'success',
    message: 'Booking status updated',
    data: { booking }
  });
});

/**
 * Cancel booking
 * @route PUT /api/bookings/:id/cancel
 * @access Private (Customer - own, Staff, Admin)
 */
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return next(new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND'));
  }

  // Check permission: customer can only cancel their own bookings
  if (req.user.role === 'customer' && booking.customer.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to cancel this booking', 403, 'FORBIDDEN'));
  }

  if (booking.status === 'cancelled') {
    return next(new AppError('Booking is already cancelled', 400, 'ALREADY_CANCELLED'));
  }

  if (booking.status === 'completed') {
    return next(new AppError('Cannot cancel completed booking', 400, 'CANNOT_CANCEL_COMPLETED'));
  }

  booking.status = 'cancelled';
  booking.cancellationReason = reason;
  booking.cancelledAt = Date.now();
  booking.cancelledBy = req.user.id;

  await booking.save();
  await booking.populate('customer items.service items.pet');

  res.status(200).json({
    status: 'success',
    message: 'Booking cancelled successfully',
    data: { booking }
  });
});

/**
 * Assign staff to booking
 * @route PUT /api/bookings/:id/assign-staff
 * @access Private (Staff, Admin)
 */
exports.assignStaffToBooking = catchAsync(async (req, res, next) => {
  const { staffId } = req.body;

  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { assignedStaff: staffId },
    { new: true, runValidators: true }
  ).populate('assignedStaff', 'name email role');

  if (!booking) {
    return next(new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Staff assigned to booking',
    data: { booking }
  });
});
