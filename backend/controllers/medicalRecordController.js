const MedicalRecord  = require('../models/MedicalRecord');
const UserPet        = require('../models/UserPet');
const User           = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const { AppError }   = require('../utils/AppError');

// ─────────────────────────────────────────────────────────────
// POST /api/medical-records  (Staff | Admin)
// ─────────────────────────────────────────────────────────────
exports.createMedicalRecord = catchAsync(async (req, res, next) => {
  const {
    userPet: userPetID, user: userID,
    recordType, condition, diagnosis, treatment,
    medications, vitals, notes, followUpDate, booking
  } = req.body;

  if (!userPetID || !userID) {
    return next(new AppError('userPet and user are required', 400, 'MISSING_FIELDS'));
  }

  if (!condition || !diagnosis || !treatment) {
    return next(new AppError('condition, diagnosis and treatment are required', 400, 'MISSING_FIELDS'));
  }

  // Verify owner exists and is not deleted
  const owner = await User.findOne({ _id: userID, isDeleted: false });
  if (!owner) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // Verify pet exists and belongs to that owner
  const pet = await UserPet.findOne({ _id: userPetID, userID, isActive: true });
  if (!pet) {
    return next(new AppError('Pet not found or does not belong to this user', 404, 'PET_NOT_FOUND'));
  }

  const record = await MedicalRecord.create({
    userPet:     userPetID,
    user:        userID,
    booking:     booking    || null,
    recordType:  recordType || 'checkup',
    condition,
    diagnosis,
    treatment,
    medications: medications || [],
    vitals:      vitals      || {},
    notes:       notes       || '',
    followUpDate: followUpDate || null,
    createdBy:   req.user.id
  });

  // Sync to UserPet.medicalRecords for customer view
  try {
    await UserPet.findByIdAndUpdate(userPetID, {
      $push: {
        medicalRecords: {
          date: new Date(),
          type: recordType || 'checkup',
          diagnosis,
          treatment,
          veterinarian: req.user.name || 'Staff',
          clinic: 'Happy Tails Clinic',
          medications: medications?.map(m => m.name) || [],
          notes: notes || ''
        }
      }
    });
  } catch (syncError) {
    console.warn('Failed to sync medical record to UserPet:', syncError.message);
  }

  await record.populate([
    { path: 'userPet',    select: 'petName petType breed' },
    { path: 'user',       select: 'name email phone' },
    { path: 'createdBy',  select: 'name email' }
  ]);

  res.status(201).json({
    status: 'success',
    message: 'Medical record created successfully',
    data: { record }
  });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/medical-records/:id  (Staff | Admin)
// ─────────────────────────────────────────────────────────────
exports.updateMedicalRecord = catchAsync(async (req, res, next) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) {
    return next(new AppError('Medical record not found', 404, 'RECORD_NOT_FOUND'));
  }

  const updatable = ['recordType','condition','diagnosis','treatment','medications','vitals','notes','followUpDate'];
  updatable.forEach((field) => {
    if (req.body[field] !== undefined) record[field] = req.body[field];
  });
  record.updatedBy = req.user.id;

  await record.save();
  await record.populate([
    { path: 'userPet',   select: 'petName petType breed' },
    { path: 'user',      select: 'name email phone' },
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' }
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Medical record updated successfully',
    data: { record }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/medical-records  (Staff | Admin — view all)
// ─────────────────────────────────────────────────────────────
exports.getAllMedicalRecords = catchAsync(async (req, res, next) => {
  const { userId, petId, bookingId, recordType, page = 1, limit = 20 } = req.query;
  const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

  const filter = {};
  if (userId)     filter.user       = userId;
  if (petId)      filter.userPet    = petId;
  if (bookingId)  filter.booking    = bookingId;
  if (recordType) filter.recordType = recordType;

  const [records, total] = await Promise.all([
    MedicalRecord.find(filter)
      .populate('userPet', 'petName petType breed')
      .populate('user',    'name email phone')
      .populate('booking', 'bookingNumber bookingDate bookingTime status')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    MedicalRecord.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: records.length,
    data: {
      records,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/medical-records/my-pets  (Customer — own pets only)
// ─────────────────────────────────────────────────────────────
exports.getMyPetsRecords = catchAsync(async (req, res, next) => {
  const { petId, bookingId, recordType } = req.query;

  // SECURITY: always force filter to current user
  const filter = { user: req.user.id };
  if (petId)      filter.userPet    = petId;
  if (bookingId)  filter.booking    = bookingId;
  if (recordType) filter.recordType = recordType;

  const records = await MedicalRecord.find(filter)
    .populate('userPet', 'petName petType breed')
    .populate('booking', 'bookingNumber bookingDate bookingTime status')
    .populate('createdBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: records.length,
    data: { records }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/medical-records/:id  (Auth — with permission check)
// ─────────────────────────────────────────────────────────────
exports.getMedicalRecordById = catchAsync(async (req, res, next) => {
  const record = await MedicalRecord.findById(req.params.id)
    .populate('userPet user booking createdBy updatedBy');

  if (!record) {
    return next(new AppError('Medical record not found', 404, 'RECORD_NOT_FOUND'));
  }

  // Customer can only see their own pet's records
  if (req.user.role === 'customer' && record.user._id.toString() !== req.user.id) {
    return next(new AppError('Access denied', 403, 'FORBIDDEN'));
  }

  res.status(200).json({ status: 'success', data: { record } });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/medical-records/:id  (Admin only)
// ─────────────────────────────────────────────────────────────
exports.deleteMedicalRecord = catchAsync(async (req, res, next) => {
  const record = await MedicalRecord.findByIdAndDelete(req.params.id);
  if (!record) {
    return next(new AppError('Medical record not found', 404, 'RECORD_NOT_FOUND'));
  }

  res.status(200).json({ status: 'success', message: 'Medical record deleted', data: null });
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/medical-records/:id/stage  (Staff | Admin)
// Update workflow stage and optionally add stage photos
// ─────────────────────────────────────────────────────────────
exports.updateStage = catchAsync(async (req, res, next) => {
  const { stage, notes, photos } = req.body;

  const validStages = ['received', 'processing', 'completed'];
  if (!stage || !validStages.includes(stage)) {
    return next(new AppError('Invalid stage. Must be: received, processing, or completed', 400, 'INVALID_STAGE'));
  }

  const record = await MedicalRecord.findById(req.params.id);
  if (!record) {
    return next(new AppError('Medical record not found', 404, 'RECORD_NOT_FOUND'));
  }

  // Stage transitions must go forward (received → processing → completed)
  const stageOrder = { received: 0, processing: 1, completed: 2 };
  if (stageOrder[stage] < stageOrder[record.workflowStage]) {
    return next(new AppError('Cannot revert to a previous stage', 400, 'INVALID_STAGE_TRANSITION'));
  }

  // Append photos to the matching stage array
  if (photos && Array.isArray(photos) && photos.length > 0) {
    const stagePhotoField = `${stage}Photos`;
    record[stagePhotoField].push(...photos);
  }

  // Record stage history
  record.stageHistory.push({
    stage,
    updatedBy: req.user.id,
    updatedAt: new Date(),
    notes: notes || ''
  });

  record.workflowStage = stage;
  record.updatedBy = req.user.id;

  await record.save();
  await record.populate([
    { path: 'userPet',   select: 'petName petType breed' },
    { path: 'user',      select: 'name email phone' },
    { path: 'updatedBy', select: 'name email' }
  ]);

  // Notify the pet owner about the stage change
  const { sendAutoNotification } = require('../utils/notificationHelper');
  const stageLabels = { received: 'Received', processing: 'Being Processed', completed: 'Completed' };
  await sendAutoNotification(
    record.user._id,
    'system',
    'Medical Record Updated',
    `Your pet's medical record is now: ${stageLabels[stage]}`,
    { priority: stage === 'completed' ? 'high' : 'medium', metadata: { recordId: record._id } }
  );

  res.status(200).json({
    status: 'success',
    message: `Stage updated to "${stage}"`,
    data: { record }
  });
});
