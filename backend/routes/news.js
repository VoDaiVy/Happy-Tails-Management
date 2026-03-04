/**
 * News Routes
 * News/blog management
 */

const express = require('express');
const {
  getAllNews,
  getNewsBySlug,
  createNews,
  updateNews,
  deleteNews
} = require('../controllers/newsController');

const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllNews);  // GET /api/news - Get all news
router.get('/:slug', optionalAuth, getNewsBySlug);  // GET /api/news/:slug - Get news by slug

// Staff and Admin routes
router.use(protect);
router.use(restrictTo('staff', 'admin'));

router.post('/', createNews);  // POST /api/news - Create news

router.route('/:id')
  .put(updateNews)          // PUT /api/news/:id - Update news
  .delete(restrictTo('admin'), deleteNews);  // DELETE /api/news/:id - Delete news (Admin only)

module.exports = router;
