const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const Booking = require("../models/Booking");
const BookingSlotLock = require("../models/BookingSlotLock");
const Cart = require("../models/Cart");
const Service = require("../models/Service");
const UserPet = require("../models/UserPet");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Room = require("../models/Room");
const Transaction = require("../models/Transaction");
const Voucher = require("../models/Voucher");
const MedicalRecord = require("../models/MedicalRecord");
const GroupCapacityConfig = require("../models/GroupCapacityConfig");
const { catchAsync } = require("../utils/catchAsync");
const { AppError } = require("../utils/AppError");
const { sendAutoNotification } = require("../utils/notificationHelper");

const ACTIVE_STATUSES = ["pending", "confirmed", "in-progress"];
const ROOM_CONFIG = { dry: ["101", "102"], wet: ["201", "202"] };
const SLOTS_PER_ROOM = 3;
const GROUP_CAP = 6;
const SLOT_MS = 15 * 60 * 1000;
const LOCK_TTL_MS = 45 * 1000;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 23;
const WET_KEYWORDS = [
  "tam",
  "say",
  "massage",
  "tri lieu",
  "bath",
  "shower",
  "spa",
  "wet",
  "uot",
  "tắm",
  "sấy",
  "trị liệu",
  "ướt",
];

const normalizeText = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseAppointmentDate = ({ appointmentDate, bookingDate, bookingTime }) => {
  if (appointmentDate) {
    return new Date(appointmentDate);
  }
  if (!bookingDate || !bookingTime) {
    return null;
  }
  return new Date(`${bookingDate}T${bookingTime}:00`);
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isBeforeNow = (date) => new Date(date).getTime() < Date.now();

const isAlignedTo15Minutes = (date) =>
  date.getMinutes() % 15 === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;

const formatBookingTime = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const slotLabelToMinutes = (slot = "00:00") => {
  const [h, m] = String(slot).split(":").map(Number);
  return h * 60 + m;
};

const inferServiceGroup = (service) => {
  if (service.group === "wet" || service.group === "dry") {
    return service.group;
  }
  const source = normalizeText(service.category?.name || service.name || "");
  return WET_KEYWORDS.some((keyword) => source.includes(normalizeText(keyword))) ? "wet" : "dry";
};

const buildServiceMap = (services) =>
  new Map(
    services.map((svc) => [
      String(svc._id),
      {
        svc,
        group: inferServiceGroup(svc),
      },
    ]),
  );

const expandRequestedItems = (rawItems, serviceMap) => {
  const expanded = [];
  for (const item of rawItems) {
    const serviceId = String(item.serviceId);
    const found = serviceMap.get(serviceId);
    if (!found) continue;

    const quantity = Math.max(1, Number(item.quantity) || 1);
    for (let i = 0; i < quantity; i += 1) {
      expanded.push({
        serviceId,
        svc: found.svc,
        group: found.group,
        note: item.note,
      });
    }
  }
  return expanded;
};

const sortWetBeforeDry = (items) =>
  [...items].sort((a, b) => {
    if (a.group === b.group) return 0;
    return a.group === "wet" ? -1 : 1;
  });

const buildScheduledItems = (items, appointmentDate) => {
  let cursor = new Date(appointmentDate);
  return items.map((item) => {
    const startTime = new Date(cursor);
    const endTime = new Date(cursor.getTime() + item.svc.duration * 60 * 1000);
    cursor = endTime;
    return {
      ...item,
      startTime,
      endTime,
      assignedRoom: null,
    };
  });
};

const floorToSlot = (date) => new Date(Math.floor(date.getTime() / SLOT_MS) * SLOT_MS);

const buildSlotStarts = (startTime, endTime) => {
  const slots = [];
  let cursor = floorToSlot(startTime);
  while (cursor < endTime) {
    slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + SLOT_MS);
  }
  return slots;
};

const buildSlotKey = (group, slotStart) => `${group}:${slotStart.toISOString()}`;

const buildServiceSlotKey = (serviceId, slotStart) => `${serviceId}:${slotStart.toISOString()}`;

const buildLockTargets = (scheduledItems) => {
  const map = new Map();
  for (const item of scheduledItems) {
    const slots = buildSlotStarts(item.startTime, item.endTime);
    for (const slotStart of slots) {
      const key = item.serviceId
        ? buildServiceSlotKey(item.serviceId, slotStart)
        : buildSlotKey(item.group, slotStart);
      if (!map.has(key)) {
        map.set(key, { key, group: item.group, slotStart });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
};

const acquireSlotLocks = async (lockTargets, lockHolder) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

  for (const target of lockTargets) {
    await BookingSlotLock.deleteMany({ key: target.key, expiresAt: { $lte: now } });

    try {
      await BookingSlotLock.create({
        key: target.key,
        group: target.group,
        slotStart: target.slotStart,
        holder: lockHolder,
        expiresAt,
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError(
          "This time slot is being booked by another request. Please retry.",
          409,
          "SLOT_LOCKED",
        );
      }
      throw error;
    }
  }
};

const releaseSlotLocks = async (lockHolder) => {
  if (!lockHolder) return;
  await BookingSlotLock.deleteMany({ holder: lockHolder });
};

const countGroupOccupancyAtSlot = async (group, slotStart) => {
  const slotEnd = new Date(slotStart.getTime() + SLOT_MS);

  const result = await Booking.aggregate([
    { $match: { status: { $in: ACTIVE_STATUSES } } },
    { $unwind: "$items" },
    {
      $match: {
        "items.group": group,
        "items.startTime": { $lt: slotEnd },
        "items.endTime": { $gt: slotStart },
      },
    },
    { $count: "total" },
  ]);

  return result[0]?.total || 0;
};

const getDefaultGroupConfig = (group) => ({
  maxCapacity: GROUP_CAP,
  roomCount: ROOM_CONFIG[group]?.length || 2,
  slotsPerRoom: SLOTS_PER_ROOM,
});

const getActiveGroupConfig = async (group) => {
  const fallback = getDefaultGroupConfig(group);

  try {
    const config = await GroupCapacityConfig.findOne({ group, isActive: true })
      .select("maxCapacity roomCount slotsPerRoom")
      .lean();

    if (!config) return fallback;

    return {
      maxCapacity: Math.max(1, Number(config.maxCapacity) || fallback.maxCapacity),
      roomCount: Math.max(1, Number(config.roomCount) || fallback.roomCount),
      slotsPerRoom: Math.max(1, Number(config.slotsPerRoom) || fallback.slotsPerRoom),
    };
  } catch (_) {
    return fallback;
  }
};

const countServiceOccupancyAtSlot = async (serviceId, slotStart) => {
  const slotEnd = new Date(slotStart.getTime() + SLOT_MS);

  const result = await Booking.aggregate([
    { $match: { status: { $in: ACTIVE_STATUSES } } },
    { $unwind: '$items' },
    {
      $match: {
        'items.service': new mongoose.Types.ObjectId(serviceId),
        'items.startTime': { $lt: slotEnd },
        'items.endTime': { $gt: slotStart },
      },
    },
    { $count: 'total' },
  ]);

  return result[0]?.total || 0;
};

const validateServiceCapacityAndAssignRooms = async (scheduledItems) => {
  const occupancyCache = new Map();
  const requestAdds = new Map();

  const getBaseOccupancy = async (serviceId, slotStart) => {
    const key = buildServiceSlotKey(serviceId, slotStart);
    if (!occupancyCache.has(key)) {
      occupancyCache.set(key, await countServiceOccupancyAtSlot(serviceId, slotStart));
    }
    return occupancyCache.get(key);
  };

  for (const item of scheduledItems) {
    const slots = buildSlotStarts(item.startTime, item.endTime);
    const maxCapacity = Math.max(1, Number(item.svc.maxCapacity) || 1);
    const itemServiceId = String(item.svc._id);

    for (const slotStart of slots) {
      const key = buildServiceSlotKey(itemServiceId, slotStart);
      const base = await getBaseOccupancy(itemServiceId, slotStart);
      const inRequest = requestAdds.get(key) || 0;
      if (base + inRequest >= maxCapacity) {
        throw new AppError(
          `Khung giờ ${formatBookingTime(slotStart)} đã hết chỗ cho dịch vụ ${item.svc.name}`,
          409,
          'SERVICE_SLOT_FULL',
        );
      }
    }

    const roomPool = ROOM_CONFIG[item.group] || ROOM_CONFIG.dry;
    const firstSlot = slots[0];
    item.assignedRoom = roomPool[firstSlot.getMinutes() % roomPool.length];

    for (const slotStart of slots) {
      const key = buildServiceSlotKey(itemServiceId, slotStart);
      requestAdds.set(key, (requestAdds.get(key) || 0) + 1);
    }
  }
};

const getServiceDayDisabledSlots = async (service, date) => {
  const dayStart = startOfDay(date);
  const now = new Date();
  const slots = [];
  const serviceGroup = inferServiceGroup(service);
  const groupConfig = await getActiveGroupConfig(serviceGroup);

  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      const slotStart = new Date(dayStart);
      slotStart.setHours(h, m, 0, 0);

      if (isBeforeNow(slotStart)) {
        slots.push(formatBookingTime(slotStart));
        continue;
      }

      // Check group capacity (admin-configured max per wet/dry group per 15-min slot)
      const groupOccupied = await countGroupOccupancyAtSlot(serviceGroup, slotStart);
      if (groupOccupied >= groupConfig.maxCapacity) {
        slots.push(formatBookingTime(slotStart));
      }
    }
  }

  return slots;
};

const getPetDayConflictSlots = async ({ petId, date, serviceDurationMin }) => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const bookings = await Booking.find({
    status: { $in: ACTIVE_STATUSES },
    items: {
      $elemMatch: {
        pet: petId,
        startTime: { $lt: dayEnd },
        endTime: { $gt: dayStart },
      },
    },
  })
    .select("items")
    .lean();

  const overlapRanges = [];
  for (const booking of bookings) {
    for (const item of booking.items || []) {
      if (!item?.pet || String(item.pet) !== String(petId)) continue;
      if (!item.startTime || !item.endTime) continue;

      const start = new Date(item.startTime);
      const end = new Date(item.endTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      if (start >= dayEnd || end <= dayStart) continue;

      overlapRanges.push({ start, end });
    }
  }

  if (overlapRanges.length === 0) return [];

  const conflictSlots = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      const slotStart = new Date(dayStart);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + serviceDurationMin * 60 * 1000);

      const hasConflict = overlapRanges.some(
        ({ start, end }) => start < slotEnd && end > slotStart,
      );

      if (hasConflict) {
        conflictSlots.push(formatBookingTime(slotStart));
      }
    }
  }

  return conflictSlots;
};

