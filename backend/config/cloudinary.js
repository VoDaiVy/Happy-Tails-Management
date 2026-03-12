/**
 * Cloudinary Configuration
 * Initialise the Cloudinary SDK and expose a connection test helper.
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Ping Cloudinary to verify credentials on startup.
 * Failure is logged as a warning rather than crashing the server.
 */
const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    logger.info('Cloudinary connected successfully');
  } catch (err) {
    const msg = err.message || err.error?.message || JSON.stringify(err);
    logger.warn(`Cloudinary connection failed: ${msg}`);
  }
};

module.exports = { cloudinary, testCloudinaryConnection };
