/**
 * Category Controller
 * Handles category management operations
 */

const categoryService = require('../services/category.service');
const { catchAsync } = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get all categories
 * @route GET /api/categories
 * @access Public
 */
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const query = req.validatedQuery || req.query;
  
  const { data, pagination } = await categoryService.getAllCategories(query);

  res.status(200).json(ApiResponse.success(
    'Categories fetched successfully',
    data,
    pagination
  ));
});

/**
 * Get category by ID
 * @route GET /api/categories/:id
 * @access Public
 */
exports.getCategoryById = catchAsync(async (req, res, next) => {
  const category = await categoryService.getCategoryById(req.params.id);

  res.status(200).json(ApiResponse.success(
    'Category fetched successfully',
    category
  ));
});

/**
 * Create new category
 * @route POST /api/categories
 * @access Private (Admin, Staff)
 */
exports.createCategory = catchAsync(async (req, res, next) => {
  const category = await categoryService.createCategory(req.body, req.user.id);

  res.status(201).json(ApiResponse.success(
    'Category created successfully',
    category
  ));
});

/**
 * Update category
 * @route PUT /api/categories/:id
 * @access Private (Admin, Staff)
 */
exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await categoryService.updateCategory(
    req.params.id,
    req.body,
    req.user.id
  );

  res.status(200).json(ApiResponse.success(
    'Category updated successfully',
    category
  ));
});

/**
 * Delete category (soft delete)
 * @route DELETE /api/categories/:id
 * @access Private (Admin)
 */
exports.deleteCategory = catchAsync(async (req, res, next) => {
  await categoryService.deleteCategory(req.params.id, req.user.id);

  res.status(200).json(ApiResponse.success(
    'Category deleted successfully',
    null
  ));
});
