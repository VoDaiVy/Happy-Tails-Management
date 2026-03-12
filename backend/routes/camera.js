/**
 * Camera Routes
 * Routes for camera monitoring and live streaming
 */

const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const cameraValidation = require('../validations/camera.validation');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');

// ============= CUSTOMER ROUTES (require authentication) =============

// POST /api/camera/booking/:bookingId/enable — no body validation needed
router.post('/booking/:bookingId/enable', protect, cameraController.enableCameraAccess);

// GET /api/camera/booking/:bookingId/access — validate accessToken query param
router.get('/booking/:bookingId/access', protect, validateQuery(cameraValidation.verifyCameraAccess), cameraController.verifyCameraAccess);

// GET /api/camera/booking/:bookingId/stream/:cameraId — validate accessToken query param
router.get('/booking/:bookingId/stream/:cameraId', protect, validateQuery(cameraValidation.getCameraStream), cameraController.getCameraStream);

// GET /api/camera/booking/:bookingId/snapshots — validate query params
router.get('/booking/:bookingId/snapshots', protect, validateQuery(cameraValidation.getSnapshots), cameraController.getBookingSnapshots);

// POST /api/camera/booking/:bookingId/snapshot/:cameraId — validate body
router.post('/booking/:bookingId/snapshot/:cameraId', protect, validate(cameraValidation.requestSnapshot), cameraController.requestSnapshot);

// PATCH /api/camera/booking/:bookingId/notifications — validate body
router.patch('/booking/:bookingId/notifications', protect, validate(cameraValidation.updateNotifications), cameraController.updateNotificationSettings);

// ============= ADMIN / STAFF ROUTES =============

// GET /api/camera — no body/query validation needed
router.get('/', protect, restrictTo('admin', 'staff'), cameraController.getAllCameras);

// POST /api/camera — validate body
router.post('/', protect, restrictTo('admin'), validate(cameraValidation.createCamera), cameraController.createCamera);

// GET /api/camera/room/:roomId — no validation needed
router.get('/room/:roomId', protect, restrictTo('admin', 'staff'), cameraController.getCamerasForRoom);

// GET /api/camera/:cameraId — no validation needed
router.get('/:cameraId', protect, restrictTo('admin', 'staff'), cameraController.getCameraById);

// PATCH /api/camera/:cameraId — validate body
router.patch('/:cameraId', protect, restrictTo('admin'), validate(cameraValidation.updateCamera), cameraController.updateCamera);

// DELETE /api/camera/:cameraId — no validation needed
router.delete('/:cameraId', protect, restrictTo('admin'), cameraController.deleteCamera);

module.exports = router;
