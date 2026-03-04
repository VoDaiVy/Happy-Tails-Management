/**
 * Room Routes
 * Room management for boarding services
 */

const express = require('express');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');

const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllRooms);  // GET /api/rooms - Get all rooms
router.get('/:id', optionalAuth, getRoomById);  // GET /api/rooms/:id - Get room details

// Admin only routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', createRoom);  // POST /api/rooms - Create room

router.route('/:id')
  .put(updateRoom)          // PUT /api/rooms/:id - Update room
  .delete(deleteRoom);      // DELETE /api/rooms/:id - Delete room

module.exports = router;
