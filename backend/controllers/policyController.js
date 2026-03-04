/**
 * Policy Controller
 * Handles policy management operations
 */

const Policy = require('../models/Policy');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all policies (active only for public)
 * @route GET /api/policies
 * @access Public
 */
exports.getAllPolicies = catchAsync(async (req, res, next) => {
  const { type } = req.query;
  
  const filter = {};
  
  // Only show active policies to non-admin users
  if (!req.user || req.user.role !== 'admin') {
    filter.isActive = true;
  }
  
  if (type) filter.type = type;

  const policies = await Policy.find(filter)
    .populate('createdBy', 'name email')
    .sort('type -createdAt');

  res.status(200).json({
    status: 'success',
    results: policies.length,
    data: { policies }
  });
});

/**
 * Get policy by slug
 * @route GET /api/policies/:slug
 * @access Public
 */
exports.getPolicyBySlug = catchAsync(async (req, res, next) => {
  const policy = await Policy.findOne({ slug: req.params.slug })
    .populate('createdBy', 'name email');

  if (!policy) {
    return next(new AppError('Policy not found', 404, 'POLICY_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    data: { policy }
  });
});

/**
 * Create policy
 * @route POST /api/policies
 * @access Private (Admin)
 */
exports.createPolicy = catchAsync(async (req, res, next) => {
  const { title, content, type, version, effectiveDate, isActive } = req.body;

  const policy = await Policy.create({
    title,
    content,
    type,
    version,
    effectiveDate,
    isActive,
    createdBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    message: 'Policy created successfully',
    data: { policy }
  });
});

/**
 * Update policy
 * @route PUT /api/policies/:id
 * @access Private (Admin)
 */
exports.updatePolicy = catchAsync(async (req, res, next) => {
  const { title, content, type, version, effectiveDate, isActive } = req.body;

  const policy = await Policy.findByIdAndUpdate(
    req.params.id,
    {
      title,
      content,
      type,
      version,
      effectiveDate,
      isActive,
      updatedBy: req.user.id
    },
    { new: true, runValidators: true }
  );

  if (!policy) {
    return next(new AppError('Policy not found', 404, 'POLICY_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Policy updated successfully',
    data: { policy }
  });
});

/**
 * Delete policy
 * @route DELETE /api/policies/:id
 * @access Private (Admin)
 */
exports.deletePolicy = catchAsync(async (req, res, next) => {
  const policy = await Policy.findByIdAndDelete(req.params.id);

  if (!policy) {
    return next(new AppError('Policy not found', 404, 'POLICY_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Policy deleted successfully',
    data: null
  });
});
