/**
 * Upload Routes
 * Generic endpoints for uploading images directly to Cloudinary.
 *
 * POST /api/uploads/image   — single image (field: "image")
 * POST /api/uploads/images  — multiple images, up to 10 (field: "images")
 */

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { handleUpload, categoryImageUpload, serviceImageUpload } = require('../middleware/upload');
const { uploadSingleImage, uploadMultipleImages } = require('../controllers/uploadController');

router.post('/image', protect, handleUpload(categoryImageUpload), uploadSingleImage);
router.post('/images', protect, handleUpload(serviceImageUpload), uploadMultipleImages);

module.exports = router;