const validateCapacityAndAssignRooms = async (scheduledItems) => {
  const occupancyCache = new Map();
  const requestAdds = new Map();
  const groupConfigCache = new Map();

  const getGroupConfig = async (group) => {
    if (!groupConfigCache.has(group)) {
      groupConfigCache.set(group, await getActiveGroupConfig(group));
    }
    return groupConfigCache.get(group);
  };

  const getBaseOccupancy = async (group, slotStart) => {
    const key = buildSlotKey(group, slotStart);
    if (!occupancyCache.has(key)) {
      occupancyCache.set(key, await countGroupOccupancyAtSlot(group, slotStart));
    }
    return occupancyCache.get(key);
  };

  for (const item of scheduledItems) {
    const slots = buildSlotStarts(item.startTime, item.endTime);
    const startSlot = slots[0];
    const groupConfig = await getGroupConfig(item.group);
    const roomPool = ROOM_CONFIG[item.group] || ROOM_CONFIG.dry;

    for (const slotStart of slots) {
      const key = buildSlotKey(item.group, slotStart);
      const base = await getBaseOccupancy(item.group, slotStart);
      const inRequest = requestAdds.get(key) || 0;

      if (base + inRequest >= groupConfig.maxCapacity) {
        throw new AppError(
          `Service group \"${item.group}\" is full (${groupConfig.maxCapacity}/${groupConfig.maxCapacity}) at ${slotStart.toISOString()}`,
          409,
          "GROUP_CAPACITY_FULL",
        );
      }
    }

    const startKey = buildSlotKey(item.group, startSlot);
    const startBase = await getBaseOccupancy(item.group, startSlot);
    const startRequestAdds = requestAdds.get(startKey) || 0;
    const position = startBase + startRequestAdds;
    const roomIndex = Math.min(roomPool.length - 1, Math.floor(position / groupConfig.slotsPerRoom));

    item.assignedRoom = roomPool[roomIndex];

    for (const slotStart of slots) {
      const key = buildSlotKey(item.group, slotStart);
      requestAdds.set(key, (requestAdds.get(key) || 0) + 1);
    }
  }
};

const MEDICAL_STAGE_ORDER = { received: 0, processing: 1, completed: 2 };

const normalizeMedicalPhotos = (photos = []) => {
  if (!Array.isArray(photos)) return [];

  return photos
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.url || item.path || "").trim();
      }
      return "";
    })
    .filter(Boolean);
};

const appendMedicalNote = (existingNotes, label, notes) => {
  const current = typeof existingNotes === "string" ? existingNotes.trim() : "";
  const incoming = String(notes || "").trim();
  if (!incoming) return current;

  const merged = `[${label}] ${incoming}`;
  return current ? `${current}\n${merged}` : merged;
};

const toObjectIdString = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object") {
    return (
      toObjectIdString(value._id) ||
      toObjectIdString(value.id) ||
      toObjectIdString(value.petId) ||
      toObjectIdString(value.userPet) ||
      null
    );
  }

  return null;
};

const extractBookingItemPetId = (item = {}) =>
  toObjectIdString(item.pet?._id || item.pet || item.petId || item.userPet || item.userPetId);

const getUniqueBookingPets = (booking) => {
  const petMap = new Map();

  for (const item of booking.items || []) {
    const petId = extractBookingItemPetId(item);
    if (!petId) continue;

    const key = String(petId);
    if (!petMap.has(key)) {
      petMap.set(key, { petId, serviceNames: new Set() });
    }

    const serviceName = typeof item.service?.name === "string" ? item.service.name.trim() : "";
    if (serviceName) {
      petMap.get(key).serviceNames.add(serviceName);
    }
  }

  const boardingPetId = toObjectIdString(booking?.boardingPet?._id || booking?.boardingPet);
  if (boardingPetId) {
    const key = String(boardingPetId);
    if (!petMap.has(key)) {
      petMap.set(key, { petId: boardingPetId, serviceNames: new Set() });
    }

    if (booking?.stayInfo?.enabled) {
      petMap.get(key).serviceNames.add("Boarding stay");
    }
  }

  return [...petMap.values()].map((entry) => ({
    petId: entry.petId,
    serviceNames: [...entry.serviceNames],
  }));
};

const ensureMedicalRecordForBookingPet = async ({ booking, petId, serviceNames, actorId }) => {
  const normalizedPetId = toObjectIdString(petId);
  const customerId = toObjectIdString(booking.customer?._id || booking.customer);

  if (!normalizedPetId || !customerId) {
    throw new AppError(
      "Cannot create medical record because booking pet/customer reference is invalid",
      400,
      "MEDICAL_RECORD_REFERENCE_INVALID",
    );
  }

  let record = await MedicalRecord.findOne({ booking: booking._id, userPet: normalizedPetId });
  if (record) return record;

  const serviceSummary = serviceNames.length > 0 ? serviceNames.join(", ") : "Service";

  record = await MedicalRecord.create({
    userPet: normalizedPetId,
    user: customerId,
    booking: booking._id,
    recordType: "grooming",
    condition: "Service check-in",
    diagnosis: "Pet admitted for booked service",
    treatment: `Services: ${serviceSummary}`,
    medications: [],
    workflowStage: "received",
    createdBy: actorId,
  });

  return record;
};

