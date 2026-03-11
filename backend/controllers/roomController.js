/**
 * Room Controller
 * Handles room management operations
 */

const Room = require('../models/Room');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all rooms
 * @route GET /api/rooms
 * @access Public
 */
exports.getAllRooms = catchAsync(async (req, res, next) => {
  const { type, isAvailable, isActive = 'true', petType } = req.query;
  
  const filter = {};
  
  if (isActive !== 'all') {
    filter.isActive = isActive === 'true';
  }
  
  if (type) filter.type = type;
  if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
  if (petType) filter.petTypes = petType;

  const rooms = await Room.find(filter)
    .populate('createdBy', 'name email')
    .sort('roomNumber');

  res.status(200).json({
    status: 'success',
    results: rooms.length,
    data: { rooms }
  });
});

/**
 * Get room by ID
 * @route GET /api/rooms/:id
 * @access Public
 */
exports.getRoomById = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!room) {
    return next(new AppError('Room not found', 404, 'ROOM_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    data: { room }
  });
});

/**
 * Create new room
 * @route POST /api/rooms
 * @access Private (Admin)
 */
exports.createRoom = catchAsync(async (req, res, next) => {
  const { roomNumber, name, type, capacity, amenities, images, petTypes, description } = req.body;

  const room = await Room.create({
    roomNumber,
    name,
    type,
    capacity,
    amenities,
    images,
    petTypes,
    description,
    createdBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    message: 'Room created successfully',
    data: { room }
  });
});

/**
 * Update room
 * @route PUT /api/rooms/:id
 * @access Private (Admin)
 */
exports.updateRoom = catchAsync(async (req, res, next) => {
  const { roomNumber, name, type, capacity, amenities, images, petTypes, isAvailable, isActive, description } = req.body;

  const room = await Room.findByIdAndUpdate(
    req.params.id,
    {
      roomNumber,
      name,
      type,
      capacity,
      amenities,
      images,
      petTypes,
      isAvailable,
      isActive,
      description,
      updatedBy: req.user.id
    },
    { new: true, runValidators: true }
  );

  if (!room) {
    return next(new AppError('Room not found', 404, 'ROOM_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Room updated successfully',
    data: { room }
  });
});

/**
 * Delete room (soft delete)
 * @route DELETE /api/rooms/:id
 * @access Private (Admin)
 */
exports.deleteRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { isActive: false, updatedBy: req.user.id },
    { new: true }
  );

  if (!room) {
    return next(new AppError('Room not found', 404, 'ROOM_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Room deleted successfully',
    data: null
  });
});
