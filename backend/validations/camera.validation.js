/**
 * Camera Validation Schemas
 * Joi validation for camera-related API requests
 */

const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Schema for creating a camera
 */
exports.createCamera = Joi.object({
  room: Joi.string().pattern(objectIdPattern).required()
    .messages({ 'any.required': 'Room is required', 'string.pattern.base': 'Invalid room ID' }),
  cameraName: Joi.string().min(3).max(100).required()
    .messages({ 'any.required': 'Camera name is required' }),
  cameraNumber: Joi.string().min(1).max(50).required()
    .messages({ 'any.required': 'Camera number is required' }),
  streamUrl: Joi.string().uri().required()
    .messages({ 'any.required': 'Stream URL is required', 'string.uri': 'Invalid stream URL' }),
  rtspUrl: Joi.string().uri().optional().allow(''),
  cameraType: Joi.string().valid('live', 'recorded', 'both').optional(),
  position: Joi.string().valid('main', 'side', 'outdoor', 'corner').optional(),
  resolution: Joi.string().valid('720p', '1080p', '4k').optional(),
  recordingEnabled: Joi.boolean().optional(),
  recordingRetentionDays: Joi.number().integer().min(1).max(30).optional()
});

/**
 * Schema for updating a camera
 */
exports.updateCamera = Joi.object({
  cameraName: Joi.string().min(3).max(100).optional(),
  streamUrl: Joi.string().uri().optional().allow(''),
  rtspUrl: Joi.string().uri().optional().allow(''),
  isActive: Joi.boolean().optional(),
  isOnline: Joi.boolean().optional(),
  cameraType: Joi.string().valid('live', 'recorded', 'both').optional(),
  position: Joi.string().valid('main', 'side', 'outdoor', 'corner').optional(),
  resolution: Joi.string().valid('720p', '1080p', '4k').optional(),
  recordingEnabled: Joi.boolean().optional(),
  recordingRetentionDays: Joi.number().integer().min(1).max(30).optional()
});

// No body/query validation needed for GET by ID (param checked by Mongoose)
exports.getCameraById = null;

/**
 * Validation for getting cameras by room
 */
exports.getCamerasForRoom = null; // param checked by Mongoose

// No body validation needed for enable (param checked by Mongoose)
exports.enableCameraAccess = null;

/**
 * Query schema for verifying camera access
 */
exports.verifyCameraAccess = Joi.object({
  accessToken: Joi.string().min(32).max(128).required()
    .messages({ 'any.required': 'Access token is required' })
}).unknown(true);

/**
 * Query schema for getting camera stream
 */
exports.getCameraStream = Joi.object({
  accessToken: Joi.string().required()
    .messages({ 'any.required': 'Access token is required' })
}).unknown(true);

/**
 * Query schema for getting snapshots
 */
exports.getSnapshots = Joi.object({
  accessToken: Joi.string().required()
    .messages({ 'any.required': 'Access token is required' }),
  limit: Joi.number().integer().min(1).max(100).optional(),
  date: Joi.date().iso().optional()
}).unknown(true);

/**
 * Body schema for requesting a snapshot
 */
exports.requestSnapshot = Joi.object({
  accessToken: Joi.string().required()
    .messages({ 'any.required': 'Access token is required' })
});

/**
 * Body schema for updating notification settings
 */
exports.updateNotifications = Joi.object({
  photoUpdates:       Joi.boolean().optional(),
  liveAlerts:         Joi.boolean().optional(),
  emailNotifications: Joi.boolean().optional()
});
