require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

const { connectDB } = require('../config/database');
const Room = require('../models/Room');
const User = require('../models/User');
const GroupCapacityConfig = require('../models/GroupCapacityConfig');
const {
  SLOTS_PER_ROOM,
  deriveRoomCount,
  syncServiceRoomsForGroup,
} = require('../services/serviceGroupRoomSync.service');

const OLD_INACTIVE_SERVICE_ROOM_NUMBERS = ['102', '103', '104', '105'];

const TARGET_BOARDING_ROOMS = [
  {
    roomNumber: 'BR-101',
    name: 'Cozy Standard Room',
    type: 'standard',
    serviceType: 'boarding',
    capacity: 2,
    pricePerNight: 10,
    isAvailable: true,
    isActive: true,
    petTypes: ['dog', 'cat'],
    amenities: ['Comfort bed', 'Air conditioning', '24/7 monitoring'],
    description: 'Standard boarding room for small to medium pets.',
  },
  {
    roomNumber: 'BR-201',
    name: 'VIP Penthouse',
    type: 'vip',
    serviceType: 'boarding',
    capacity: 1,
    pricePerNight: 25,
    isAvailable: true,
    isActive: true,
    petTypes: ['dog', 'cat'],
    amenities: ['Premium bed', 'Private space', 'Camera monitoring'],
    description: 'Luxury boarding room with premium amenities.',
  },
  {
    roomNumber: 'BR-103',
    name: 'Family Comfort Room',
    type: 'standard',
    serviceType: 'boarding',
    capacity: 3,
    pricePerNight: 15,
    isAvailable: true,
    isActive: true,
    petTypes: ['dog', 'cat'],
    amenities: ['Play corner', 'Soft bedding', 'Ventilation system'],
    description: 'Room designed for pets that enjoy extra movement space.',
  },
  {
    roomNumber: 'BR-204',
    name: 'Sky View Suite',
    type: 'vip',
    serviceType: 'boarding',
    capacity: 2,
    pricePerNight: 30,
    isAvailable: true,
    isActive: true,
    petTypes: ['dog', 'cat'],
    amenities: ['Large glass window', 'Premium bedding', 'Camera monitoring'],
    description: 'Premium suite for pets requiring luxury stay experience.',
  },
  {
    roomNumber: 'BR-105',
    name: 'PlayCare Loft',
    type: 'standard',
    serviceType: 'boarding',
    capacity: 3,
    pricePerNight: 18,
    isAvailable: true,
    isActive: true,
    petTypes: ['dog', 'cat'],
    amenities: ['Activity area', 'Comfort bedding', 'Daily cleaning'],
    description: 'Boarding room focused on comfort and daily enrichment.',
  },
];

const LEGACY_UNDEFINED_FILTER = {
  isActive: false,
  $or: [
    { serviceType: { $exists: false } },
    { serviceType: null },
    { serviceType: '' },
  ],
};

