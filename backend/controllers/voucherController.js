/**
 * Voucher Controller
 * Admin voucher management
 */

const Voucher = require('../models/Voucher');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all vouchers
 * @route GET /api/vouchers
 * @access Private (Admin)
 */
exports.getAllVouchers = catchAsync(async (req, res, next) => {
  const { isActive, isAIGenerated, search, page = 1, limit = 20 } = req.query;
  const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

  const filter = {};
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (isAIGenerated !== undefined) {
    filter.isAIGenerated = isAIGenerated === 'true';
  }
  
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const [vouchers, total] = await Promise.all([
    Voucher.find(filter)
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Voucher.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: vouchers.length,
    data: {
      vouchers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

/**
 * Get voucher by ID
 * @route GET /api/vouchers/:id
 * @access Private (Admin)
 */
exports.getVoucherById = catchAsync(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('targetCustomers', 'name email');

  if (!voucher) {
    return next(new AppError('Voucher not found', 404, 'VOUCHER_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    data: { voucher }
  });
});

/**
 * Create voucher
 * @route POST /api/vouchers
 * @access Private (Admin)
 */
exports.createVoucher = catchAsync(async (req, res, next) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minSpend,
    maxDiscount,
    usageLimit,
    validFrom,
    validUntil,
    targetCustomers,
    applicableServices
  } = req.body;

  // Check if code already exists
  const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
  if (existingVoucher) {
    return next(new AppError('Voucher code already exists', 400, 'CODE_EXISTS'));
  }

  const voucher = await Voucher.create({
    code: code.toUpperCase(),
    description,
    discountType: discountType || 'percentage',
    discountValue,
    minSpend: minSpend || 0,
    maxDiscount: maxDiscount || null,
    usageLimit: usageLimit || null,
    validFrom: validFrom || Date.now(),
    validUntil,
    targetCustomers: targetCustomers || [],
    applicableServices: applicableServices || [],
    isAIGenerated: false,
    createdBy: req.user.id
  });

  await voucher.populate('createdBy', 'name email');

  res.status(201).json({
    status: 'success',
    message: 'Voucher created successfully',
    data: { voucher }
  });
});

/**
 * Update voucher
 * @route PUT /api/vouchers/:id
 * @access Private (Admin)
 */
exports.updateVoucher = catchAsync(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id);

  if (!voucher) {
    return next(new AppError('Voucher not found', 404, 'VOUCHER_NOT_FOUND'));
  }

  const updatableFields = [
    'description', 'discountType', 'discountValue', 'minSpend',
    'maxDiscount', 'usageLimit', 'validFrom', 'validUntil',
    'isActive', 'targetCustomers', 'applicableServices'
  ];

  updatableFields.forEach(field => {
    if (req.body[field] !== undefined) {
      voucher[field] = req.body[field];
    }
  });

  await voucher.save();
  await voucher.populate('createdBy', 'name email');

  res.status(200).json({
    status: 'success',
    message: 'Voucher updated successfully',
    data: { voucher }
  });
});

/**
 * Toggle voucher active status
 * @route PUT /api/vouchers/:id/toggle
 * @access Private (Admin)
 */
exports.toggleVoucherStatus = catchAsync(async (req, res, next) => {
  const voucher = await Voucher.findById(req.params.id);

  if (!voucher) {
    return next(new AppError('Voucher not found', 404, 'VOUCHER_NOT_FOUND'));
  }

  voucher.isActive = !voucher.isActive;
  await voucher.save();

  res.status(200).json({
    status: 'success',
    message: `Voucher ${voucher.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { voucher }
  });
});

/**
 * Delete voucher
 * @route DELETE /api/vouchers/:id
 * @access Private (Admin)
 */
exports.deleteVoucher = catchAsync(async (req, res, next) => {
  const voucher = await Voucher.findByIdAndDelete(req.params.id);

  if (!voucher) {
    return next(new AppError('Voucher not found', 404, 'VOUCHER_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Voucher deleted successfully',
    data: null
  });
});
