const Room = require('../models/Room');
const { AppError } = require('../utils/AppError');

const SLOTS_PER_ROOM = 3;

const getBaseRoomNumber = (group) => (group === 'wet' ? 200 : 100);

const buildTargetRoomNumbers = (group, roomCount) => {
  const base = getBaseRoomNumber(group);
  return Array.from({ length: roomCount }, (_, index) => String(base + index + 1));
};

const buildRoomName = (group, roomNumber) => {
  const groupName = group === 'wet' ? 'Wet' : 'Dry';
  return `${groupName} Care Room ${roomNumber}`;
};

const normalizeMaxCapacity = (value) => Math.max(1, Number(value) || 1);
const normalizeSlotsPerRoom = (value) => Math.max(1, Number(value) || SLOTS_PER_ROOM);

const deriveRoomCount = (maxCapacity, slotsPerRoom = SLOTS_PER_ROOM) => {
  const normalizedCapacity = normalizeMaxCapacity(maxCapacity);
  const normalizedSlotsPerRoom = normalizeSlotsPerRoom(slotsPerRoom);
  return Math.max(1, Math.ceil(normalizedCapacity / normalizedSlotsPerRoom));
};

const deactivateGroupRooms = async ({ group, actorId, slotsPerRoom = SLOTS_PER_ROOM }) => {
  const normalizedSlotsPerRoom = normalizeSlotsPerRoom(slotsPerRoom);
  const result = await Room.updateMany(
    { serviceType: 'service', group, isActive: true },
    {
      $set: {
        isActive: false,
        ...(actorId ? { updatedBy: actorId } : {}),
      },
    }
  );

  return {
    group,
    roomCount: 0,
    targetRoomNumbers: [],
    slotsPerRoom: normalizedSlotsPerRoom,
    created: 0,
    updated: 0,
    deactivated: result.modifiedCount,
  };
};

const syncServiceRoomsForGroup = async ({
  group,
  maxCapacity,
  slotsPerRoom = SLOTS_PER_ROOM,
  actorId,
  isActive = true,
}) => {
  if (!['wet', 'dry'].includes(group)) {
    throw new AppError('Group must be either "wet" or "dry"', 400, 'INVALID_GROUP');
  }

  const normalizedSlotsPerRoom = normalizeSlotsPerRoom(slotsPerRoom);

  if (!isActive) {
    return deactivateGroupRooms({ group, actorId, slotsPerRoom: normalizedSlotsPerRoom });
  }

  const normalizedCapacity = normalizeMaxCapacity(maxCapacity);
  const roomCount = deriveRoomCount(normalizedCapacity, normalizedSlotsPerRoom);
  const targetRoomNumbers = buildTargetRoomNumbers(group, roomCount);

  let created = 0;
  let updated = 0;

  for (const roomNumber of targetRoomNumbers) {
    const existing = await Room.findOne({ roomNumber });

    if (!existing) {
      await Room.create({
        roomNumber,
        name: buildRoomName(group, roomNumber),
        type: 'standard',
        serviceType: 'service',
        group,
        capacity: normalizedSlotsPerRoom,
        pricePerNight: 0,
        amenities: ['Service workflow room'],
        petTypes: ['dog', 'cat'],
        description: `${group === 'wet' ? 'Wet' : 'Dry'} service room auto-synced from group capacity config.`,
        isAvailable: true,
        isActive: true,
        createdBy: actorId,
        updatedBy: actorId,
      });
      created += 1;
      continue;
    }

    if (existing.serviceType === 'boarding' && existing.isActive) {
      throw new AppError(
        `Room ${roomNumber} is currently an active boarding room and cannot be reused for ${group} group.`,
        409,
        'ROOM_NUMBER_CONFLICT',
      );
    }

    existing.name = buildRoomName(group, roomNumber);
    existing.type = 'standard';
    existing.serviceType = 'service';
    existing.group = group;
    existing.capacity = normalizedSlotsPerRoom;
    existing.pricePerNight = 0;
    existing.isAvailable = true;
    existing.isActive = true;
    existing.petTypes = ['dog', 'cat'];
    if (!existing.description) {
      existing.description = `${group === 'wet' ? 'Wet' : 'Dry'} service room auto-synced from group capacity config.`;
    }
    if (actorId) {
      if (!existing.createdBy) existing.createdBy = actorId;
      existing.updatedBy = actorId;
    }

    await existing.save();
    updated += 1;
  }

  const deactivatedResult = await Room.updateMany(
    {
      serviceType: 'service',
      group,
      isActive: true,
      roomNumber: { $nin: targetRoomNumbers },
    },
    {
      $set: {
        isActive: false,
        ...(actorId ? { updatedBy: actorId } : {}),
      },
    }
  );

  return {
    group,
    roomCount,
    targetRoomNumbers,
    slotsPerRoom: normalizedSlotsPerRoom,
    created,
    updated,
    deactivated: deactivatedResult.modifiedCount,
  };
};

module.exports = {
  SLOTS_PER_ROOM,
  deriveRoomCount,
  syncServiceRoomsForGroup,
};