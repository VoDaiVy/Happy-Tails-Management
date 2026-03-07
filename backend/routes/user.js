/**
 * User Routes
 * Staff-facing walk-in guest management
 */

const express = require('express');
const { quickRegister } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All user management routes require authentication
router.use(protect);

// Staff / Admin can quickly register a walk-in guest on the spot
router.post('/staff/quick-register', restrictTo('staff', 'admin'), quickRegister);

module.exports = router;
