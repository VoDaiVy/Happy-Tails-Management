/**
 * Category Routes
 * Category management with Joi validation
 */

const express = require('express');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { handleUpload, categoryImageUpload } = require('../middleware/upload');
const {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema
} = require('../validations/category.validation');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, validateQuery(getCategoriesQuerySchema), getAllCategories);
router.get('/:id', optionalAuth, getCategoryById);

// Protected routes - Admin only
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', handleUpload(categoryImageUpload), validate(createCategorySchema), createCategory);

router.route('/:id')
  .put(handleUpload(categoryImageUpload), validate(updateCategorySchema), updateCategory)
  .delete(deleteCategory);

module.exports = router;
