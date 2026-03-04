/**
 * Category Routes
 * Category management
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

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllCategories);  // GET /api/categories - Get all categories
router.get('/:id', optionalAuth, getCategoryById);  // GET /api/categories/:id - Get category details

// Protected routes - Staff and Admin only
router.use(protect);
router.use(restrictTo('staff', 'admin'));

router.post('/', createCategory);  // POST /api/categories - Create category

router.route('/:id')
  .put(updateCategory)      // PUT /api/categories/:id - Update category
  .delete(restrictTo('admin'), deleteCategory);  // DELETE /api/categories/:id - Delete category (Admin only)

module.exports = router;
