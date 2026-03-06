/**
 * Service Controller
 * Handles service management operations
 */

const serviceService = require('../services/service.service');
const { catchAsync } = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get all services (with filters)
 * @route GET /api/services
 * @access Public
 */
exports.getAllServices = catchAsync(async (req, res, next) => {
  const query = req.validatedQuery || req.query;

  const { data, pagination } = await serviceService.getAllServices(query);

  res.status(200).json(ApiResponse.success(
    'Services fetched successfully',
    data,
    pagination
  ));
});

/**
 * Get service by ID
 * @route GET /api/services/:id
 * @access Public
 */
exports.getServiceById = catchAsync(async (req, res, next) => {
  const service = await serviceService.getServiceById(req.params.id);

  res.status(200).json(ApiResponse.success(
    'Service fetched successfully',
    service
  ));
});

/**
 * Create new service
 * @route POST /api/services
 * @access Private (Admin, Staff)
 */
exports.createService = catchAsync(async (req, res, next) => {
  const service = await serviceService.createService(req.body, req.user.id);

  res.status(201).json(ApiResponse.success(
    'Service created successfully',
    service
  ));
});

/**
 * Update service
 * @route PUT /api/services/:id
 * @access Private (Admin, Staff)
 */
exports.updateService = catchAsync(async (req, res, next) => {
  const service = await serviceService.updateService(
    req.params.id,
    req.body,
    req.user.id
  );

  res.status(200).json(ApiResponse.success(
    'Service updated successfully',
    service
  ));
});

/**
 * Delete service (soft delete)
 * @route DELETE /api/services/:id
 * @access Private (Admin)
 */
exports.deleteService = catchAsync(async (req, res, next) => {
  await serviceService.deleteService(req.params.id, req.user.id);

  res.status(200).json(ApiResponse.success(
    'Service deleted successfully',
    null
  ));
});
