const express = require('express');
const {
  createBooking,
  createGuestBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  assignStaffToBooking,
  checkoutBooking,
  getAvailableSlots

} = require('../controllers/bookingController');

const { protect, restrictTo } = require('../middleware/auth');
const router = express.Router();

// All booking routes require authentication
router.use(protect);

// Customer routes
router.get('/available-slots', restrictTo('customer'), getAvailableSlots);  // GET /api/bookings/available-slots
router.post('/checkout', restrictTo('customer'), checkoutBooking);  // POST /api/bookings/checkout - Checkout with availability check
router.post('/', restrictTo('customer'), createBooking);  // POST /api/bookings - Create booking from cart
router.get('/my', restrictTo('customer'), getMyBookings);  // GET /api/bookings/my - Get my bookings

// Staff/Admin routes
router.post('/guest', restrictTo('staff', 'admin'), createGuestBooking);  // POST /api/bookings/guest - Create guest booking
router.get('/', restrictTo('staff', 'admin'), getAllBookings);  // GET /api/bookings - Get all bookings

// Shared routes (with permission checks inside controller)
router.get('/:id', getBookingById);  // GET /api/bookings/:id - Get booking details
router.put('/:id/cancel', cancelBooking);  // PUT /api/bookings/:id/cancel - Cancel booking

// Staff/Admin only routes
router.put('/:id/status', restrictTo('staff', 'admin'), updateBookingStatus);  // PUT /api/bookings/:id/status - Update booking status
router.put('/:id/assign-staff', restrictTo('staff', 'admin'), assignStaffToBooking);  // PUT /api/bookings/:id/assign-staff - Assign staff

module.exports = router;