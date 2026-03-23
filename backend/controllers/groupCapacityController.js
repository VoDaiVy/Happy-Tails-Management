/**
 * Group Capacity Config Controller
 * Admin management of service group capacity limits (wet/dry)
 */

const GroupCapacityConfig = require('../models/GroupCapacityConfig');
const {
  SLOTS_PER_ROOM,
  deriveRoomCount,
  syncServiceRoomsForGroup,
} = require('../services/serviceGroupRoomSync.service');
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
  const { group, maxCapacity, slotsPerRoom, description } = req.body;

  if (!group || !['wet', 'dry'].includes(group)) {
    return next(new AppError('Group must be either "wet" or "dry"', 400, 'INVALID_GROUP'));
  }

  // Check if already exists
  const existing = await GroupCapacityConfig.findOne({ group });
  if (existing) {
    return next(new AppError(`Group capacity config for "${group}" already exists`, 409, 'CONFIG_EXISTS'));
  }

  if (maxCapacity !== undefined) {
    const parsedMaxCapacity = Number(maxCapacity);
    if (!Number.isFinite(parsedMaxCapacity) || parsedMaxCapacity < 1 || parsedMaxCapacity > 20) {
      return next(new AppError('Max capacity must be a number between 1 and 20', 400, 'INVALID_CAPACITY'));
    }
  }

  if (slotsPerRoom !== undefined) {
    const parsedSlotsPerRoom = Number(slotsPerRoom);
    if (!Number.isFinite(parsedSlotsPerRoom) || parsedSlotsPerRoom < 1 || parsedSlotsPerRoom > 20) {
      return next(new AppError('Slots per room must be a number between 1 and 20', 400, 'INVALID_SLOTS_PER_ROOM'));
    }
  }

  const normalizedMaxCapacity = Math.max(1, Number(maxCapacity) || 6);
  const normalizedSlotsPerRoom = Math.max(1, Number(slotsPerRoom) || SLOTS_PER_ROOM);
  const normalizedRoomCount = deriveRoomCount(normalizedMaxCapacity, normalizedSlotsPerRoom);

  const config = await GroupCapacityConfig.create({
    group,
    maxCapacity: normalizedMaxCapacity,
    roomCount: normalizedRoomCount,
    slotsPerRoom: normalizedSlotsPerRoom,
    description,
    createdBy: req.user.id
  });

  const syncSummary = await syncServiceRoomsForGroup({
    group,
    maxCapacity: normalizedMaxCapacity,
    slotsPerRoom: normalizedSlotsPerRoom,
    actorId: req.user.id,
    isActive: true,
  });

  await config.populate('createdBy', 'name email');

  res.status(201).json({
    status: 'success',
    message: 'Group capacity config created successfully',
    data: { config, roomSync: syncSummary }
  });
});

/**
 * Update group capacity configuration
 * @route PUT /api/admin/group-capacity/:group
 * @access Private (Admin)
 */
exports.updateGroupCapacity = catchAsync(async (req, res, next) => {
  const { group } = req.params;
  const { maxCapacity, slotsPerRoom, description, isActive } = req.body;

  if (!['wet', 'dry'].includes(group)) {
    return next(new AppError('Group must be either "wet" or "dry"', 400, 'INVALID_GROUP'));
  }

  const config = await GroupCapacityConfig.findOne({ group });
  if (!config) {
    return next(new AppError(`Group capacity config for "${group}" not found`, 404, 'CONFIG_NOT_FOUND'));
  }

  // Update fields
  if (maxCapacity !== undefined) {
    const parsedMaxCapacity = Number(maxCapacity);
    if (!Number.isFinite(parsedMaxCapacity) || parsedMaxCapacity < 1 || parsedMaxCapacity > 20) {
      return next(new AppError('Max capacity must be a number between 1 and 20', 400, 'INVALID_CAPACITY'));
    }
    config.maxCapacity = parsedMaxCapacity;
  }

  if (slotsPerRoom !== undefined) {
    const parsedSlotsPerRoom = Number(slotsPerRoom);
    if (!Number.isFinite(parsedSlotsPerRoom) || parsedSlotsPerRoom < 1 || parsedSlotsPerRoom > 20) {
      return next(new AppError('Slots per room must be a number between 1 and 20', 400, 'INVALID_SLOTS_PER_ROOM'));
    }
    config.slotsPerRoom = parsedSlotsPerRoom;
  }

  if (description !== undefined) {
    config.description = description;
  }

  if (isActive !== undefined) {
    config.isActive = Boolean(isActive);
  }

  config.roomCount = deriveRoomCount(config.maxCapacity, config.slotsPerRoom);

  config.updatedBy = req.user.id;
  await config.save();

  const syncSummary = await syncServiceRoomsForGroup({
    group,
    maxCapacity: config.maxCapacity,
    slotsPerRoom: config.slotsPerRoom,
    actorId: req.user.id,
    isActive: config.isActive,
  });

  await config.populate('createdBy updatedBy', 'name email');

  res.status(200).json({
    status: 'success',
    message: 'Group capacity config updated successfully',
    data: { config, roomSync: syncSummary }
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
  const syncResults = [];

  for (const group of groups) {
    const existing = await GroupCapacityConfig.findOne({ group });
    if (!existing) {
      const config = await GroupCapacityConfig.create({
        group,
        maxCapacity: 6,
        roomCount: deriveRoomCount(6, SLOTS_PER_ROOM),
        slotsPerRoom: SLOTS_PER_ROOM,
        description: `Default capacity config for ${group} services`,
        createdBy: req.user.id
      });
      created.push(config);
      syncResults.push(
        await syncServiceRoomsForGroup({
          group,
          maxCapacity: config.maxCapacity,
          slotsPerRoom: config.slotsPerRoom,
          actorId: req.user.id,
          isActive: true,
        })
      );
      continue;
    }

    existing.slotsPerRoom = Math.max(1, Number(existing.slotsPerRoom) || SLOTS_PER_ROOM);
    existing.roomCount = deriveRoomCount(existing.maxCapacity, existing.slotsPerRoom);
    existing.updatedBy = req.user.id;
    await existing.save();

    syncResults.push(
      await syncServiceRoomsForGroup({
        group,
        maxCapacity: existing.maxCapacity,
        slotsPerRoom: existing.slotsPerRoom,
        actorId: req.user.id,
        isActive: existing.isActive,
      })
    );
  }

  res.status(200).json({
    status: 'success',
    message: `Initialized ${created.length} default group capacity configs`,
    data: { created, roomSync: syncResults }
  });
});
