/**
 * Group Capacity Configuration Routes
 * Admin management of service group capacity limits (wet/dry)
 */

const express = require('express');
const {
  getAllGroupCapacities,
  getGroupCapacity,
  createGroupCapacity,
  updateGroupCapacity,
  deleteGroupCapacity,
  initializeDefaultConfigs
} = require('../controllers/groupCapacityController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

/**
 * @route GET /api/admin/group-capacity
 * @access Private (Admin)
 * @description Get all group capacity configurations
 */
router.get('/', getAllGroupCapacities);

/**
 * @route POST /api/admin/group-capacity/init
 * @access Private (Admin)
 * @description Initialize default wet/dry group capacity configs (6 each)
 */
router.post('/init', initializeDefaultConfigs);

/**
 * @route GET /api/admin/group-capacity/:group
 * @access Private (Admin)
 * @description Get capacity config for specific group (wet/dry)
 */
router.get('/:group', getGroupCapacity);

/**
 * @route POST /api/admin/group-capacity
 * @access Private (Admin)
 * @description Create new group capacity configuration
 * @body {string} group - 'wet' or 'dry'
 * @body {number} maxCapacity - Max concurrent capacity (default: 6)
 * @body {number} roomCount - Number of rooms in group (default: 2)
 * @body {number} slotsPerRoom - Slots per room (default: 3)
 * @body {string} description - Optional description
 */
router.post('/', createGroupCapacity);

/**
 * @route PUT /api/admin/group-capacity/:group
 * @access Private (Admin)
 * @description Update group capacity configuration
 * @body {number} maxCapacity - Max concurrent capacity
 * @body {number} roomCount - Number of rooms
 * @body {number} slotsPerRoom - Slots per room
 * @body {string} description - Description
 * @body {boolean} isActive - Whether config is active
 */
router.put('/:group', updateGroupCapacity);

/**
 * @route DELETE /api/admin/group-capacity/:group
 * @access Private (Admin)
 * @description Soft delete group capacity configuration
 */
router.delete('/:group', deleteGroupCapacity);

module.exports = router;
