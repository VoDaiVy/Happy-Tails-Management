/**
 * Service Routes
 * Service management with Joi validation
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
const { validate, validateQuery } = require('../middleware/validate');
const {
  createServiceSchema,
  updateServiceSchema,
  getServicesQuerySchema
} = require('../validations/service.validation');

const router = express.Router();

// Public routes (with optional auth for better experience)
router.get('/', optionalAuth, validateQuery(getServicesQuerySchema), getAllServices);
router.get('/:id', optionalAuth, getServiceById);

// Protected routes - Admin only
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', validate(createServiceSchema), createService);

router.route('/:id')
  .put(validate(updateServiceSchema), updateService)
  .delete(deleteService);

module.exports = router;
