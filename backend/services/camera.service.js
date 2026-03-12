/**
 * Camera Service
 * Business logic for camera management and access control
 */

const Camera = require('../models/Camera');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

/**
 * Generate a secure access token for camera viewing
 */
const generateAccessToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Enable camera access for a booking
 */
exports.enableCameraAccess = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId).populate('room');
  
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  
  // Verify ownership
  if (booking.customer.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to access this booking', 403);
  }
  
  // Check if booking has a room assigned
  if (!booking.room) {
    throw new AppError('No room assigned to this booking yet', 400);
  }
  
  // Check if booking is active (not cancelled or completed)
  if (['cancelled', 'completed'].includes(booking.status)) {
    throw new AppError('Camera access is only available for active bookings', 400);
  }
  
  // Get cameras for the assigned room
  const cameras = await Camera.getActiveCamerasForRoom(booking.room._id);
  
  if (cameras.length === 0) {
    throw new AppError('No active cameras available for this room', 404);
  }
  
  // Generate access token and set expiration
  const accessToken = generateAccessToken();
  const expiresAt = booking.bookingDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Booking date or 7 days
  
  // Enable camera access
  booking.cameraAccess = {
    enabled: true,
    accessToken,
    expiresAt,
    cameras: cameras.map(cam => cam._id),
    notificationSettings: booking.cameraAccess?.notificationSettings || {
      photoUpdates: true,
      liveAlerts: true,
      emailNotifications: true
    }
  };
  
  await booking.save();
  
  return {
    accessToken,
    expiresAt,
    cameras: cameras.map(cam => ({
      id: cam._id,
      name: cam.cameraName,
      position: cam.position,
      resolution: cam.resolution,
      features: cam.features
    }))
  };
};

/**
 * Verify camera access token and return camera details
 */
exports.verifyCameraAccess = async (bookingId, accessToken, userId) => {
  const booking = await Booking.findById(bookingId)
    .populate('room')
    .populate({
      path: 'cameraAccess.cameras',
      match: { isActive: true, isOnline: true }
    })
    .populate('items.pet');
  
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  
  // Verify ownership
  if (booking.customer.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to access this booking', 403);
  }
  
  // Check if camera access is enabled
  if (!booking.cameraAccess?.enabled) {
    throw new AppError('Camera access is not enabled for this booking', 403);
  }
  
  // Verify access token
  if (booking.cameraAccess.accessToken !== accessToken) {
    throw new AppError('Invalid access token', 403);
  }
  
  // Check if access has expired
  if (new Date() > new Date(booking.cameraAccess.expiresAt)) {
    throw new AppError('Camera access has expired', 403);
  }
  
  // Update last accessed time and increment count
  booking.cameraAccess.lastAccessedAt = new Date();
  booking.cameraAccess.accessCount += 1;
  await booking.save();
  
  return {
    booking: {
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      room: booking.room,
      pets: booking.items.map(item => item.pet),
      status: booking.status
    },
    cameras: booking.cameraAccess.cameras.filter(cam => cam), // Filter out null/undefined
    accessExpiresAt: booking.cameraAccess.expiresAt,
    notificationSettings: booking.cameraAccess.notificationSettings
  };
};

/**
 * Get camera stream URL for a specific camera
 */
exports.getCameraStream = async (bookingId, cameraId, accessToken, userId) => {
  // Verify access first
  const accessData = await exports.verifyCameraAccess(bookingId, accessToken, userId);
  
  // Check if the camera is in the allowed list
  const camera = accessData.cameras.find(cam => cam._id.toString() === cameraId);
  
  if (!camera) {
    throw new AppError('Camera not found or not accessible', 404);
  }
  
  // Return stream URL with temporary token (for security)
  const streamToken = crypto.randomBytes(16).toString('hex');
  const streamExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return {
    camera: {
      id: camera._id,
      name: camera.cameraName,
      position: camera.position,
      resolution: camera.resolution,
      features: camera.features
    },
    streamUrl: `${camera.streamUrl}?token=${streamToken}&expires=${streamExpiry}`,
    streamType: camera.cameraType,
    expiresAt: new Date(streamExpiry)
  };
};

/**
 * Get snapshots for a booking (daily photos)
 */
exports.getBookingSnapshots = async (bookingId, accessToken, userId, options = {}) => {
  // Verify access
  await exports.verifyCameraAccess(bookingId, accessToken, userId);
  
  const { limit = 20, date } = options;
  
  // In a real implementation, you would fetch from a photo storage service
  // For now, return mock data structure
  return {
    bookingId,
    snapshots: [] // TODO: Integrate with image storage service (S3, Cloudinary, etc.)
  };
};

/**
 * Request on-demand snapshot
 */
exports.requestSnapshot = async (bookingId, cameraId, accessToken, userId) => {
  // Verify access
  await exports.verifyCameraAccess(bookingId, accessToken, userId);
  
  const camera = await Camera.findOne({ _id: cameraId, isActive: true, isOnline: true });
  
  if (!camera) {
    throw new AppError('Camera not found or offline', 404);
  }
  
  // TODO: Trigger camera to capture and save snapshot
  // This would integrate with camera API or streaming service
  
  return {
    message: 'Snapshot requested successfully',
    cameraId,
    estimatedTime: '5-10 seconds'
  };
};

/**
 * Update notification settings
 */
exports.updateNotificationSettings = async (bookingId, userId, settings) => {
  const booking = await Booking.findById(bookingId);
  
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  
  if (booking.customer.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to modify this booking', 403);
  }
  
  if (!booking.cameraAccess?.enabled) {
    throw new AppError('Camera access is not enabled for this booking', 400);
  }
  
  booking.cameraAccess.notificationSettings = {
    ...booking.cameraAccess.notificationSettings,
    ...settings
  };
  
  await booking.save();
  
  return booking.cameraAccess.notificationSettings;
};

/**
 * Get all cameras for a room (admin only)
 */
exports.getCamerasForRoom = async (roomId) => {
  const room = await Room.findById(roomId);
  
  if (!room) {
    throw new AppError('Room not found', 404);
  }
  
  const cameras = await Camera.find({ room: roomId }).sort({ position: 1 });
  
  return cameras;
};

/**
 * Create a new camera (admin only)
 */
exports.createCamera = async (cameraData, userId) => {
  const camera = await Camera.create({
    ...cameraData,
    createdBy: userId
  });
  
  return camera;
};

/**
 * Update camera (admin only)
 */
exports.updateCamera = async (cameraId, updateData, userId) => {
  const camera = await Camera.findByIdAndUpdate(
    cameraId,
    { ...updateData, updatedBy: userId },
    { new: true, runValidators: true }
  );
  
  if (!camera) {
    throw new AppError('Camera not found', 404);
  }
  
  return camera;
};

/**
 * Delete camera (admin only)
 */
exports.deleteCamera = async (cameraId) => {
  const camera = await Camera.findByIdAndDelete(cameraId);
  
  if (!camera) {
    throw new AppError('Camera not found', 404);
  }
  
  return camera;
};