const applyMedicalStageUpdate = async ({ record, stage, notes, photos, actorId }) => {
  const stagePhotoField =
    stage === "completed"
      ? "completedPhotos"
      : stage === "processing"
        ? "processingPhotos"
        : "receivedPhotos";

  if (photos.length > 0) {
    record[stagePhotoField].push(...photos);
    record.images = [...(record.images || []), ...photos];
  }

  if (notes) {
    const label =
      stage === "completed"
        ? "Check-out"
        : stage === "processing"
          ? "Processing"
          : "Check-in";
    record.notes = appendMedicalNote(record.notes, label, notes);
  }

  const currentStageOrder = MEDICAL_STAGE_ORDER[record.workflowStage] ?? 0;
  const targetStageOrder = MEDICAL_STAGE_ORDER[stage] ?? 0;
  if (targetStageOrder > currentStageOrder) {
    record.workflowStage = stage;
  }

  record.stageHistory.push({
    stage,
    updatedBy: actorId,
    updatedAt: new Date(),
    notes: notes || "",
  });
  record.updatedBy = actorId;

  await record.save();
};

const buildGuestPetKey = ({ phone, petName, petType }) => {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  const normalizedPetName = normalizeText(petName || "").replace(/\s+/g, "-");
  const normalizedPetType = normalizeText(petType || "").replace(/\s+/g, "-");
  return `${normalizedPhone}:${normalizedPetName}:${normalizedPetType}`;
};

/**
 * Create booking from cart (legacy route disabled)
 * @route POST /api/bookings
 * @access Private (Customer)
 */
exports.createBooking = catchAsync(async (req, res, next) => {
  return next(
    new AppError(
      "Legacy booking route is disabled. Use POST /api/bookings/checkout for enforced scheduling rules.",
      410,
      "LEGACY_ROUTE_DISABLED",
    ),
  );
});

/**
 * Create guest booking (no account required)
 * @route POST /api/bookings/guest
 * @access Private (Staff)
 */
exports.createGuestBooking = catchAsync(async (req, res, next) => {
  const {
    guestInfo,
    items,
    appointmentDate,
    bookingDate,
    bookingTime,
    petInfo,
    guestPet,
    notes,
    paymentMethod = "cash",
  } = req.body;

  if (!guestInfo || !guestInfo.name || !guestInfo.email || !guestInfo.phone) {
    return next(
      new AppError("Guest info is required", 400, "GUEST_INFO_REQUIRED"),
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return next(new AppError("At least one service is required", 400, "NO_ITEMS"));
  }

  const appointment = parseAppointmentDate({ appointmentDate, bookingDate, bookingTime });
  if (!appointment || Number.isNaN(appointment.getTime())) {
    return next(new AppError("Invalid appointment date/time", 400, "INVALID_DATE"));
  }
  if (!isAlignedTo15Minutes(appointment)) {
    return next(
      new AppError(
        "Booking time must align to 15-minute slots (09:00, 09:15, 09:30, 09:45...)",
        400,
        "INVALID_TIME_SLOT",
      ),
    );
  }

  const guestPetInfo =
    petInfo ||
    guestPet ||
    items.find((item) => item.petInfo || item.guestPet)?.petInfo ||
    items.find((item) => item.petInfo || item.guestPet)?.guestPet;

  if (!guestPetInfo?.petName || !guestPetInfo?.petType) {
    return next(
      new AppError("Guest pet info (petName, petType) is required", 400, "GUEST_PET_REQUIRED"),
    );
  }

  const rawItems = items.map((item) => ({
    serviceId: item.service || item.serviceId,
    quantity: Math.max(1, Number(item.quantity) || 1),
    note: item.note,
  }));

  const serviceIds = [...new Set(rawItems.map((item) => String(item.serviceId)))];
  const services = await Service.find({ _id: { $in: serviceIds } }).populate("category");
  if (services.length !== serviceIds.length) {
    return next(new AppError("One or more services are no longer available", 404, "SERVICE_NOT_FOUND"));
  }

  const serviceMap = buildServiceMap(services);
  const expandedItems = expandRequestedItems(rawItems, serviceMap);
  if (expandedItems.length === 0) {
    return next(new AppError("No valid services to schedule", 400, "NO_VALID_ITEMS"));
  }

  const sortedItems = sortWetBeforeDry(expandedItems);
  const scheduledItems = buildScheduledItems(sortedItems, appointment);

  const lockHolder = `guest:${req.user.id}:${randomUUID()}`;
  const lockTargets = buildLockTargets(scheduledItems);

  try {
    await acquireSlotLocks(lockTargets, lockHolder);
    await validateCapacityAndAssignRooms(scheduledItems);

    const petKey = buildGuestPetKey({
      phone: guestInfo.phone,
      petName: guestPetInfo.petName,
      petType: guestPetInfo.petType,
    });

    const overallStart = scheduledItems[0].startTime;
    const overallEnd = scheduledItems[scheduledItems.length - 1].endTime;
    const guestPetConflict = await Booking.findOne({
      status: { $nin: ["cancelled", "completed"] },
      items: {
        $elemMatch: {
          "guestPet.petKey": petKey,
          startTime: { $lt: overallEnd },
          endTime: { $gt: overallStart },
        },
      },
    }).lean();

    if (guestPetConflict) {
      return next(
        new AppError(
          "This guest pet already has an overlapping appointment.",
          409,
          "PET_SCHEDULE_CONFLICT",
        ),
      );
    }

    const totalAmount = scheduledItems.reduce((sum, item) => sum + item.svc.price, 0);

    const bookingItems = scheduledItems.map((item) => ({
      service: item.svc._id,
      quantity: 1,
      price: item.svc.price,
      notes: item.note,
      group: item.group,
      startTime: item.startTime,
      endTime: item.endTime,
      assignedRoom: item.assignedRoom,
      guestPet: {
        petName: guestPetInfo.petName,
        petType: guestPetInfo.petType,
        petKey,
      },
    }));

    const booking = await Booking.create({
      guestInfo,
      items: bookingItems,
      bookingDate: appointment,
      bookingTime: formatBookingTime(appointment),
      totalAmount,
      paymentMethod,
      notes,
      assignedStaff: req.user.id,
      status: "pending",
    });

    await booking.populate("items.service assignedStaff");

    res.status(201).json({
      status: "success",
      message: "Guest booking created successfully",
      data: {
        booking,
        schedule: scheduledItems.map((item) => ({
          service: item.svc.name,
          group: item.group,
          room: item.assignedRoom,
          startTime: item.startTime.toISOString(),
          endTime: item.endTime.toISOString(),
          durationMins: item.svc.duration,
        })),
      },
    });
  } finally {
    try {
      await releaseSlotLocks(lockHolder);
    } catch (_) {
      // Intentionally ignore lock-release failures to preserve primary error flow.
    }
  }
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
    .populate([
      { path: "items.service", select: "name price duration" },
      { path: "items.pet", select: "petName petType breed" },
      { path: "assignedStaff", select: "name email" },
      { path: "boardingPet", select: "petName petType breed" },
    ])
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

/**
 * Get all bookings
 * @route GET /api/bookings
 * @access Private (Staff, Admin)
 * @note Admin can only view confirmed, in-progress, completed, cancelled.
 *       Staff can see all statuses.
 */
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const { status, date, customer } = req.query;

  const filter = {};

  if (req.user.role === "admin") {
    const adminVisibleStatuses = ["confirmed", "in-progress", "completed", "cancelled"];
    filter.status = { $in: adminVisibleStatuses };
    if (status && adminVisibleStatuses.includes(status)) {
      filter.status = status;
    }
  } else if (status) {
    filter.status = status;
  }

  if (date)
    filter.bookingDate = {
      $gte: new Date(date),
      $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
    };

  if (customer) filter.customer = customer;

  const bookings = await Booking.find(filter)
    .populate([
      { path: "customer", select: "name email" },
      { path: "items.service", select: "name price duration" },
      { path: "items.pet", select: "petName petType breed" },
      { path: "assignedStaff", select: "name email" },
      { path: "room", select: "roomNumber name serviceType group" },
      { path: "stayInfo.room", select: "roomNumber name serviceType group" },
      { path: "boardingPet", select: "petName petType breed" },
    ])
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Private (Customer - own, Staff, Admin)
 */

exports.getBookingById = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)

    .populate(
      "customer items.service items.pet assignedStaff room cancelledBy boardingPet",
    );

  if (!booking) {
    return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
  }

  // Check permission: customer can only see their own bookings
  if (
    req.user.role === "customer" &&
    booking.customer.toString() !== req.user.id
  ) {
    return next(
      new AppError(
        "You do not have permission to view this booking",
        403,
        "FORBIDDEN",
      ),
    );
  }

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});

