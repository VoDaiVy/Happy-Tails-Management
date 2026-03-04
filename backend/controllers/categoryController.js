/**
 * Category Controller
 * Handles category management operations
 */

const Category = require('../models/Category');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all categories
 * @route GET /api/categories
 * @access Public
 */
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const { isActive = 'true' } = req.query;
  
  const filter = {};
  if (isActive !== 'all') {
    filter.isActive = isActive === 'true';
  }

  const categories = await Category.find(filter)
    .populate('createdBy', 'name email')
    .sort('name');

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

/**
 * Get category by ID
 * @route GET /api/categories/:id
 * @access Public
 */
exports.getCategoryById = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!category) {
    return next(new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

/**
 * Create new category
 * @route POST /api/categories
 * @access Private (Admin, Staff)
 */
exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, description, icon } = req.body;

  const category = await Category.create({
    name,
    description,
    icon,
    createdBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    message: 'Category created successfully',
    data: { category }
  });
});

/**
 * Update category
 * @route PUT /api/categories/:id
 * @access Private (Admin, Staff)
 */
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { name, description, icon, isActive } = req.body;

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, description, icon, isActive, updatedBy: req.user.id },
    { new: true, runValidators: true }
  );

  if (!category) {
    return next(new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Category updated successfully',
    data: { category }
  });
});

/**
 * Delete category (soft delete)
 * @route DELETE /api/categories/:id
 * @access Private (Admin)
 */
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { isActive: false, updatedBy: req.user.id },
    { new: true }
  );

  if (!category) {
    return next(new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Category deleted successfully',
    data: null
  });
});