const run = async () => {
  await connectDB();

  const admin = await User.findOne({ role: 'admin', isActive: true }).select('_id').lean();
  const actorId = admin?._id || null;

  const beforeCounts = {
    totalRooms: await Room.countDocuments({}),
    activeBoarding: await Room.countDocuments({ serviceType: 'boarding', isActive: true }),
    activeService: await Room.countDocuments({ serviceType: 'service', isActive: true }),
    inactiveUndefined: await Room.countDocuments(LEGACY_UNDEFINED_FILTER),
  };

  const deletedLegacy = await Room.deleteMany(LEGACY_UNDEFINED_FILTER);

  const deletedOldInactiveServiceRooms = await Room.deleteMany({
    serviceType: 'service',
    isActive: false,
    roomNumber: { $in: OLD_INACTIVE_SERVICE_ROOM_NUMBERS },
  });

  const groupConfigs = await GroupCapacityConfig.find({ group: { $in: ['wet', 'dry'] } }).lean();
  const configMap = groupConfigs.reduce((acc, cfg) => {
    acc[cfg.group] = cfg;
    return acc;
  }, {});

  const syncSummaries = [];
  for (const group of ['wet', 'dry']) {
    let cfg = configMap[group];
    let normalizedSlotsPerRoom = SLOTS_PER_ROOM;

    if (!cfg) {
      const maxCapacity = 3;
      const createdConfig = await GroupCapacityConfig.create({
        group,
        maxCapacity,
        roomCount: deriveRoomCount(maxCapacity, SLOTS_PER_ROOM),
        slotsPerRoom: SLOTS_PER_ROOM,
        description: `Auto-created ${group} group config during room cleanup`,
        createdBy: actorId,
        updatedBy: actorId,
      });
      cfg = createdConfig.toObject();
      normalizedSlotsPerRoom = SLOTS_PER_ROOM;
    } else {
      normalizedSlotsPerRoom = Math.max(1, Number(cfg.slotsPerRoom) || SLOTS_PER_ROOM);
      const normalizedRoomCount = deriveRoomCount(cfg.maxCapacity, normalizedSlotsPerRoom);
      const needsUpdate = cfg.slotsPerRoom !== normalizedSlotsPerRoom
        || cfg.roomCount !== normalizedRoomCount;
      if (needsUpdate) {
        await GroupCapacityConfig.updateOne(
          { _id: cfg._id },
          {
            $set: {
              slotsPerRoom: normalizedSlotsPerRoom,
              roomCount: normalizedRoomCount,
              ...(actorId ? { updatedBy: actorId } : {}),
            },
          }
        );
        cfg.slotsPerRoom = normalizedSlotsPerRoom;
        cfg.roomCount = normalizedRoomCount;
      }
    }

    syncSummaries.push(
      await syncServiceRoomsForGroup({
        group,
        maxCapacity: cfg.maxCapacity,
        slotsPerRoom: normalizedSlotsPerRoom,
        actorId,
        isActive: cfg.isActive !== false,
      })
    );
  }

  let createdBoardingRooms = 0;
  let updatedBoardingRooms = 0;

  for (const roomDef of TARGET_BOARDING_ROOMS) {
    const existing = await Room.findOne({ roomNumber: roomDef.roomNumber });

    if (!existing) {
      await Room.create({
        ...roomDef,
        createdBy: actorId,
        updatedBy: actorId,
      });
      createdBoardingRooms += 1;
      continue;
    }

    existing.name = roomDef.name;
    existing.type = roomDef.type;
    existing.serviceType = 'boarding';
    existing.group = undefined;
    existing.capacity = roomDef.capacity;
    existing.pricePerNight = roomDef.pricePerNight;
    existing.isAvailable = true;
    existing.isActive = true;
    existing.petTypes = roomDef.petTypes;
    existing.amenities = roomDef.amenities;
    existing.description = roomDef.description;
    if (actorId) {
      if (!existing.createdBy) existing.createdBy = actorId;
      existing.updatedBy = actorId;
    }

    await existing.save();
    updatedBoardingRooms += 1;
  }

  const targetBoardingNumbers = TARGET_BOARDING_ROOMS.map((room) => room.roomNumber);
  const deactivatedExtraBoardingRooms = await Room.updateMany(
    {
      serviceType: 'boarding',
      isActive: true,
      roomNumber: { $nin: targetBoardingNumbers },
    },
    {
      $set: {
        isActive: false,
        ...(actorId ? { updatedBy: actorId } : {}),
      },
    }
  );

  const afterCounts = {
    totalRooms: await Room.countDocuments({}),
    activeBoarding: await Room.countDocuments({ serviceType: 'boarding', isActive: true }),
    activeService: await Room.countDocuments({ serviceType: 'service', isActive: true }),
    inactiveUndefined: await Room.countDocuments(LEGACY_UNDEFINED_FILTER),
  };

  const activeBoardingRooms = await Room.find({ serviceType: 'boarding', isActive: true })
    .select('roomNumber name type capacity')
    .sort({ roomNumber: 1 })
    .lean();

  const activeServiceRooms = await Room.find({ serviceType: 'service', isActive: true })
    .select('roomNumber name group type capacity')
    .sort({ roomNumber: 1 })
    .lean();

  console.log('=== ROOM CLEANUP SUMMARY ===');
  console.log('Before:', beforeCounts);
  console.log('Deleted legacy inactive undefined rooms:', deletedLegacy.deletedCount);
  console.log('Deleted old inactive service rooms (102/103/104/105):', deletedOldInactiveServiceRooms.deletedCount);
  console.log('Group sync summaries:', syncSummaries);
  console.log('Created boarding rooms:', createdBoardingRooms);
  console.log('Updated boarding rooms:', updatedBoardingRooms);
  console.log('Deactivated extra active boarding rooms:', deactivatedExtraBoardingRooms.modifiedCount);
  console.log('After:', afterCounts);

  console.log('\nActive boarding rooms:');
  activeBoardingRooms.forEach((room, idx) => {
    console.log(`${idx + 1}. ${room.roomNumber} | ${room.name} | type=${room.type} | capacity=${room.capacity}`);
  });

  console.log('\nActive spa service rooms (wet/dry):');
  activeServiceRooms.forEach((room, idx) => {
    console.log(`${idx + 1}. ${room.roomNumber} | ${room.name} | group=${room.group} | type=${room.type} | capacity=${room.capacity}`);
  });

  await mongoose.connection.close();
};

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Room cleanup failed:', error);
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore close errors
    }
    process.exit(1);
  });
