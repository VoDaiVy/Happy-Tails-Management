/**
 * Upload Middleware
 * Multer + CloudinaryStorage instances for services, categories, and avatars.
 * Use handleUpload(uploader) to wrap an uploader and forward errors to Express.
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { createError } = require('../utils/AppError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const createStorage = (folder) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `happy-tails/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      createError.badRequest(
        'Invalid file type. Allowed types: jpg, jpeg, png, webp, gif',
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

const defaultOptions = { fileFilter, limits: { fileSize: MAX_FILE_SIZE } };

/** Uploader for service images — accepts up to 10 files in field "images" */
const serviceImageUpload = multer({
  ...defaultOptions,
  storage: createStorage('services'),
}).array('images', 10);

/** Uploader for category images — single file in field "image" */
const categoryImageUpload = multer({
  ...defaultOptions,
  storage: createStorage('categories'),
}).single('image');

/** Uploader for user avatars — single file in field "avatar" */
const avatarUpload = multer({
  ...defaultOptions,
  storage: createStorage('avatars'),
}).single('avatar');

/**
 * Wrap a multer uploader so that its errors are forwarded through next().
 * @param {Function} uploader - multer uploader (single/array)
 * @returns {Function} Express middleware
 */
const handleUpload = (uploader) => (req, res, next) => {
  // Guard: fail fast if Cloudinary is not configured
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return next(
      createError.internal(
        'Image upload service is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env',
        'CLOUDINARY_NOT_CONFIGURED'
      )
    );
  }

  uploader(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        createError.badRequest(
          `File too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          'FILE_TOO_LARGE'
        )
      );
    }
    // Cloudinary authentication / configuration errors
    if (err.http_code === 401 || (err.message && err.message.includes('Must supply api_key'))) {
      return next(
        createError.internal('Invalid Cloudinary credentials. Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.', 'CLOUDINARY_AUTH_ERROR')
      );
    }
    return next(err);
  });
};

module.exports = {
  serviceImageUpload,
  categoryImageUpload,
  avatarUpload,
  handleUpload,
};
