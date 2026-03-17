/**
 * Room Controller
 * Handles room management operations
 */

const Room = require('../models/Room');
const { catchAsync } = require('../utils/catchAsync');
const { AppError, createError } = require('../utils/AppError');

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
 * @body {string} serviceType - 'service' or 'boarding' (required)
 * @body {string} group - 'wet' or 'dry' (optional, for service type rooms)
 */
exports.createRoom = catchAsync(async (req, res, next) => {
  const { roomNumber, name, type, serviceType, group, capacity, pricePerNight, amenities, images, petTypes, description } = req.body;

  // Validation
  if (!roomNumber || !name || capacity === undefined || capacity === null || pricePerNight === undefined || pricePerNight === null) {
    return next(createError.validation('Room number, room name, capacity and pricePerNight are required'));
  }
  
  if (!serviceType || !['service', 'boarding'].includes(serviceType)) {
    return next(createError.validation('Service type must be either "service" or "boarding"'));
  }
  
  // Service rooms must declare wet/dry group; boarding rooms do not use group.
  const normalizedGroup = group === undefined || group === null ? '' : String(group).trim().toLowerCase();
  if (serviceType === 'service' && !normalizedGroup) {
    return next(createError.validation('For service rooms, group is required ("wet" or "dry")'));
  }
  if (serviceType === 'service' && normalizedGroup && !['wet', 'dry'].includes(normalizedGroup)) {
    return next(createError.validation('For service rooms, group must be "wet" or "dry"'));
  }

  const normalizedType = typeof type === 'string' ? type.toLowerCase() : 'standard';
  const normalizedPetTypes = Array.isArray(petTypes)
    ? petTypes.map((p) => String(p).toLowerCase())
    : ['dog', 'cat'];
  const normalizedAmenities = Array.isArray(amenities) ? amenities : [];
  const normalizedImages = Array.isArray(images) ? images : [];
  const normalizedCapacity = Number(capacity);
  const normalizedPricePerNight = Number(pricePerNight);

  if (!Number.isFinite(normalizedCapacity) || normalizedCapacity < 1) {
    return next(createError.validation('Capacity must be a number greater than or equal to 1'));
  }

  if (!Number.isFinite(normalizedPricePerNight) || normalizedPricePerNight < 0) {
    return next(createError.validation('Price per night must be a number greater than or equal to 0'));
  }

  const existingRoom = await Room.findOne({ roomNumber: String(roomNumber).trim() });
  if (existingRoom) {
    return next(createError.conflict(`Room number '${roomNumber}' already exists`, 'ROOM_NUMBER_EXISTS'));
  }

  const room = await Room.create({
    roomNumber: String(roomNumber).trim(),
    name: String(name).trim(),
    type: normalizedType,
    serviceType,
    group: serviceType === 'service' ? normalizedGroup : undefined,
    capacity: normalizedCapacity,
    pricePerNight: normalizedPricePerNight,
    amenities: normalizedAmenities,
    images: normalizedImages,
    petTypes: normalizedPetTypes,
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
 * @body {string} serviceType - 'service' or 'boarding' (optional)
 * @body {string} group - 'wet' or 'dry' (optional, for service type rooms)
 */
exports.updateRoom = catchAsync(async (req, res, next) => {
  const { roomNumber, name, type, serviceType, group, capacity, pricePerNight, amenities, images, petTypes, isAvailable, isActive, description } = req.body;

  const currentRoom = await Room.findById(req.params.id);
  if (!currentRoom) {
    return next(new AppError('Room not found', 404, 'ROOM_NOT_FOUND'));
  }

  const updates = {
    updatedBy: req.user.id
  };

  if (roomNumber !== undefined) updates.roomNumber = String(roomNumber).trim();
  if (name !== undefined) updates.name = String(name).trim();
  if (type !== undefined) updates.type = String(type).toLowerCase();
  
  // Update serviceType and group with validation
  if (serviceType !== undefined) {
    if (!['service', 'boarding'].includes(serviceType)) {
      return next(createError.validation('Service type must be either "service" or "boarding"'));
    }
    updates.serviceType = serviceType;

    // Boarding rooms should not keep wet/dry group metadata.
    if (serviceType === 'boarding') {
      updates.group = undefined;
    }
  }

  const targetServiceType = serviceType !== undefined ? serviceType : currentRoom.serviceType;

  if (group !== undefined) {
    const normalizedGroup = String(group).trim().toLowerCase();

    if (!normalizedGroup) {
      if (targetServiceType === 'service') {
        return next(createError.validation('Group is required for service rooms ("wet" or "dry")'));
      }
      updates.group = undefined;
    } else if (!['wet', 'dry'].includes(normalizedGroup)) {
      return next(createError.validation('Group must be either "wet" or "dry"'));
    } else if (targetServiceType !== 'service') {
      return next(createError.validation('Group can only be set for service rooms'));
    } else {
      updates.group = normalizedGroup;
    }
  } else if (serviceType === 'service' && !currentRoom.group) {
    return next(createError.validation('Group is required when switching to service rooms'));
  }
  
  if (capacity !== undefined) {
    const normalizedCapacity = Number(capacity);
    if (!Number.isFinite(normalizedCapacity) || normalizedCapacity < 1) {
      return next(createError.validation('Capacity must be a number greater than or equal to 1'));
    }
    updates.capacity = normalizedCapacity;
  }
  if (pricePerNight !== undefined) {
    const normalizedPricePerNight = Number(pricePerNight);
    if (!Number.isFinite(normalizedPricePerNight) || normalizedPricePerNight < 0) {
      return next(createError.validation('Price per night must be a number greater than or equal to 0'));
    }
    updates.pricePerNight = normalizedPricePerNight;
  }
  if (amenities !== undefined) updates.amenities = Array.isArray(amenities) ? amenities : [];
  if (images !== undefined) updates.images = Array.isArray(images) ? images : [];
  if (petTypes !== undefined) updates.petTypes = Array.isArray(petTypes) ? petTypes.map((p) => String(p).toLowerCase()) : [];
  if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (description !== undefined) updates.description = description;

  const room = await Room.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

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
