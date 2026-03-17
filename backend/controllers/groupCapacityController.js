/**
 * Group Capacity Config Controller
 * Admin management of service group capacity limits (wet/dry)
 */

const GroupCapacityConfig = require('../models/GroupCapacityConfig');
const { catchAsync } = require('../utils/catchAsync');
const { AppError } = require('../utils/AppError');

/**
 * Get all group capacity configurations
 * @route GET /api/admin/group-capacity
 * @access Private (Admin)
 */
exports.getAllGroupCapacities = catchAsync(async (req, res, next) => {
  const configs = await GroupCapacityConfig.find()
    .populate('createdBy updatedBy', 'name email')
    .sort('group');

  res.status(200).json({
    status: 'success',
    results: configs.length,
    data: { configs }
  });
});

/**
 * Get group capacity by group type
 * @route GET /api/admin/group-capacity/:group
 * @access Private (Admin, Staff - for reading)
 */
exports.getGroupCapacity = catchAsync(async (req, res, next) => {
  const { group } = req.params;

  if (!['wet', 'dry'].includes(group)) {
    return next(new AppError('Group must be either "wet" or "dry"', 400, 'INVALID_GROUP'));
  }

  const config = await GroupCapacityConfig.findOne({ group })
    .populate('createdBy updatedBy', 'name email');

  if (!config) {
    return next(new AppError(`Group capacity config for "${group}" not found`, 404, 'CONFIG_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    data: { config }
  });
});

/**
 * Create group capacity configuration
 * @route POST /api/admin/group-capacity
 * @access Private (Admin)
 */
exports.createGroupCapacity = catchAsync(async (req, res, next) => {
  const { group, maxCapacity, roomCount, slotsPerRoom, description } = req.body;

  if (!group || !['wet', 'dry'].includes(group)) {
    return next(new AppError('Group must be either "wet" or "dry"', 400, 'INVALID_GROUP'));
  }

  // Check if already exists
  const existing = await GroupCapacityConfig.findOne({ group });
  if (existing) {
    return next(new AppError(`Group capacity config for "${group}" already exists`, 409, 'CONFIG_EXISTS'));
  }

  const config = await GroupCapacityConfig.create({
    group,
    maxCapacity: maxCapacity || 6,
    roomCount: roomCount || 2,
    slotsPerRoom: slotsPerRoom || 3,
    description,
    createdBy: req.user.id
  });

  await config.populate('createdBy', 'name email');

  res.status(201).json({
    status: 'success',
    message: 'Group capacity config created successfully',
    data: { config }
  });
});

/**
 * Update group capacity configuration
 * @route PUT /api/admin/group-capacity/:group
 * @access Private (Admin)
 */
exports.updateGroupCapacity = catchAsync(async (req, res, next) => {
  const { group } = req.params;
  const { maxCapacity, roomCount, slotsPerRoom, description, isActive } = req.body;

  if (!['wet', 'dry'].includes(group)) {
    return next(new AppError('Group must be either "wet" or "dry"', 400, 'INVALID_GROUP'));
  }

  const config = await GroupCapacityConfig.findOne({ group });
  if (!config) {
    return next(new AppError(`Group capacity config for "${group}" not found`, 404, 'CONFIG_NOT_FOUND'));
  }

  // Update fields
  if (maxCapacity !== undefined) {
    if (!Number.isFinite(maxCapacity) || maxCapacity < 1 || maxCapacity > 20) {
      return next(new AppError('Max capacity must be a number between 1 and 20', 400, 'INVALID_CAPACITY'));
    }
    config.maxCapacity = maxCapacity;
  }

  if (roomCount !== undefined) {
    if (!Number.isFinite(roomCount) || roomCount < 1) {
      return next(new AppError('Room count must be a positive number', 400, 'INVALID_ROOM_COUNT'));
    }
    config.roomCount = roomCount;
  }

  if (slotsPerRoom !== undefined) {
    if (!Number.isFinite(slotsPerRoom) || slotsPerRoom < 1) {
      return next(new AppError('Slots per room must be a positive number', 400, 'INVALID_SLOTS'));
    }
    config.slotsPerRoom = slotsPerRoom;
  }

  if (description !== undefined) {
    config.description = description;
  }

  if (isActive !== undefined) {
    config.isActive = Boolean(isActive);
  }

  config.updatedBy = req.user.id;
  await config.save();
  await config.populate('createdBy updatedBy', 'name email');

  res.status(200).json({
    status: 'success',
    message: 'Group capacity config updated successfully',
    data: { config }
  });
});

/**
 * Delete group capacity configuration (soft delete)
 * @route DELETE /api/admin/group-capacity/:group
 * @access Private (Admin)
 */
exports.deleteGroupCapacity = catchAsync(async (req, res, next) => {
  const { group } = req.params;

  if (!['wet', 'dry'].includes(group)) {
    return next(new AppError('Group must be either "wet" or "dry"', 400, 'INVALID_GROUP'));
  }

  const config = await GroupCapacityConfig.findOneAndUpdate(
    { group },
    { isActive: false, updatedBy: req.user.id },
    { new: true }
  ).populate('createdBy updatedBy', 'name email');

  if (!config) {
    return next(new AppError(`Group capacity config for "${group}" not found`, 404, 'CONFIG_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Group capacity config deleted successfully',
    data: null
  });
});

/**
 * Initialize default group capacity configurations
 * @route POST /api/admin/group-capacity/init
 * @access Private (Admin)
 * @internal Use this endpoint to setup default wet/dry configs
 */
exports.initializeDefaultConfigs = catchAsync(async (req, res, next) => {
  const groups = ['wet', 'dry'];
  const created = [];

  for (const group of groups) {
    const existing = await GroupCapacityConfig.findOne({ group });
    if (!existing) {
      const config = await GroupCapacityConfig.create({
        group,
        maxCapacity: 6,
        roomCount: 2,
        slotsPerRoom: 3,
        description: `Default capacity config for ${group} services`,
        createdBy: req.user.id
      });
      created.push(config);
    }
  }

  res.status(200).json({
    status: 'success',
    message: `Initialized ${created.length} default group capacity configs`,
    data: { created }
  });
});
