/**
 * Camera Controller
 * Handles camera monitoring and live stream access
 */

const cameraService = require('../services/camera.service');
const { catchAsync } = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Enable camera access for a booking
 * POST /api/camera/booking/:bookingId/enable
 */
exports.enableCameraAccess = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  
  const result = await cameraService.enableCameraAccess(bookingId, userId);
  
  res.status(200).json(
    ApiResponse.success(result, 'Camera access enabled successfully')
  );
});

/**
 * Verify camera access and get available cameras
 * GET /api/camera/booking/:bookingId/access
 */
exports.verifyCameraAccess = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const { accessToken } = req.query;
  const userId = req.user._id;
  
  const result = await cameraService.verifyCameraAccess(bookingId, accessToken, userId);
  
  res.status(200).json(
    ApiResponse.success(result, 'Camera access verified')
  );
});

/**
 * Get camera stream URL
 * GET /api/camera/booking/:bookingId/stream/:cameraId
 */
exports.getCameraStream = catchAsync(async (req, res) => {
  const { bookingId, cameraId } = req.params;
  const { accessToken } = req.query;
  const userId = req.user._id;
  
  const result = await cameraService.getCameraStream(bookingId, cameraId, accessToken, userId);
  
  res.status(200).json(
    ApiResponse.success(result, 'Camera stream URL retrieved')
  );
});

/**
 * Get booking snapshots (daily photos)
 * GET /api/camera/booking/:bookingId/snapshots
 */
exports.getBookingSnapshots = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const { accessToken, limit, date } = req.query;
  const userId = req.user._id;
  
  const result = await cameraService.getBookingSnapshots(
    bookingId, 
    accessToken, 
    userId,
    { limit: parseInt(limit) || 20, date }
  );
  
  res.status(200).json(
    ApiResponse.success(result, 'Snapshots retrieved successfully')
  );
});

/**
 * Request on-demand snapshot
 * POST /api/camera/booking/:bookingId/snapshot/:cameraId
 */
exports.requestSnapshot = catchAsync(async (req, res) => {
  const { bookingId, cameraId } = req.params;
  const { accessToken } = req.body;
  const userId = req.user._id;
  
  const result = await cameraService.requestSnapshot(bookingId, cameraId, accessToken, userId);
  
  res.status(200).json(
    ApiResponse.success(result, 'Snapshot requested successfully')
  );
});

/**
 * Update notification settings
 * PATCH /api/camera/booking/:bookingId/notifications
 */
exports.updateNotificationSettings = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const settings = req.body;
  
  const result = await cameraService.updateNotificationSettings(bookingId, userId, settings);
  
  res.status(200).json(
    ApiResponse.success(result, 'Notification settings updated')
  );
});

// ============= ADMIN ROUTES =============

/**
 * Get all cameras for a room
 * GET /api/camera/room/:roomId
 */
exports.getCamerasForRoom = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  
  const cameras = await cameraService.getCamerasForRoom(roomId);
  
  res.status(200).json(
    ApiResponse.success({ cameras }, 'Cameras retrieved successfully')
  );
});

/**
 * Create a new camera
 * POST /api/camera
 */
exports.createCamera = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const cameraData = req.body;
  
  const camera = await cameraService.createCamera(cameraData, userId);
  
  res.status(201).json(
    ApiResponse.success(camera, 'Camera created successfully')
  );
});

/**
 * Update camera
 * PATCH /api/camera/:cameraId
 */
exports.updateCamera = catchAsync(async (req, res) => {
  const { cameraId } = req.params;
  const userId = req.user._id;
  const updateData = req.body;
  
  const camera = await cameraService.updateCamera(cameraId, updateData, userId);
  
  res.status(200).json(
    ApiResponse.success(camera, 'Camera updated successfully')
  );
});

/**
 * Delete camera
 * DELETE /api/camera/:cameraId
 */
exports.deleteCamera = catchAsync(async (req, res) => {
  const { cameraId } = req.params;
  
  await cameraService.deleteCamera(cameraId);
  
  res.status(200).json(
    ApiResponse.success(null, 'Camera deleted successfully')
  );
});

/**
 * Get camera by ID
 * GET /api/camera/:cameraId
 */
exports.getCameraById = catchAsync(async (req, res) => {
  const { cameraId } = req.params;
  
  const Camera = require('../models/Camera');
  const camera = await Camera.findById(cameraId).populate('room');
  
  if (!camera) {
    return res.status(404).json(
      ApiResponse.error('Camera not found', 404)
    );
  }
  
  res.status(200).json(
    ApiResponse.success(camera, 'Camera retrieved successfully')
  );
});

/**
 * Get all cameras (admin)
 * GET /api/camera
 */
exports.getAllCameras = catchAsync(async (req, res) => {
  const Camera = require('../models/Camera');
  const { isActive, isOnline, room } = req.query;
  
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (isOnline !== undefined) filter.isOnline = isOnline === 'true';
  if (room) filter.room = room;
  
  const cameras = await Camera.find(filter)
    .populate('room')
    .sort({ createdAt: -1 });
  
  res.status(200).json(
    ApiResponse.success({ 
      cameras,
      total: cameras.length 
    }, 'Cameras retrieved successfully')
  );
});
