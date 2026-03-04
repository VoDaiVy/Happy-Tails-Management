/**
 * Service Routes
 * Service management and browsing
 */

const express = require('express');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');

const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (with optional auth for better experience)
router.get('/', optionalAuth, getAllServices);  // GET /api/services - Get all services
router.get('/:id', optionalAuth, getServiceById);  // GET /api/services/:id - Get service details

// Protected routes - Staff and Admin only
router.use(protect);
router.use(restrictTo('staff', 'admin'));

router.post('/', createService);  // POST /api/services - Create service

router.route('/:id')
  .put(updateService)       // PUT /api/services/:id - Update service
  .delete(restrictTo('admin'), deleteService);  // DELETE /api/services/:id - Delete service (Admin only)

module.exports = router;