/**
 * Update booking status
 * @route PUT /api/bookings/:id/status
 * @access Private (Staff, Admin)
 */
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  if (req.user.role !== "staff") {
    return next(new AppError("Only staff can update booking status", 403, "FORBIDDEN"));
  }

  const { status, medicalRecord } = req.body;
  const medicalNotes = String(medicalRecord?.notes || "").trim();
  const medicalPhotos = normalizeMedicalPhotos(medicalRecord?.photos || []);

  // Keep raw pet references from booking items; only populate service names for record summaries.
  const booking = await Booking.findById(req.params.id).populate("items.service");
  if (!booking) {
    return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
  }

  const oldStatus = booking.status;
  booking.status = status;

  const usesItemLevelSpaRooms = booking.items?.some((item) => item.assignedRoom);
  const bookingPets = getUniqueBookingPets(booking);
  const hasTrackablePets = bookingPets.length > 0;
  const hasGuestPetItems = (booking.items || []).some((item) => item?.guestPet?.petName);

  if (
    (status === "in-progress" || status === "completed") &&
    !hasTrackablePets &&
    !hasGuestPetItems
  ) {
    return next(
      new AppError(
        "Cannot update this booking step: missing pet reference for medical-record synchronization",
        400,
        "BOOKING_PET_REFERENCE_MISSING",
      ),
    );
  }

  // Require check-in notes/photos and sync them to medical records.
  if (status === 'in-progress' && oldStatus !== 'in-progress') {
    if (hasTrackablePets) {
      if (!medicalNotes) {
        return next(new AppError("Check-in note is required", 400, "CHECKIN_NOTE_REQUIRED"));
      }
      if (medicalPhotos.length === 0) {
        return next(new AppError("At least one check-in photo is required", 400, "CHECKIN_PHOTOS_REQUIRED"));
      }

      for (const petEntry of bookingPets) {
        const record = await ensureMedicalRecordForBookingPet({
          booking,
          petId: petEntry.petId,
          serviceNames: petEntry.serviceNames,
          actorId: req.user.id,
        });

        await applyMedicalStageUpdate({
          record,
          stage: "received",
          notes: medicalNotes,
          photos: medicalPhotos,
          actorId: req.user.id,
        });
      }
    }
  }

  // Require check-out notes/photos and mark medical records as completed.
  if (status === 'completed' && oldStatus !== 'completed') {
    if (hasTrackablePets) {
      if (!medicalNotes) {
        return next(new AppError("Check-out note is required", 400, "CHECKOUT_NOTE_REQUIRED"));
      }
      if (medicalPhotos.length === 0) {
        return next(new AppError("At least one check-out photo is required", 400, "CHECKOUT_PHOTOS_REQUIRED"));
      }

      for (const petEntry of bookingPets) {
        const record = await ensureMedicalRecordForBookingPet({
          booking,
          petId: petEntry.petId,
          serviceNames: petEntry.serviceNames,
          actorId: req.user.id,
        });

        await applyMedicalStageUpdate({
          record,
          stage: "completed",
          notes: medicalNotes,
          photos: medicalPhotos,
          actorId: req.user.id,
        });
      }
    }
  }

  // Auto-assign room when staff confirms booking
  if (!usesItemLevelSpaRooms && status === "confirmed" && oldStatus === "pending" && !booking.room) {
    // Get pet types from booking pet references.
    const petIds = bookingPets.map((entry) => entry.petId).filter(Boolean);
    const petTypes = petIds.length > 0
      ? await UserPet.find({ _id: { $in: petIds } }).distinct("petType")
      : [];
    
    if (petTypes.length > 0) {
      // Find available room that supports the pet type(s)
      const availableRoom = await Room.findOne({
        isAvailable: true,
        isActive: true,
        petTypes: { $in: petTypes }
      }).sort({ type: 1, pricePerNight: 1 }); // Prefer standard, cheaper rooms first

      if (availableRoom) {
        // Assign room to booking
        booking.room = availableRoom._id;
        
        // Mark room as unavailable
        availableRoom.isAvailable = false;
        await availableRoom.save();
      }
      // If no room available, booking still continues without room (optional)
    }
  }

  // Release room when booking is completed or cancelled
  if (!usesItemLevelSpaRooms && (status === "completed" || status === "cancelled") && booking.room) {
    await Room.findByIdAndUpdate(booking.room, { isAvailable: true });
  }

  if (status === "completed") {
    booking.completedAt = Date.now();
  }

  await booking.save();
  await booking.populate("customer items.service items.pet assignedStaff room");

  // Notify the customer about the status change
  const notificationMessages = {
    confirmed:    { title: 'Booking Confirmed',       message: 'Your booking has been confirmed. We look forward to seeing you!', priority: 'high' },
    'in-progress': { title: 'Check-In Successful',   message: 'Your pet has been checked in and is now in our care.', priority: 'high' },
    completed:    { title: 'Booking Completed',       message: 'Your booking is complete. Thank you for choosing Happy Tails!', priority: 'medium' },
    cancelled:    { title: 'Booking Cancelled',       message: 'Your booking has been cancelled by staff.', priority: 'high' }
  };
  const notif = notificationMessages[status];
  if (notif && booking.customer) {
    await sendAutoNotification(
      booking.customer._id,
      'booking',
      notif.title,
      notif.message,
      { priority: notif.priority, metadata: { bookingId: booking._id } }
    );
  }

  res.status(200).json({
    status: "success",
    message: "Booking status updated",
    data: { booking },
  });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const booking = await Booking.findById(req.params.id).session(session);
    
    if (!booking) {
      await session.abortTransaction();
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
    }

    // Check permission
    if (
      req.user.role === "customer" &&
      booking.customer.toString() !== req.user.id
    ) {
      await session.abortTransaction();

      return next(
        new AppError(
          "You do not have permission to cancel this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      await session.abortTransaction();

      return next(
        new AppError("Booking is already cancelled", 400, "ALREADY_CANCELLED"),
      );
    }

    // Check if completed
    if (booking.status === "completed") {
      await session.abortTransaction();

      return next(
        new AppError(
          "Cannot cancel completed booking",
          400,
          "CANNOT_CANCEL_COMPLETED",
        ),
      );
    }

    // Check cancellation policy (example: can't cancel within 24h of booking time)
    const bookingDateTime = new Date(booking.bookingDate);
    const hoursUntilBooking = (bookingDateTime - new Date()) / (1000 * 60 * 60);

    let refundPercentage = 100;
    if (hoursUntilBooking < 24 && hoursUntilBooking >= 0) {
      refundPercentage = 50; // 50% refund if cancelled within 24h
    } else if (hoursUntilBooking < 0) {
      await session.abortTransaction();

      return next(
        new AppError("Cannot cancel past bookings", 400, "PAST_BOOKING"),
      );
    }

    // Update booking status
    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.cancelledAt = Date.now();
    booking.cancelledBy = req.user.id;
    await booking.save({ session });

    // Process refund if booking was paid
    let refundTransaction = null;
    if (booking.isPaid && booking.totalAmount > 0) {
      const refundAmount = (booking.totalAmount * refundPercentage) / 100;

      // Update user wallet balance
      const user = await User.findById(booking.customer).session(session);
      if (!user) {
        await session.abortTransaction();
        return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
      }

      user.walletBalance = (user.walletBalance || 0) + refundAmount;
      await user.save({ session });

      // Create refund transaction
      refundTransaction = await Transaction.create(
        [
          {
            userId: booking.customer,
            user: booking.customer,
            type: "refund",
            amount: refundAmount,
            status: "completed",
            method: "system",
            booking: booking._id,
            description: `Refund for cancelled booking ${booking.bookingNumber} (${refundPercentage}%)`,
            processedBy: req.user.id,
            processedAt: Date.now(),
          },
        ],
        { session },
      );
    }

    // Restore room availability for legacy room-based bookings.
    const usesItemLevelSpaRooms = booking.items?.some((item) => item.assignedRoom);
    if (!usesItemLevelSpaRooms && booking.room) {
      await Room.findByIdAndUpdate(
        booking.room,
        { isAvailable: true },
        { session },
      );
    }

    // Restore service capacity (if your system tracks this)
    // for (const item of booking.items) {
    //   await Service.findByIdAndUpdate(
    //     item.service,
    //     { $inc: { currentCapacity: -item.quantity } },
    //     { session }
    //   );
    // }

    await session.commitTransaction();

    // Populate for response
    await booking.populate(
      "customer items.service items.pet assignedStaff room cancelledBy",
    );

    // Notify customer about cancellation
    await sendAutoNotification(
      booking.customer._id,
      'booking',
      'Booking Cancelled',
      refundTransaction
        ? `Your booking has been cancelled. A refund of ${refundPercentage}% will be processed to your wallet.`
        : 'Your booking has been cancelled.',
      { priority: 'high', metadata: { bookingId: booking._id } }
    );

    res.status(200).json({
      status: "success",

      message: "Booking cancelled successfully",

      data: {
        booking,

        refund: refundTransaction
          ? {
              amount: refundTransaction[0].amount,

              percentage: refundPercentage,

              transactionId: refundTransaction[0]._id,
            }
          : null,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
});

/**

 * Assign staff to booking

 * @route PUT /api/bookings/:id/assign-staff

 * @access Private (Staff, Admin)

 */

exports.assignStaffToBooking = catchAsync(async (req, res, next) => {
  if (req.user.role !== "staff") {
    return next(new AppError("Only staff can assign booking ownership", 403, "FORBIDDEN"));
  }

  const { staffId } = req.body;

  const booking = await Booking.findByIdAndUpdate(
    req.params.id,

    { assignedStaff: staffId },

    { new: true, runValidators: true },
  ).populate("assignedStaff", "name email role");

  if (!booking) {
    return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
  }

  res.status(200).json({
    status: "success",

    message: "Staff assigned to booking",

    data: { booking },
  });
});

const buildStayRange = ({ checkInDate, checkInTime = '00:00', checkOutDate, checkOutTime = '00:00' }) => {
  const checkIn = new Date(`${String(checkInDate).split('T')[0]}T${checkInTime}:00`);
  const checkOut = new Date(`${String(checkOutDate).split('T')[0]}T${checkOutTime}:00`);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return null;
  }

  return { checkIn, checkOut };
};

const getRoomOverlapCount = async (roomId, checkIn, checkOut) => {
  const overlapCount = await Booking.countDocuments({
    status: { $in: ACTIVE_STATUSES },
    $or: [{ room: roomId }, { 'stayInfo.room': roomId }],
    'stayInfo.enabled': true,
    'stayInfo.checkInDate': { $lt: checkOut },
    'stayInfo.checkOutDate': { $gt: checkIn },
  });

  return overlapCount;
};

const getRoomRemainingCapacity = async (room, checkIn, checkOut) => {
  const overlapCount = await getRoomOverlapCount(room._id, checkIn, checkOut);
  const totalCapacity = Math.max(1, Number(room?.capacity) || 1);
  return Math.max(0, totalCapacity - overlapCount);
};

const hasRoomOverlapBooking = async (roomId, checkIn, checkOut) =>
  (await getRoomOverlapCount(roomId, checkIn, checkOut)) > 0;

const getPetBookingIntervals = (booking, petId) => {
  const intervals = [];

  const isSameBoardingPet =
    booking?.boardingPet && String(booking.boardingPet) === String(petId);

  if (isSameBoardingPet && booking?.stayInfo?.enabled) {
    const checkIn = new Date(booking.stayInfo.checkInDate);
    const checkOut = new Date(booking.stayInfo.checkOutDate);
    if (!Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut > checkIn) {
      intervals.push({ start: checkIn, end: checkOut });
    }
  }

  (booking?.items || []).forEach((item) => {
    if (!item?.pet || String(item.pet) !== String(petId)) return;
    const start = item?.startTime ? new Date(item.startTime) : null;
    const end = item?.endTime ? new Date(item.endTime) : null;
    if (!start || !end) return;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return;
    intervals.push({ start, end });
  });

  return intervals;
};

/**
 * Get disabled slots for a specific service/date.
 * The slot is considered unavailable when the service group (wet/dry) reaches configured max capacity.
 * @route GET /api/bookings/available-slots
 * @access Private (Customer)
 */
exports.getAvailableSlots = catchAsync(async (req, res, next) => {
  const { date, serviceId, petId } = req.query;

  if (!date || !serviceId) {
    return next(new AppError('date và serviceId là bắt buộc', 400, 'MISSING_REQUIRED_FIELDS'));
  }

  const day = new Date(date);
  if (Number.isNaN(day.getTime())) {
    return next(new AppError('Ngày không hợp lệ', 400, 'INVALID_DATE'));
  }

  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) {
    return next(new AppError('Dịch vụ không tồn tại hoặc không còn hoạt động', 404, 'SERVICE_NOT_FOUND'));
  }

  const serviceDisabledSlots = await getServiceDayDisabledSlots(service, day);
  const serviceGroup = inferServiceGroup(service);
  const groupConfig = await getActiveGroupConfig(serviceGroup);

  let petConflictSlots = [];
  if (petId) {
    const pet = await UserPet.findOne({ _id: petId, userID: req.user.id }).select("_id");
    if (!pet) {
      return next(new AppError("Pet not found or not owned by you", 404, "PET_NOT_FOUND"));
    }

    const serviceDurationMin = Math.max(15, Number(service.duration) || 15);
    petConflictSlots = await getPetDayConflictSlots({
      petId,
      date: day,
      serviceDurationMin,
    });
  }

  const disabledSlots = [...new Set([...serviceDisabledSlots, ...petConflictSlots])].sort(
    (a, b) => slotLabelToMinutes(a) - slotLabelToMinutes(b),
  );

  return res.status(200).json({
    status: 'success',
    data: {
      disabledSlots,
      serviceDisabledSlots,
      petConflictSlots,
      serviceId,
      petId: petId || null,
      date: startOfDay(day).toISOString(),
      group: serviceGroup,
      maxCapacity: groupConfig.maxCapacity,
    },
  });
});

/**
 * Checkout Booking — Full business logic
 *
 * Rules implemented:
 *  1. 15-minute slot alignment validation
 *  2. Pet ownership security check
 *  3. Wet-before-Dry service ordering
 *  4. Zero-latency time chaining
 *  5. Group capacity check  (max 6 concurrent per wet/dry group)
 *  6. Room auto-assignment  (101/201 primary, 102/202 overflow at 4th pet)
 *  7. Per-pet schedule conflict check (no overlapping bookings for same pet)
 *  8. Voucher validation
 *  9. Atomic DB transaction (booking + transaction record + clear cart)
 *
 * @route POST /api/bookings/checkout
 * @access Private (Customer)
 */
exports.checkoutBooking = catchAsync(async (req, res, next) => {
  // Wallet is the only accepted payment method for customer checkout
  const {
    appointmentDate,
    date,
    time,
    petId,
    voucherCode,
    notes,
    stayCheckInDate,
    stayCheckInTime,
    stayCheckOutDate,
    stayCheckOutTime,
  } = req.body;
  const paymentMethod = "wallet";

  const derivedAppointmentFromStay =
    stayCheckInDate && stayCheckInTime
      ? `${stayCheckInDate}T${stayCheckInTime}:00`
      : null;

  const apptDate = parseAppointmentDate({
    appointmentDate: appointmentDate || derivedAppointmentFromStay,
    bookingDate: date,
    bookingTime: time,
  });

  if (!apptDate || !petId) {
    return next(new AppError("Cần chọn thời gian dịch vụ (hoặc dùng giờ nhận phòng) và petId", 400, "MISSING_REQUIRED_FIELDS"));
  }

  if (Number.isNaN(apptDate.getTime())) {
    return next(new AppError("appointmentDate không hợp lệ", 400, "INVALID_DATE"));
  }

  if (isBeforeNow(apptDate)) {
    return next(new AppError("Không thể chọn lịch trong quá khứ", 400, "PAST_APPOINTMENT_DATE"));
  }

  if (!isAlignedTo15Minutes(apptDate)) {
    return next(
      new AppError(
        "Booking time must align to 15-minute slots (09:00, 09:15, 09:30, 09:45...)",
        400,
        "INVALID_TIME_SLOT",
      ),
    );
  }

  const pet = await UserPet.findOne({ _id: petId, userID: req.user.id });
  if (!pet) {
    return next(new AppError("Pet not found or not owned by you", 404, "PET_NOT_FOUND"));
  }

  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart || cart.items.length === 0) {
    return next(new AppError("Giỏ hàng đang trống", 400, "CART_EMPTY"));
  }

  cart.recalculate();

  const serviceCartItems = cart.items.filter((item) => (item.type || "service") === "service" && item.serviceId);
  const stayCartItem = cart.items.find((item) => (item.type || "service") === "stay");

  if (serviceCartItems.length === 0) {
    return next(new AppError("Giỏ hàng phải có ít nhất 1 dịch vụ", 400, "CART_NO_SERVICE_ITEM"));
  }

  const rawItems = serviceCartItems.map((item) => ({
    serviceId: item.serviceId,
    quantity: Math.max(1, Number(item.quantity) || 1),
    note: item.note,
  }));

  const serviceIds = [...new Set(rawItems.map((item) => String(item.serviceId)))];
  const services = await Service.find({ _id: { $in: serviceIds } }).populate("category");
  if (services.length !== serviceIds.length) {
    return next(
      new AppError(
        "One or more services in your cart are no longer available",
        404,
        "SERVICE_NOT_FOUND",
      ),
    );
  }

  const serviceMap = buildServiceMap(services);
  const expandedItems = expandRequestedItems(rawItems, serviceMap);
  if (expandedItems.length === 0) {
    return next(new AppError("No valid services to schedule", 400, "NO_VALID_ITEMS"));
  }

  const sortedItems = sortWetBeforeDry(expandedItems);
  const scheduledItems = buildScheduledItems(sortedItems, apptDate);

  const lockHolder = `customer:${req.user.id}:${randomUUID()}`;
  const lockTargets = buildLockTargets(scheduledItems);

  try {
    await acquireSlotLocks(lockTargets, lockHolder);
    await validateCapacityAndAssignRooms(scheduledItems);

    let stayInfo = null;
    let bookingRoomId = null;

    if (stayCartItem) {
      const stayRange = buildStayRange({
        checkInDate: stayCheckInDate || stayCartItem.metadata?.checkInDate,
        checkInTime: stayCheckInTime || stayCartItem.metadata?.checkInTime || '00:00',
        checkOutDate: stayCheckOutDate || stayCartItem.metadata?.checkOutDate,
        checkOutTime: stayCheckOutTime || stayCartItem.metadata?.checkOutTime || '10:00',
      });

      if (!stayRange) {
        return next(new AppError("Ngày nhận/trả phòng không hợp lệ", 400, "INVALID_STAY_RANGE"));
      }

      if (startOfDay(stayRange.checkIn).getTime() < startOfDay(new Date()).getTime()) {
        return next(new AppError("Không thể chọn ngày nhận phòng trong quá khứ", 400, "PAST_CHECKIN_DATE"));
      }

      if (apptDate < stayRange.checkIn || apptDate >= stayRange.checkOut) {
        return next(
          new AppError(
            "Lịch hẹn dịch vụ phải nằm trong khoảng thời gian lưu trú",
            400,
            "APPOINTMENT_OUTSIDE_STAY",
          ),
        );
      }

      const roomId = stayCartItem.roomId || stayCartItem.refId;
      const requestedRoom = await Room.findById(roomId);

      if (!requestedRoom || !requestedRoom.isActive) {
        return next(new AppError("Phòng lưu trú không tồn tại", 404, "ROOM_NOT_FOUND"));
      }

      let selectedRoom = requestedRoom;
      const requestedRemainingCapacity = await getRoomRemainingCapacity(
        requestedRoom,
        stayRange.checkIn,
        stayRange.checkOut,
      );

      if (requestedRemainingCapacity <= 0) {
        const roomFilter = {
          isActive: true,
          type: requestedRoom.type,
          _id: { $ne: requestedRoom._id },
        };

        const candidateRooms = await Room.find(roomFilter).sort({ pricePerNight: 1, roomNumber: 1 });
        let replacement = null;
        for (const candidate of candidateRooms) {
          const candidateRemainingCapacity = await getRoomRemainingCapacity(
            candidate,
            stayRange.checkIn,
            stayRange.checkOut,
          );
          if (candidateRemainingCapacity > 0) {
            replacement = candidate;
            break;
          }
        }

        if (!replacement) {
          return next(
            new AppError(
              "Không còn phòng trống trong khoảng nhận/trả đã chọn. Vui lòng đổi ngày hoặc giờ trả phòng.",
              409,
              "ROOM_STAY_CONFLICT",
            ),
          );
        }

        selectedRoom = replacement;
      }

      const nights = Math.max(
        1,
        Number(stayCartItem.metadata?.nights) || Math.ceil((stayRange.checkOut - stayRange.checkIn) / (1000 * 60 * 60 * 24)),
      );
      const pricePerNight = Number(
        selectedRoom.pricePerNight ??
          stayCartItem.unitPrice ??
          stayCartItem.price ??
          0,
      );
      const subtotal = pricePerNight * nights;

      stayInfo = {
        enabled: true,
        room: selectedRoom._id,
        roomName: selectedRoom.name,
        checkInDate: stayRange.checkIn,
        checkOutDate: stayRange.checkOut,
        checkInTime: stayCheckInTime || stayCartItem.metadata?.checkInTime || '00:00',
        checkOutTime: stayCheckOutTime || stayCartItem.metadata?.checkOutTime || '10:00',
        nights,
        pricePerNight,
        subtotal,
      };
      bookingRoomId = selectedRoom._id;
    }

    const overallStart = scheduledItems[0].startTime;
    const overallEnd = scheduledItems[scheduledItems.length - 1].endTime;
    const petConflict = await Booking.findOne({
      status: { $nin: ["cancelled", "completed"] },
      items: {
        $elemMatch: {
          pet: petId,
          startTime: { $lt: overallEnd },
          endTime: { $gt: overallStart },
        },
      },
    }).lean();

    if (petConflict) {
      return next(
        new AppError(
          "Thú cưng này đã có lịch hẹn trùng với khung giờ trên. Vui lòng chọn thời gian khác.",
          409,
          "PET_SCHEDULE_CONFLICT",
        ),
      );
    }

    const serviceSubtotal = Number(cart.serviceSubtotal || 0);
    const serviceDurationTotal = Number(cart.serviceDurationTotal || 0);
    const staySubtotal = Number(stayInfo?.subtotal || 0);
    const stayDurationTotal = Number(stayInfo?.nights || 0);
    let totalAmount = serviceSubtotal + staySubtotal;
    let discount = 0;
    let voucherApplied = null;

    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() });
      if (!voucher) return next(new AppError("Voucher not found", 404, "VOUCHER_NOT_FOUND"));
      if (!voucher.isValid()) {
        return next(new AppError("Voucher expired or reached usage limit", 400, "VOUCHER_INVALID"));
      }
      if (totalAmount < voucher.minSpend) {
        return next(
          new AppError(
            `Minimum spend of ${voucher.minSpend.toLocaleString()}đ required`,
            400,
            "MIN_SPEND_NOT_MET",
          ),
        );
      }

      if (voucher.applicableServices?.length > 0) {
        const cartServiceIds = scheduledItems.map((item) => item.svc._id.toString());
        const hasApplicable = voucher.applicableServices.some((svc) =>
          cartServiceIds.includes(svc.toString()),
        );
        if (!hasApplicable) {
          return next(
            new AppError(
              "Voucher is not applicable to any service in your cart",
              400,
              "VOUCHER_NOT_APPLICABLE",
            ),
          );
        }
      }

      discount =
        voucher.discountType === "percentage"
          ? Math.min((totalAmount * voucher.discountValue) / 100, voucher.maxDiscount || Infinity)
          : voucher.discountValue;
      totalAmount = Math.max(0, totalAmount - discount);
      voucherApplied = voucher;
    }

    // ── Wallet balance check (allow pending booking when insufficient) ───────
    const wallet = await Wallet.findOne({ userId: req.user.id });
    const currentBalance = Number(wallet?.balance || 0);
    const hasSufficientBalance = totalAmount <= 0 || currentBalance >= totalAmount;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const bookingItems = scheduledItems.map((item) => ({
        service: item.svc._id,
        pet: petId,
        quantity: 1,
        price: item.svc.price,
        notes: item.note,
        group: item.group,
        startTime: item.startTime,
        endTime: item.endTime,
        assignedRoom: item.assignedRoom,
      }));

      if (hasSufficientBalance && totalAmount > 0) {
        await Wallet.findByIdAndUpdate(
          wallet._id,
          { $inc: { balance: -totalAmount, totalSpent: totalAmount } },
          { session },
        );
      }

      const bookingStatus = hasSufficientBalance ? "confirmed" : "pending";
      const isPaid = hasSufficientBalance;

      const [booking] = await Booking.create(
        [
          {
            customer: req.user.id,
            items: bookingItems,
            bookingDate: apptDate,
            bookingTime: formatBookingTime(apptDate),
            totalAmount,
            paymentMethod,
            notes,
            room: bookingRoomId,
            stayInfo,
            status: bookingStatus,
            isPaid,
          },
        ],
        { session },
      );

      await Transaction.create(
        [
          {
            userId: req.user.id,
            user: req.user.id,
            type: "payment",
            amount: totalAmount,
            status: isPaid ? "completed" : "pending",
            method: "system",
            booking: booking._id,
            description: `Payment for booking ${booking.bookingNumber}`,
            notes: voucherApplied
              ? `Voucher ${voucherApplied.code} (-${discount.toLocaleString()}đ)`
              : !isPaid
                ? "Pending payment: insufficient wallet balance at checkout"
                : undefined,
          },
        ],
        { session },
      );

      if (voucherApplied) {
        await Voucher.findByIdAndUpdate(
          voucherApplied._id,
          { $inc: { usedCount: 1 } },
          { session },
        );
      }

      cart.items = [];
      cart.totalPrice = 0;
      cart.totalItems = 0;
      cart.serviceSubtotal = 0;
      cart.staySubtotal = 0;
      cart.serviceDurationTotal = 0;
      cart.stayDurationTotal = 0;
      cart.grandTotal = 0;
      await cart.save({ session });

      await session.commitTransaction();

      await booking.populate([
        { path: "customer", select: "name email phone" },
        { path: "items.service", select: "name price duration" },
        { path: "items.pet", select: "petName petType breed" },
      ]);

      if (isPaid) {
        await sendAutoNotification(
          req.user.id,
          "booking",
          "Booking Confirmed",
          "Đơn booking của bạn đã được xác nhận thành công. Vui lòng đến cửa hàng đúng giờ để staff tiếp nhận pet.",
          { priority: "high", metadata: { bookingId: booking._id } },
        );
      } else {
        await sendAutoNotification(
          req.user.id,
          "booking",
          "Booking Pending Payment",
          "Đơn booking đã được tạo ở trạng thái chờ thanh toán. Vui lòng nạp ví và thanh toán lại trong Booking History.",
          { priority: "high", metadata: { bookingId: booking._id } },
        );
      }

      res.status(201).json({
        status: "success",
        message: isPaid
          ? "Booking created successfully"
          : "Booking created as pending payment. Please top up wallet and pay from Booking History.",
        data: {
          booking,
          schedule: scheduledItems.map((item) => ({
            service: item.svc.name,
            group: item.group,
            room: item.assignedRoom,
            startTime: item.startTime.toISOString(),
            endTime: item.endTime.toISOString(),
            durationMins: item.svc.duration,
          })),
          ...(voucherApplied
            ? { voucher: { code: voucherApplied.code, discountAmount: discount } }
            : {}),
          summary: {
            serviceSubtotal,
            staySubtotal,
            serviceDurationTotal,
            stayDurationTotal,
            discount,
            totalAmount,
            isPaid,
            currentWalletBalance: currentBalance,
            pendingTopUpAmount: isPaid ? 0 : Math.max(0, totalAmount - currentBalance),
          },
        },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } finally {
    try {
      await releaseSlotLocks(lockHolder);
    } catch (_) {
      // Intentionally ignore lock-release failures to preserve primary error flow.
    }
  }
});

