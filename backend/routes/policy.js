/**
 * Policy Routes
 * Policy management
 */

const express = require('express');
const {
  getAllPolicies,
  getPolicyBySlug,
  createPolicy,
  updatePolicy,
  deletePolicy
} = require('../controllers/policyController');

const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllPolicies);  // GET /api/policies - Get all policies
router.get('/:slug', optionalAuth, getPolicyBySlug);  // GET /api/policies/:slug - Get policy by slug

// Admin only routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', createPolicy);  // POST /api/policies - Create policy

router.route('/:id')
  .put(updatePolicy)        // PUT /api/policies/:id - Update policy
  .delete(deletePolicy);    // DELETE /api/policies/:id - Delete policy

module.exports = router;
