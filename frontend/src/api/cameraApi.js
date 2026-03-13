/**
 * Camera API
 * Frontend API calls for camera monitoring functionality
 */

import axiosInstance from './axiosInstance';

/**
 * Enable camera access for a booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise} API response
 */
export const enableCameraAccess = async (bookingId) => {
  try {
    const response = await axiosInstance.post(`/camera/booking/${bookingId}/enable`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Verify camera access and get available cameras
 * @param {string} bookingId - Booking ID
 * @param {string} accessToken - Access token
 * @returns {Promise} API response with cameras list
 */
export const verifyCameraAccess = async (bookingId, accessToken) => {
  try {
    const response = await axiosInstance.get(
      `/camera/booking/${bookingId}/access`,
      { params: { accessToken } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get camera stream URL
 * @param {string} bookingId - Booking ID
 * @param {string} cameraId - Camera ID
 * @param {string} accessToken - Access token
 * @returns {Promise} API response with stream URL
 */
export const getCameraStream = async (bookingId, cameraId, accessToken) => {
  try {
    const response = await axiosInstance.get(
      `/camera/booking/${bookingId}/stream/${cameraId}`,
      { params: { accessToken } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get booking snapshots (daily photos)
 * @param {string} bookingId - Booking ID
 * @param {string} accessToken - Access token
 * @param {object} options - Optional params (limit, date)
 * @returns {Promise} API response with snapshots
 */
export const getBookingSnapshots = async (bookingId, accessToken, options = {}) => {
  try {
    const params = { accessToken, ...options };
    const response = await axiosInstance.get(
      `/camera/booking/${bookingId}/snapshots`,
      { params }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Request on-demand snapshot
 * @param {string} bookingId - Booking ID
 * @param {string} cameraId - Camera ID
 * @param {string} accessToken - Access token
 * @returns {Promise} API response
 */
export const requestSnapshot = async (bookingId, cameraId, accessToken) => {
  try {
    const response = await axiosInstance.post(
      `/camera/booking/${bookingId}/snapshot/${cameraId}`,
      { accessToken }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update notification settings
 * @param {string} bookingId - Booking ID
 * @param {object} settings - Notification settings
 * @returns {Promise} API response
 */
export const updateNotificationSettings = async (bookingId, settings) => {
  try {
    const response = await axiosInstance.patch(
      `/camera/booking/${bookingId}/notifications`,
      settings
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============= ADMIN API CALLS =============

/**
 * Get all cameras (admin)
 * @param {object} filters - Filter options
 * @returns {Promise} API response with cameras list
 */
export const getAllCameras = async (filters = {}) => {
  try {
    const response = await axiosInstance.get('/camera', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get cameras for a specific room (admin)
 * @param {string} roomId - Room ID
 * @returns {Promise} API response with cameras list
 */
export const getCamerasForRoom = async (roomId) => {
  try {
    const response = await axiosInstance.get(`/camera/room/${roomId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get camera by ID (admin)
 * @param {string} cameraId - Camera ID
 * @returns {Promise} API response with camera details
 */
export const getCameraById = async (cameraId) => {
  try {
    const response = await axiosInstance.get(`/camera/${cameraId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Create a new camera (admin)
 * @param {object} cameraData - Camera data
 * @returns {Promise} API response
 */
export const createCamera = async (cameraData) => {
  try {
    const response = await axiosInstance.post('/camera', cameraData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update camera (admin)
 * @param {string} cameraId - Camera ID
 * @param {object} updateData - Update data
 * @returns {Promise} API response
 */
export const updateCamera = async (cameraId, updateData) => {
  try {
    const response = await axiosInstance.patch(`/camera/${cameraId}`, updateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Delete camera (admin)
 * @param {string} cameraId - Camera ID
 * @returns {Promise} API response
 */
export const deleteCamera = async (cameraId) => {
  try {
    const response = await axiosInstance.delete(`/camera/${cameraId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default {
  enableCameraAccess,
  verifyCameraAccess,
  getCameraStream,
  getBookingSnapshots,
  requestSnapshot,
  updateNotificationSettings,
  getAllCameras,
  getCamerasForRoom,
  getCameraById,
  createCamera,
  updateCamera,
  deleteCamera
};