/**
 * Checkout Boarding Booking — standalone flow (no service cart dependency)
 * @route POST /api/bookings/boarding-checkout
 * @access Private (Customer)
 */
exports.checkoutBoarding = catchAsync(async (req, res, next) => {
  const {
    petId,
    roomId,
    stayCheckInDate,
    stayCheckInTime = "00:00",
    stayCheckOutDate,
    stayCheckOutTime = "10:00",
    notes,
  } = req.body;

  if (!petId || !roomId || !stayCheckInDate || !stayCheckOutDate) {
    return next(
      new AppError(
        "petId, roomId, stayCheckInDate, stayCheckOutDate are required",
        400,
        "MISSING_REQUIRED_FIELDS",
      ),
    );
  }

  const pet = await UserPet.findOne({ _id: petId, userID: req.user.id });
  if (!pet) {
    return next(new AppError("Pet not found or not owned by you", 404, "PET_NOT_FOUND"));
  }

  const stayRange = buildStayRange({
    checkInDate: stayCheckInDate,
    checkInTime: stayCheckInTime,
    checkOutDate: stayCheckOutDate,
    checkOutTime: stayCheckOutTime,
  });

  if (!stayRange) {
    return next(new AppError("Ngày nhận/trả phòng không hợp lệ", 400, "INVALID_STAY_RANGE"));
  }

  if (startOfDay(stayRange.checkIn).getTime() < startOfDay(new Date()).getTime()) {
    return next(new AppError("Không thể chọn ngày nhận phòng trong quá khứ", 400, "PAST_CHECKIN_DATE"));
  }

  const room = await Room.findById(roomId);
  if (!room || !room.isActive) {
    return next(new AppError("Phòng lưu trú không tồn tại", 404, "ROOM_NOT_FOUND"));
  }

  const roomRemainingCapacity = await getRoomRemainingCapacity(
    room,
    stayRange.checkIn,
    stayRange.checkOut,
  );
  if (roomRemainingCapacity <= 0) {
    return next(
      new AppError(
        "Không còn phòng trống trong khoảng nhận/trả đã chọn. Vui lòng đổi ngày hoặc giờ trả phòng.",
        409,
        "ROOM_STAY_CONFLICT",
      ),
    );
  }

  const petBookings = await Booking.find({
    status: { $in: ACTIVE_STATUSES },
    customer: req.user.id,
    $or: [{ "items.pet": petId }, { boardingPet: petId }],
  }).select("items.pet items.startTime items.endTime stayInfo boardingPet");

  const hasPetConflict = petBookings.some((booking) => {
    const intervals = getPetBookingIntervals(booking, petId);
    return intervals.some(
      ({ start, end }) => start < stayRange.checkOut && end > stayRange.checkIn,
    );
  });

  if (hasPetConflict) {
    return next(
      new AppError(
        "Thú cưng này đã có lịch hẹn/lưu trú trùng thời gian. Vui lòng chọn thời gian khác.",
        409,
        "PET_SCHEDULE_CONFLICT",
      ),
    );
  }

  const nights = Math.max(
    1,
    Math.ceil((stayRange.checkOut - stayRange.checkIn) / (1000 * 60 * 60 * 24)),
  );
  const pricePerNight = Number(room.pricePerNight || 0);
  const totalAmount = pricePerNight * nights;

  const wallet = await Wallet.findOne({ userId: req.user.id });
  const currentBalance = Number(wallet?.balance || 0);
  const hasSufficientBalance = totalAmount <= 0 || currentBalance >= totalAmount;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (hasSufficientBalance && totalAmount > 0) {
      await Wallet.findByIdAndUpdate(
        wallet._id,
        { $inc: { balance: -totalAmount, totalSpent: totalAmount } },
        { session },
      );
    }

    const bookingStatus = hasSufficientBalance ? "confirmed" : "pending";
    const isPaid = hasSufficientBalance;

    const [booking] = await Booking.create(
      [
        {
          customer: req.user.id,
          boardingPet: petId,
          items: [],
          bookingDate: stayRange.checkIn,
          bookingTime: stayCheckInTime,
          totalAmount,
          paymentMethod: "wallet",
          notes,
          room: room._id,
          stayInfo: {
            enabled: true,
            room: room._id,
            roomName: room.name,
            checkInDate: stayRange.checkIn,
            checkOutDate: stayRange.checkOut,
            checkInTime: stayCheckInTime,
            checkOutTime: stayCheckOutTime,
            nights,
            pricePerNight,
            subtotal: totalAmount,
          },
          status: bookingStatus,
          isPaid,
        },
      ],
      { session },
    );

    await Transaction.create(
      [
        {
          userId: req.user.id,
          user: req.user.id,
          type: "payment",
          amount: totalAmount,
          status: isPaid ? "completed" : "pending",
          method: "system",
          booking: booking._id,
          description: `Payment for boarding booking ${booking.bookingNumber}`,
          notes: isPaid ? undefined : "Pending payment: insufficient wallet balance at checkout",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    await booking.populate([
      { path: "customer", select: "name email phone" },
      { path: "boardingPet", select: "petName petType breed" },
      { path: "room", select: "name roomNumber type" },
    ]);

    if (isPaid) {
      await sendAutoNotification(
        req.user.id,
        "booking",
        "Boarding Booking Confirmed",
        "Đơn lưu trú của bạn đã được xác nhận thành công.",
        { priority: "high", metadata: { bookingId: booking._id } },
      );
    } else {
      await sendAutoNotification(
        req.user.id,
        "booking",
        "Boarding Booking Pending Payment",
        "Đơn lưu trú đã được tạo ở trạng thái chờ thanh toán. Vui lòng nạp ví và thanh toán lại trong Booking History.",
        { priority: "high", metadata: { bookingId: booking._id } },
      );
    }

    return res.status(201).json({
      status: "success",
      message: isPaid
        ? "Boarding booking created successfully"
        : "Boarding booking created as pending payment. Please top up wallet and pay from Booking History.",
      data: {
        booking,
        summary: {
          staySubtotal: totalAmount,
          stayDurationTotal: nights,
          totalAmount,
          isPaid,
          currentWalletBalance: currentBalance,
          pendingTopUpAmount: isPaid ? 0 : Math.max(0, totalAmount - currentBalance),
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Pay pending booking with wallet after top-up
 * @route PUT /api/bookings/:id/pay
 * @access Private (Customer)
 */
exports.payPendingBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
  }

  if (String(booking.customer) !== String(req.user.id)) {
    return next(
      new AppError(
        "You do not have permission to pay this booking",
        403,
        "FORBIDDEN",
      ),
    );
  }

  if (booking.status === "cancelled") {
    return next(new AppError("Cancelled booking cannot be paid", 400, "INVALID_BOOKING_STATE"));
  }

  if (booking.isPaid && booking.status === "confirmed") {
    return next(new AppError("Booking is already paid", 400, "BOOKING_ALREADY_PAID"));
  }

  if (booking.status !== "pending") {
    return next(
      new AppError(
        "Only pending bookings can be paid from Booking History",
        400,
        "BOOKING_NOT_PENDING",
      ),
    );
  }

  const totalAmount = Number(booking.totalAmount || 0);
  const wallet = await Wallet.findOne({ userId: req.user.id });
  const currentBalance = Number(wallet?.balance || 0);

  if (totalAmount > 0 && currentBalance < totalAmount) {
    return next(
      new AppError(
        `Số dư ví không đủ. Số dư hiện tại: ${currentBalance.toLocaleString("vi-VN")}đ, cần thanh toán: ${totalAmount.toLocaleString("vi-VN")}đ.`,
        400,
        "INSUFFICIENT_WALLET_BALANCE",
      ),
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (totalAmount > 0) {
      await Wallet.findByIdAndUpdate(
        wallet._id,
        { $inc: { balance: -totalAmount, totalSpent: totalAmount } },
        { session },
      );
    }

    booking.status = "confirmed";
    booking.isPaid = true;
    booking.paymentMethod = "wallet";
    await booking.save({ session });

    await Transaction.updateMany(
      {
        booking: booking._id,
        type: "payment",
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          failureReason: "Superseded by successful retry payment",
          processedAt: new Date(),
        },
      },
      { session },
    );

    await Transaction.create(
      [
        {
          userId: req.user.id,
          user: req.user.id,
          type: "payment",
          amount: totalAmount,
          status: "completed",
          method: "system",
          booking: booking._id,
          description: `Retry payment for booking ${booking.bookingNumber}`,
          notes: "Paid from Booking History after wallet top-up",
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  await booking.populate([
    { path: "customer", select: "name email phone" },
    { path: "items.service", select: "name price duration" },
    { path: "items.pet", select: "petName petType breed" },
    { path: "boardingPet", select: "petName petType breed" },
  ]);

  await sendAutoNotification(
    req.user.id,
    "booking",
    "Booking Confirmed",
    "Thanh toán thành công. Đơn booking của bạn đã được xác nhận.",
    { priority: "high", metadata: { bookingId: booking._id } },
  );

  return res.status(200).json({
    status: "success",
    message: "Booking payment successful",
    data: {
      booking,
    },
  });
});

