/**
 * Upload Service
 * Helpers for deleting images from Cloudinary by URL or public_id.
 */

const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

/**
 * Extract the Cloudinary public_id from a full Cloudinary URL.
 * Returns null if the URL is not a Cloudinary URL or cannot be parsed.
 */
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex((p) => p === 'upload');
    if (uploadIndex === -1) return null;
    // Skip the optional version segment (e.g. "v1234567890")
    const afterUpload = parts.slice(uploadIndex + 1);
    const start = afterUpload[0]?.match(/^v\d+$/) ? 1 : 0;
    const publicId = afterUpload.slice(start).join('/').replace(/\.[^/.]+$/, '');
    return publicId || null;
  } catch {
    return null;
  }
};

/**
 * Delete a single image from Cloudinary.
 * Accepts either a full Cloudinary URL or a raw public_id.
 * Logs a warning on failure rather than throwing.
 */
const deleteImage = async (urlOrPublicId) => {
  if (!urlOrPublicId) return;
  const publicId = urlOrPublicId.includes('cloudinary.com')
    ? extractPublicId(urlOrPublicId)
    : urlOrPublicId;
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn(`Failed to delete Cloudinary image "${publicId}": ${err.message}`);
  }
};

/**
 * Delete multiple images from Cloudinary in parallel.
 */
const deleteImages = async (urlsOrPublicIds) => {
  if (!Array.isArray(urlsOrPublicIds) || urlsOrPublicIds.length === 0) return;
  await Promise.all(urlsOrPublicIds.map(deleteImage));
};

module.exports = { extractPublicId, deleteImage, deleteImages };
