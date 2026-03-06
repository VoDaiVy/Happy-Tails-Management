/**
 * Category Service
 * Business logic for category operations
 */

const Category = require('../models/Category');
const { AppError } = require('../utils/AppError');
const { paginate, buildSort } = require('../utils/paginate');
const mongoose = require('mongoose');

/**
 * Create a new category
 * @param {Object} data - Category data
 * @param {string} userId - ID of user creating the category
 * @returns {Promise<Object>} Created category
 * @throws {AppError} 409 if category name already exists
 */
const createCategory = async (data, userId) => {
  // Check for duplicate name
  const existingCategory = await Category.findOne({ 
    name: { $regex: new RegExp(`^${data.name}$`, 'i') }
  });
  
  if (existingCategory) {
    throw new AppError(`Category '${data.name}' already exists`, 409, 'DUPLICATE_CATEGORY');
  }

  const category = await Category.create({
    ...data,
    createdBy: userId
  });

  return category;
};

/**
 * Get all categories with filters and pagination
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} { data, pagination }
 */
const getAllCategories = async (query = {}) => {
  const {
    search,
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

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  // Build sort
  const sort = buildSort(sortBy, sortOrder);

  // Paginate
  const result = await paginate(Category, filter, {
    page,
    limit,
    sort,
    populate: { path: 'createdBy', select: 'name email' }
  });

  return result;
};

/**
 * Get category by ID
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Category document
 * @throws {AppError} 400 if invalid ID format, 404 if not found
 */
const getCategoryById = async (id) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid category ID format', 400, 'INVALID_ID');
  }

  const category = await Category.findById(id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  return category;
};

/**
 * Update category by ID
 * @param {string} id - Category ID
 * @param {Object} data - Update data
 * @param {string} userId - ID of user updating
 * @returns {Promise<Object>} Updated category
 * @throws {AppError} 404 if not found, 409 if new name conflicts
 */
const updateCategory = async (id, data, userId) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid category ID format', 400, 'INVALID_ID');
  }

  // Check if category exists
  const existingCategory = await Category.findById(id);
  if (!existingCategory) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  // Check for duplicate name (if name is being updated)
  if (data.name && data.name.toLowerCase() !== existingCategory.name.toLowerCase()) {
    const duplicateName = await Category.findOne({
      name: { $regex: new RegExp(`^${data.name}$`, 'i') },
      _id: { $ne: id }
    });

    if (duplicateName) {
      throw new AppError(`Category '${data.name}' already exists`, 409, 'DUPLICATE_CATEGORY');
    }
  }

  // Update category
  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');

  return updatedCategory;
};

/**
 * Delete category (soft delete)
 * @param {string} id - Category ID
 * @param {string} userId - ID of user deleting
 * @returns {Promise<Object>} Deleted category
 * @throws {AppError} 404 if not found
 */
const deleteCategory = async (id, userId) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid category ID format', 400, 'INVALID_ID');
  }

  const category = await Category.findByIdAndUpdate(
    id,
    { isActive: false, updatedBy: userId },
    { new: true }
  );

  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  return category;
};

/**
 * Check if category exists and is active
 * @param {string} id - Category ID
 * @returns {Promise<boolean>}
 */
const categoryExistsAndActive = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }

  const category = await Category.findOne({ _id: id, isActive: true });
  return !!category;
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  categoryExistsAndActive
};
