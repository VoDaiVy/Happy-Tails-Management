/**
 * Service Controller
 * Handles service management operations
 */

const Service = require('../models/Service');
const Category = require('../models/Category');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all services (with filters)
 * @route GET /api/services
 * @access Public
 */
exports.getAllServices = catchAsync(async (req, res, next) => {
  const { category, petType, minPrice, maxPrice, search, isActive = 'true' } = req.query;

  const filter = {};
  
  if (isActive !== 'all') {
    filter.isActive = isActive === 'true';
  }
  
  if (category) {
    filter.category = category;
  }
  
  if (petType) {
    filter.petTypes = petType;
  }
  
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const services = await Service.find(filter)
    .populate('category', 'name description')
    .populate('createdBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: services.length,
    data: { services }
  });
});

/**
 * Get service by ID
 * @route GET /api/services/:id
 * @access Public
 */
exports.getServiceById = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id)
    .populate('category', 'name description')
    .populate('createdBy', 'name email');

  if (!service) {
    return next(new AppError('Service not found', 404, 'SERVICE_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    data: { service }
  });
});

/**
 * Create new service
 * @route POST /api/services
 * @access Private (Admin, Staff)
 */
exports.createService = catchAsync(async (req, res, next) => {
  const { name, description, category, price, duration, images, features, petTypes, maxCapacity } = req.body;

  // Validate category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return next(new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND'));
  }

  const service = await Service.create({
    name,
    description,
    category,
    price,
    duration,
    images,
    features,
    petTypes,
    maxCapacity,
    createdBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    message: 'Service created successfully',
    data: { service }
  });
});

/**
 * Update service
 * @route PUT /api/services/:id
 * @access Private (Admin, Staff)
 */
exports.updateService = catchAsync(async (req, res, next) => {
  const { name, description, category, price, duration, images, features, petTypes, maxCapacity, isActive } = req.body;

  // Validate category if provided
  if (category) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return next(new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND'));
    }
  }

  const service = await Service.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      category,
      price,
      duration,
      images,
      features,
      petTypes,
      maxCapacity,
      isActive,
      updatedBy: req.user.id
    },
    { new: true, runValidators: true }
  );

  if (!service) {
    return next(new AppError('Service not found', 404, 'SERVICE_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Service updated successfully',
    data: { service }
  });
});

/**
 * Delete service (soft delete)
 * @route DELETE /api/services/:id
 * @access Private (Admin)
 */
exports.deleteService = catchAsync(async (req, res, next) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isActive: false, updatedBy: req.user.id },
    { new: true }
  );

  if (!service) {
    return next(new AppError('Service not found', 404, 'SERVICE_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Service deleted successfully',
    data: null
  });
});
