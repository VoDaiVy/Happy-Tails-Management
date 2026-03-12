/**
 * Upload Controller
 * Generic image upload endpoints (single and multiple).
 */

const { catchAsync } = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { createError } = require('../utils/AppError');

/**
 * Upload a single image
 * @route   POST /api/uploads/image
 * @access  Private
 */
exports.uploadSingleImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(createError.badRequest('No image file provided', 'NO_FILE'));
  }

  res.status(200).json(
    ApiResponse.success('Image uploaded successfully', {
      url: req.file.path,
      publicId: req.file.filename,
    })
  );
});

/**
 * Upload multiple images
 * @route   POST /api/uploads/images
 * @access  Private
 */
exports.uploadMultipleImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(createError.badRequest('No image files provided', 'NO_FILES'));
  }

  const files = req.files.map((f) => ({ url: f.path, publicId: f.filename }));

  res.status(200).json(
    ApiResponse.success('Images uploaded successfully', { files, count: files.length })
  );
});
