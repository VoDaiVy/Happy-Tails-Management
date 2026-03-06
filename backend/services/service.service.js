/**
 * Service Service
 * Business logic for service operations
 */

const Service = require('../models/Service');
const Category = require('../models/Category');
const { AppError } = require('../utils/AppError');
const { paginate, buildSort } = require('../utils/paginate');
const mongoose = require('mongoose');

/**
 * Create a new service
 * @param {Object} data - Service data
 * @param {string} userId - ID of user creating the service
 * @returns {Promise<Object>} Created service
 * @throws {AppError} 404 if category not found or inactive
 */
const createService = async (data, userId) => {
  // Verify category exists and is active
  const categoryId = data.category || data.categoryId;
  
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new AppError('Invalid category ID format', 400, 'INVALID_CATEGORY_ID');
  }

  const category = await Category.findOne({ _id: categoryId, isActive: true });
  if (!category) {
    throw new AppError('Category not found or is inactive', 404, 'CATEGORY_NOT_FOUND');
  }

  const service = await Service.create({
    ...data,
    category: categoryId,
    createdBy: userId
  });

  // Populate category for response
  await service.populate('category', 'name slug description');

  return service;
};

/**
 * Get all services with filters and pagination
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} { data, pagination }
 */
const getAllServices = async (query = {}) => {
  const {
    search,
    category,
    categoryId,
    minPrice,
    maxPrice,
    petType,
    isActive = 'true',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  // Build filter
  const filter = {};

  if (isActive !== 'all') {
    filter.isActive = isActive === 'true';
  }

  // Category filter (support both 'category' and 'categoryId')
  const catId = category || categoryId;
  if (catId && mongoose.Types.ObjectId.isValid(catId)) {
    filter.category = catId;
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  // Pet type filter
  if (petType) {
    filter.petTypes = petType;
  }

  // Search filter (use text search if available, fallback to regex)
  if (search) {
    // Use MongoDB text search
    filter.$text = { $search: search };
  }

  // Build sort
  const sort = buildSort(sortBy, sortOrder);

  // Paginate with population
  const result = await paginate(Service, filter, {
    page,
    limit,
    sort,
    populate: [
      { path: 'category', select: 'name slug description' },
      { path: 'createdBy', select: 'name email' }
    ]
  });

  return result;
};

/**
 * Get service by ID
 * @param {string} id - Service ID
 * @returns {Promise<Object>} Service document
 * @throws {AppError} 400 if invalid ID format, 404 if not found
 */
const getServiceById = async (id) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid service ID format', 400, 'INVALID_ID');
  }

  const service = await Service.findById(id)
    .populate('category', 'name slug description')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }

  return service;
};

/**
 * Update service by ID
 * @param {string} id - Service ID
 * @param {Object} data - Update data
 * @param {string} userId - ID of user updating
 * @returns {Promise<Object>} Updated service
 * @throws {AppError} 404 if not found or category not found
 */
const updateService = async (id, data, userId) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid service ID format', 400, 'INVALID_ID');
  }

  // Check if service exists
  const existingService = await Service.findById(id);
  if (!existingService) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }

  // Validate new category if provided
  const categoryId = data.category || data.categoryId;
  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError('Invalid category ID format', 400, 'INVALID_CATEGORY_ID');
    }

    const category = await Category.findOne({ _id: categoryId, isActive: true });
    if (!category) {
      throw new AppError('Category not found or is inactive', 404, 'CATEGORY_NOT_FOUND');
    }
    data.category = categoryId;
  }

  // Remove categoryId if present (use category field)
  delete data.categoryId;

  // Update service
  const updatedService = await Service.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  )
    .populate('category', 'name slug description')
    .populate('createdBy', 'name email');

  return updatedService;
};

/**
 * Delete service (soft delete)
 * @param {string} id - Service ID
 * @param {string} userId - ID of user deleting
 * @returns {Promise<Object>} Deleted service
 * @throws {AppError} 404 if not found
 */
const deleteService = async (id, userId) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid service ID format', 400, 'INVALID_ID');
  }

  const service = await Service.findByIdAndUpdate(
    id,
    { isActive: false, updatedBy: userId },
    { new: true }
  );

  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }

  return service;
};

/**
 * Get services by category
 * @param {string} categoryId - Category ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} { data, pagination }
 */
const getServicesByCategory = async (categoryId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new AppError('Invalid category ID format', 400, 'INVALID_ID');
  }

  const filter = {
    category: categoryId,
    isActive: true
  };

  const result = await paginate(Service, filter, {
    ...options,
    populate: { path: 'category', select: 'name slug' }
  });

  return result;
};

/**
 * Update service rating
 * @param {string} id - Service ID
 * @param {number} newRating - New rating value
 * @param {number} reviewCount - New total review count
 * @returns {Promise<Object>} Updated service
 */
const updateServiceRating = async (id, newRating, reviewCount) => {
  const service = await Service.findByIdAndUpdate(
    id,
    { rating: newRating, totalReviews: reviewCount },
    { new: true }
  );

  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }

  return service;
};

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  getServicesByCategory,
  updateServiceRating
};
